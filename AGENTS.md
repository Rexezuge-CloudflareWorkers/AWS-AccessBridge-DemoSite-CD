# AGENTS.md

This file provides guidance to LLM agents when working with code in this repository.

## Project Overview

AWS AccessBridge is a Cloudflare Worker that provides a web-based AWS role assumption bridge. It lets users assume AWS roles across multiple accounts and generate temporary AWS Console URLs. Authentication is handled by Cloudflare Zero Trust.

**Stack:** Hono + Chanfana (OpenAPI) backend on Cloudflare Workers, Durable Objects for cron task execution, React 19 + Tailwind CSS v4 frontend (Vite SPA), Cloudflare D1 database (26 migrations), Cloudflare KV for credential caching, Cloudflare Secrets Store for encryption keys and internal HMAC secret.

## Commands

```bash
# Install
pnpm install              # Installs all workspace dependencies

# Development
pnpm dev                 # Vite dev server for frontend SPA
pnpm --filter @aws-access-bridge/api dev   # Run API worker locally (uses wrangler dev)

# Build
pnpm build               # Build all packages (web then api)
pnpm --filter @aws-access-bridge/web build # Build frontend only

# Deploy
pnpm deploy              # build + `wrangler deploy --dry-run` + `wrangler deploy`

# Code Quality
pnpm prettier            # Format all code
pnpm lint                # Lint + autofix TypeScript
pnpm typecheck           # Type-check all packages
pnpm test                # Run vitest tests

# Cloudflare
pnpm exec wrangler dev   # Local Cloudflare dev server
pnpm exec wrangler deploy --dry-run  # Dry-run deploy

# Database
pnpm exec wrangler d1 migrations apply --remote aws-access-bridge-db    # Apply migrations to remote D1
pnpm exec wrangler d1 migrations apply --local aws-access-bridge-db     # Apply migrations locally
```

## Mono-repo Structure

```
aws-access-bridge/
├── apps/
│   ├── web/                    # React SPA (Vite)
│   │   ├── src/
│   │   │   ├── SpaApp.tsx      # SPA entry point
│   │   │   ├── main.tsx
│   │   │   └── components/    # React components
│   │   ├── dist/               # Build output
│   │   └── package.json
│   └── api/                    # Cloudflare Worker (backend)
│       ├── src/
│       │   ├── index.ts        # Worker entry point
│       │   ├── workers/         # AccessBridgeWorker, CronTasksWorker
│       │   ├── endpoints/       # API route handlers
│       │   ├── dao/             # Data access objects
│       │   ├── model/           # Internal models
│       │   ├── middleware/      # HMAC, auth, audit
│       │   ├── scheduled/       # Cron task handlers
│       │   ├── schema/          # Zod schemas (re-exports from shared)
│       │   └── generated/      # SPA shell (auto-generated at build)
│       └── package.json
├── packages/
│   └── shared/                 # Shared types, schemas, utilities
│       ├── src/
│       │   ├── schema/         # Zod input/output/common schemas
│       │   ├── types.ts
│       │   └── utils.ts
│       └── package.json
├── migrations/                  # D1 migrations
├── test/                       # Vitest tests
└── scripts/                    # Build/deploy scripts
```

## Architecture

### Entry point and request flow

`apps/api/src/index.ts` instantiates `AccessBridgeWorker` (`apps/api/src/workers/AccessBridgeWorker.ts`) which extends `AbstractWorker` (`apps/api/src/base/`). AbstractWorker handles both `fetch` (HTTP) and `scheduled` (cron) events. The `/__scheduled` path triggers the scheduled handler via HTTP for testing. Cron execution is delegated to the singleton `CronTasksWorker` Durable Object via the `CRON_TASKS` binding, so the AccessBridge worker only performs the trigger handoff.

The frontend SPA is built to `apps/web/dist/` by Vite. The HTML shell is embedded into the Worker bundle at build time via a custom Vite plugin that emits `apps/api/src/generated/spa-shell.ts` (`SPA_HTML`). A catch-all `app.get('*')` handler serves this HTML for any non-API, non-docs, non-asset path, giving the SPA robust deep-linking support without relying on the `ASSETS` binding for HTML routing. Static assets from `apps/web/dist/` are served by Cloudflare's asset binding. A `postinstall` script writes a placeholder stub so type-checks pass before the first build.

### Endpoint pattern

Every API endpoint is a standalone file under `apps/api/src/endpoints/api/{domain}/{resource}/{METHOD}.ts`. Each extends one of two abstract base classes:

- **`IActivityAPIRoute`** (`apps/api/src/endpoints/IActivityAPIRoute.ts`) — Authenticates the user (via Cloudflare Zero Trust JWT or Bearer PAT), parses the request body, writes an audit log entry via `waitUntil()`, and delegates to `handleRequest()`. All endpoints inherit from this.
- **`IAdminActivityAPIRoute`** (`apps/api/src/endpoints/IAdminActivityAPIRoute.ts`) — Extends `IActivityAPIRoute`, adds a superadmin check and a demo-mode guard (throws `MethodNotAllowedError` when `DEMO_MODE=true`) before delegating to `handleAdminRequest()`.

Endpoints are re-exported through `apps/api/src/endpoints/index.ts` (cast to `any` for Chanfana compatibility) and registered as Hono routes in `AccessBridgeWorker`.

### API endpoints (48 total routes registered)

Counts reflect routes registered in `AccessBridgeWorker` — note several admin-adjacent operations (cost alerts, data collection config, teams, maintenance) live under the `/api/admin/*` prefix.

**Root (1):** `/federate` (wrapper that proxies to `/api/aws/federate`)
**AWS Operations (3):** `POST /api/aws/assume-role`, `POST /api/aws/console`, `GET /api/aws/federate`
**User Operations (10):** assumables list/search, me, favorites (POST/DELETE), hidden roles (POST/DELETE), access tokens (POST/DELETE/GET)
**Admin — Credentials & Access (7):** credentials POST, credentials/relationship (POST/DELETE), credentials/validate POST, credentials/test-chain POST, access grant/revoke (POST/DELETE)
**Admin — Account & Role Config (5):** account/nickname (PUT/DELETE), role/config (PUT/DELETE), account/roles POST (IAM role discovery)
**Admin — Audit (1):** `GET /api/admin/audit-logs`
**Admin — Cost & Data Collection (4):** cost/alerts (POST/DELETE), collection/config (POST/DELETE)
**Admin — Teams (11):** team CRUD, team name PUT, team member add/remove/list, team member role PUT, team account add/remove/list
**Admin — Maintenance (1):** `POST /api/admin/maintenance/cleanup-orphaned` (admin-triggered orphan purge across satellite tables)
**Cost Operations (3):** summary, account detail, trends (all GET)
**Resource Operations (2):** resources list (with filters), resources summary

### Internal service-to-service calls

The worker calls itself via the `SELF` service binding. These internal requests are signed with HMAC-SHA256 using the `INTERNAL_HMAC_SECRET` secret (`apps/api/src/utils/helpers/InternalRequestHelper.ts`, `apps/api/src/middleware/HMACHandler.ts`). Requests with `X-Internal-*` headers or originating from the self-worker hostname are validated by the HMAC middleware; external requests pass through without HMAC checks.

### Credential chain and caching

Credentials are stored encrypted (AES-GCM, key from `AES_ENCRYPTION_KEY_SECRET`) in D1. The system supports multi-hop role assumption chains: a base IAM user credential assumes an intermediate role, which then assumes the target role (up to `PRINCIPAL_TRUST_CHAIN_LIMIT` hops). `CredentialCacheRefreshTask` (`apps/api/src/scheduled/`) runs through `CronTasksWorker` on a cron schedule (every 10 minutes) to pre-cache assumed credentials in KV.

### Audit logging

Every API request is automatically logged via the `IActivityAPIRoute` base class. The `handle()` method has a `finally` block that uses `c.executionCtx.waitUntil()` to write audit logs asynchronously. A path-to-action map in `apps/api/src/constants/AuditActions.ts` translates HTTP method+path to semantic action names (e.g., `ASSUME_ROLE`, `GRANT_ACCESS`). The `AuditLogCleanupTask` deletes entries older than `AUDIT_LOG_RETENTION_DAYS` (default 90).

### Cost analytics

Background collection via `CostDataCollectionTask` (scheduled). Uses `AwsApiUtil.getCostAndUsage()` to call AWS Cost Explorer API via `aws4fetch`. Collects 30 days of daily cost data, 3 accounts per invocation. Data stored in D1 `cost_data` table. Admins must enable collection per-credential via the `data_collection_config` table; `spend_alerts` stores configurable cost threshold alerts.

### Resource inventory

Background collection via `ResourceInventoryCollectionTask` (scheduled). Calls EC2 DescribeInstances, S3 ListBuckets, Lambda ListFunctions, and RDS DescribeDBInstances. 2 accounts per invocation. Data stored in D1 `resource_inventory` table. Stale resources are cleaned up after each collection cycle.

### Team workspaces

Multi-tenant team boundaries. Tables: `teams`, `team_members` (role: admin/member), `team_accounts`. A default team (UUID `00000000-0000-0000-0000-000000000000`) is seeded with all existing data (migration 0026). Three authorization tiers: global superadmin, team admin, team member. Teams scope at the account level via `team_accounts`, not at the credentials level (credentials are shared resources).

### Scheduled tasks (4)

1. **CredentialCacheRefreshTask** — Refreshes cached assumed credentials in KV
2. **AuditLogCleanupTask** — Deletes old audit log entries past retention period
3. **CostDataCollectionTask** — Collects AWS Cost Explorer data for enabled accounts
4. **ResourceInventoryCollectionTask** — Collects EC2/S3/Lambda/RDS inventory for enabled accounts

All run sequentially on the same cron trigger (`*/10 * * * *`) inside the singleton `CronTasksWorker` Durable Object. `AccessBridgeWorker.handleScheduled()` only invokes that Durable Object through the `CRON_TASKS` binding.

### Data access layer

All D1 queries go through DAO classes in `apps/api/src/dao/` (18 concrete DAOs + `IKeyValueDAO` interface). KV access for credential caching uses `CredentialsCacheDAO` (implements `IKeyValueDAO`). New DAOs beyond the core set include `SpendAlertDAO`, `DataCollectionConfigDAO`, `ResourceInventoryDAO`, `AuditLogDAO`, `CostDataDAO`, `TeamsDAO`, `TeamMembersDAO`, `TeamAccountsDAO`.

### Shared package

`packages/shared/` contains code shared between frontend and backend:

- `packages/shared/src/schema/` — Zod input/output schemas for API validation
- `packages/shared/src/types.ts` — Shared TypeScript interfaces
- `packages/shared/src/utils.ts` — Shared utility functions (ARN building, env export)

Backend imports schemas via `@aws-access-bridge/shared`. Frontend uses types directly from `packages/shared/src/types.ts`.

### Constants organization

`apps/api/src/constants/` contains both top-level files and three topical subdirectories:

- Top-level: `AuditActions.ts`, `ConfigurationDefaults.ts`, `Configurations.ts`, `DemoMode.ts`, `Headers.ts`, `Hostnames.ts`, `RoleSessionNames.ts`
- `apps/api/src/constants/d1/` — D1 session constraint constants
- `apps/api/src/constants/error/` — Error message constants (e.g., for AssumeRoleUtil, HMACHandler)
- `apps/api/src/constants/kv/` — KV namespace names, TTLs, value type markers

### Path aliases

- Backend (`apps/api`): `@/*` maps to `./apps/api/src/*` (see `apps/api/tsconfig.json`)
- Frontend (`apps/web`): Relative imports within `apps/web/src/` and `apps/web/src/components/`

Always use `@/` imports for backend source code.

### Frontend

React components live in `apps/web/src/components/`. All interactive components use the `'use client'` directive. The Vite SPA entry point is `apps/web/src/SpaApp.tsx` which provides pathname-based client-side view switching.

Key components:

- `apps/web/src/components/HomePage.tsx` — Landing / empty-state page
- `apps/web/src/components/Navbar.tsx` — Top navigation shared across views
- `apps/web/src/components/AccountList.tsx` — Main account list with role assumption and favorites
- `apps/web/src/components/AccessKeyModal.tsx` — Displays generated AWS access keys
- `apps/web/src/components/AdminPage.tsx` — Tabbed admin interface organized as a grouped left sidebar:
  - **SETUP**: Setup Wizard
  - **CONFIGURATION**: Credentials, Account Nicknames, Role Config
  - **ACCESS**: User Access, Teams
  - **MONITORING**: Spend Alerts, Data Collection
  - **SYSTEM**: Audit Logs, Maintenance
- `apps/web/src/components/OnboardingWizard.tsx` — Guided admin account setup
- `apps/web/src/components/CostDashboard.tsx` — Cost summary cards, trend bar chart, account breakdown
- `apps/web/src/components/ResourceInventory.tsx` — Resource summary, type/search filters, paginated table
- `apps/web/src/components/AuditLogsTab.tsx` — Filterable, paginated audit log viewer
- `apps/web/src/components/TeamsTab.tsx` — Team management (create/rename/delete, members, accounts)
- `apps/web/src/components/Unauthorized.tsx` — Unauthorized access screen

### TypeScript configuration

Each package has its own `tsconfig.json`:

- `apps/web/tsconfig.json` — Frontend (includes `dom` lib, Vite/client types)
- `apps/api/tsconfig.json` — Backend (no `dom` lib, `worker-configuration.d.ts` types)
- `packages/shared/tsconfig.json` — Shared schemas only

The `pnpm typecheck` command runs type-checking on all packages.

### Tests

Vitest (`vitest.config.ts`) runs test files under `test/`, organized by area: `test/constants/` (1), `test/crypto/` (2 — AES-GCM + HMAC), `test/dao/` (14 DAO tests), `test/error/` (1), `test/middleware/` (1 — HMAC handler), `test/model/` (1), `test/utils/` (9 util tests), `test/workers/` (1).

## Code Style

- Prettier: 140 char line width, single quotes, semicolons, spaces (not tabs)
- ESLint: typescript-eslint recommended rules; unused vars prefixed with `_` are allowed
- Explicit type annotations are used throughout (e.g., `const x: Type = ...`)
- Models use dual interfaces: `Type` (camelCase, user-facing) and `TypeInternal` (snake_case, D1 schema)

## Configuration

`wrangler.jsonc` contains the worker config (D1 binding, KV binding, Durable Object binding, secrets store, service binding, vars, cron triggers). It is gitignored. A `wrangler.jsonc.template` is the public version with placeholder IDs. The template has `$version` and `$minimumVersion` fields (commented); CI validates that fork configs are not outdated against `$minimumVersion`.

**Bindings (from template):**

- D1: `AccessBridgeDB` → `aws-access-bridge-db`
- KV: `AccessBridgeKV`
- Durable Object: `CRON_TASKS` → `CronTasksWorker` (singleton name `cron-tasks`)
- Service: `SELF` → `aws-access-bridge` (for internal HMAC-signed self-calls)
- Secrets Store: `AES_ENCRYPTION_KEY_SECRET` (credential encryption), `INTERNAL_HMAC_SECRET` (internal request signing)
- Assets: `./apps/web/dist/` (Vite SPA output)
- Cron: `*/10 * * * *`
- Compatibility date: `2025-11-29`

**Environment variables** (in `vars`):

- `POLICY_AUD` / `TEAM_DOMAIN` — Cloudflare Zero Trust config. **Optional**; only required when the worker and domain live in different Cloudflare accounts (Cloudflare for SaaS). When both are in the same account, Zero Trust's team domain and application AUD are auto-inferred at runtime.
- `MAX_TOKENS_PER_USER` / `MAX_TOKEN_EXPIRY_DAYS` — PAT limits
- `PRINCIPAL_TRUST_CHAIN_LIMIT` — Max credential chain depth
- `AUDIT_LOG_RETENTION_DAYS` — Audit log retention (default 90)
- `DEMO_MODE` — When `"true"`, all admin write operations throw `MethodNotAllowedError` at the base-class level

## CI/CD

Deployment runs via GitHub Actions (`.github/workflows/deploy-cloudflare-worker.yml`) on Node 24 with pnpm. The workflow: checkout → install pnpm → dump `wrangler.jsonc` from GitHub vars → validate config `$minimumVersion` → init Cloudflare Secrets Store (`scripts/init-secrets.ts`) → apply D1 migrations → build web app → build API worker → wrangler deploy.

## Database

26 D1 migrations in `migrations/`. The `credentials_cache` table was created in migration 0014 and dropped in 0017 (caching moved entirely to KV). Current tables:

- `credentials` — Encrypted AWS IAM credentials with assumption chains
- `assumable_roles` — User-to-account-to-role access mappings
- `aws_accounts` — Account metadata and nicknames
- `user_favorite_accounts` — Per-user favorite accounts
- `user_metadata` — User info, superadmin flag, federation username
- `user_access_tokens` — Personal access tokens (PAT)
- `role_configs` — Per-role destination path/region config
- `credential_cache_config` — Tracks credential cache staleness
- `audit_logs` — Activity log for all API requests
- `cost_data` — AWS Cost Explorer data by account and period
- `data_collection_config` — Per-credential opt-in for cost/resource collection
- `spend_alerts` — Configurable cost threshold alerts
- `resource_inventory` — EC2/S3/Lambda/RDS resource snapshots
- `teams` / `team_members` / `team_accounts` — Multi-tenant team workspaces (default team seeded in 0026)
