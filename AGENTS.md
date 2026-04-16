# AGENTS.md

This file provides guidance to LLM agents when working with code in this repository.

## Project Overview

AWS AccessBridge is a Cloudflare Worker that provides a web-based AWS role assumption bridge. It lets users assume AWS roles across multiple accounts and generate temporary AWS Console URLs. Authentication is handled by Cloudflare Zero Trust.

**Stack:** Hono + Chanfana (OpenAPI) backend on Cloudflare Workers, React 19 + Tailwind CSS v4 frontend (Vite SPA), Cloudflare D1 database (26 migrations), Cloudflare KV for credential caching, Cloudflare Secrets Store for encryption keys and internal HMAC secret.

## Commands

```bash
# Development
npm run dev               # Vite dev server for frontend SPA
npm run dev:ssr           # Next.js dev server (SSR mode, needs 2GB+ RAM)

# Build
npm run build             # Build frontend SPA with Vite (fast, ~7s)
npm run build:ssr         # Build Next.js SSR via OpenNext (needs 2GB+ RAM)

# Deploy
npm run deploy            # Build frontend + wrangler deploy
npm run deploy:ssr        # OpenNext build + deploy (needs 2GB+ RAM)

# Code Quality
npm run prettier          # Format all code
npm run lint              # Lint + autofix TypeScript
npm run tsc               # Type-check frontend + backend (two tsconfigs)
npm run test              # Run vitest tests

# Cloudflare
npm run cf-typegen        # Regenerate cloudflare-env.d.ts from wrangler.jsonc
npx wrangler dev          # Local Cloudflare dev server

# Database
npx wrangler d1 migrations apply --remote aws-access-bridge-db    # Apply migrations to remote D1
npx wrangler d1 migrations apply --local aws-access-bridge-db     # Apply migrations locally
```

## Architecture

### Entry point and request flow

`src/index.ts` instantiates `AccessBridgeWorker` (`src/workers/AccessBridgeWorker.ts`) which extends `AbstractWorker` (`src/base/`). AbstractWorker handles both `fetch` (HTTP) and `scheduled` (cron) events. The `/__scheduled` path triggers the scheduled handler via HTTP for testing.

The frontend SPA is built to `app/dist/` by Vite. The HTML shell is embedded into the Worker bundle at build time via a custom Vite plugin that emits `src/generated/spa-shell.ts` (`SPA_HTML`). A catch-all `app.get('*')` handler serves this HTML for any non-API, non-docs, non-asset path, giving the SPA robust deep-linking support without relying on the `ASSETS` binding for HTML routing. Static assets from `app/dist/` are still served by Cloudflare's asset binding.

### Dual frontend architecture

The project has two frontend build paths:

1. **Vite SPA** (current, used in CI): `app/SpaApp.tsx` is the entry point. Built with `vite.config.ts` to `app/dist/`. Lightweight (~7s build, <100MB RAM). Client-side rendered with pathname-based view switching between `HomePage`, `AccountList`, `CostDashboardView`, `ResourceInventoryView`, and `AdminPageView`.
2. **Next.js SSR** (future): `app/layout.tsx` + `app/page.tsx` with the Next.js App Router. Built via OpenNext Cloudflare adapter (`open-next.config.ts`, `next.config.ts`). Requires 2GB+ RAM. The Hono backend is mounted via catch-all route handlers at `app/api/[[...path]]/route.ts`.

Both use the same shared components from `components/` at the project root.

### Endpoint pattern

Every API endpoint is a standalone file under `src/endpoints/api/{domain}/{resource}/{METHOD}.ts`. Each extends one of two abstract base classes:

- **`IActivityAPIRoute`** (`src/endpoints/IActivityAPIRoute.ts`) — Authenticates the user (via Cloudflare Zero Trust JWT or Bearer PAT), parses the request body, writes an audit log entry via `waitUntil()`, and delegates to `handleRequest()`. All endpoints inherit from this.
- **`IAdminActivityAPIRoute`** (`src/endpoints/IAdminActivityAPIRoute.ts`) — Extends `IActivityAPIRoute`, adds a superadmin check and a demo-mode guard (throws `MethodNotAllowedError` when `DEMO_MODE=true`) before delegating to `handleAdminRequest()`.

Endpoints are re-exported through `src/endpoints/index.ts` (cast to `any` for Chanfana compatibility) and registered as Hono routes in `AccessBridgeWorker`.

### API endpoints (47 total routes registered)

Counts reflect routes registered in `AccessBridgeWorker` — note several admin-adjacent operations (cost alerts, data collection config, teams) live under the `/api/admin/*` prefix.

**Root (1):** `/federate` (wrapper that proxies to `/api/aws/federate`)
**AWS Operations (3):** `POST /api/aws/assume-role`, `POST /api/aws/console`, `GET /api/aws/federate`
**User Operations (10):** assumables list/search, me, favorites (POST/DELETE), hidden roles (POST/DELETE), access tokens (POST/DELETE/GET)
**Admin — Credentials & Access (7):** credentials POST, credentials/relationship (POST/DELETE), credentials/validate POST, credentials/test-chain POST, access grant/revoke (POST/DELETE)
**Admin — Account & Role Config (5):** account/nickname (PUT/DELETE), role/config (PUT/DELETE), account/roles POST (IAM role discovery)
**Admin — Audit (1):** `GET /api/admin/audit-logs`
**Admin — Cost & Data Collection (4):** cost/alerts (POST/DELETE), collection/config (POST/DELETE)
**Admin — Teams (11):** team CRUD, team name PUT, team member add/remove/list, team member role PUT, team account add/remove/list
**Cost Operations (3):** summary, account detail, trends (all GET)
**Resource Operations (2):** resources list (with filters), resources summary

### Internal service-to-service calls

The worker calls itself via the `SELF` service binding. These internal requests are signed with HMAC-SHA256 using the `INTERNAL_HMAC_SECRET` secret (`src/utils/helpers/InternalRequestHelper.ts`, `src/middleware/HMACHandler.ts`). Requests with `X-Internal-*` headers or originating from the self-worker hostname are validated by the HMAC middleware; external requests pass through without HMAC checks.

### Credential chain and caching

Credentials are stored encrypted (AES-GCM, key from `AES_ENCRYPTION_KEY_SECRET`) in D1. The system supports multi-hop role assumption chains: a base IAM user credential assumes an intermediate role, which then assumes the target role (up to `PRINCIPAL_TRUST_CHAIN_LIMIT` hops). `CredentialCacheRefreshTask` (`src/scheduled/`) runs on a cron schedule (every 10 minutes) to pre-cache assumed credentials in KV.

### Audit logging

Every API request is automatically logged via the `IActivityAPIRoute` base class. The `handle()` method has a `finally` block that uses `c.executionCtx.waitUntil()` to write audit logs asynchronously. A path-to-action map in `src/constants/AuditActions.ts` translates HTTP method+path to semantic action names (e.g., `ASSUME_ROLE`, `GRANT_ACCESS`). The `AuditLogCleanupTask` deletes entries older than `AUDIT_LOG_RETENTION_DAYS` (default 90).

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

All run sequentially on the same cron trigger (`*/10 * * * *`) via `handleScheduled()` in `AccessBridgeWorker`.

### Data access layer

All D1 queries go through DAO classes in `src/dao/` (18 concrete DAOs + `IKeyValueDAO` interface). KV access for credential caching uses `CredentialsCacheDAO` (implements `IKeyValueDAO`). New DAOs beyond the core set include `SpendAlertDAO`, `DataCollectionConfigDAO`, `ResourceInventoryDAO`, `AuditLogDAO`, `CostDataDAO`, `TeamsDAO`, `TeamMembersDAO`, `TeamAccountsDAO`.

### Constants organization

`src/constants/` contains both top-level files and three topical subdirectories:

- Top-level: `AuditActions.ts`, `ConfigurationDefaults.ts`, `Configurations.ts`, `DemoMode.ts`, `Headers.ts`, `Hostnames.ts`, `RoleSessionNames.ts`
- `src/constants/d1/` — D1 session constraint constants
- `src/constants/error/` — Error message constants (e.g., for AssumeRoleUtil, HMACHandler)
- `src/constants/kv/` — KV namespace names, TTLs, value type markers

### Path aliases

- Backend: `@/*` maps to `./src/*` (see `tsconfig.backend.json`)
- Frontend (Vite SPA): `@/components/*` maps to `./components/*` (see `vite.config.ts`)
- Frontend (Next.js): Both `@/*` → `./src/*` and `@/components/*` → `./components/*` (see `tsconfig.json`)

Always use `@/` imports for backend source.

### Frontend

Shared React components live in `components/` at the project root. All interactive components use the `'use client'` directive (needed for Next.js compatibility). The Vite SPA entry point is `app/SpaApp.tsx` which provides pathname-based client-side view switching.

Key components:

- `components/HomePage.tsx` — Landing / empty-state page
- `components/Navbar.tsx` — Top navigation shared across views
- `components/AccountList.tsx` — Main account list with role assumption and favorites
- `components/AccessKeyModal.tsx` — Displays generated AWS access keys
- `components/AdminPage.tsx` / `components/AdminPageView.tsx` — Tabbed admin interface (Setup Wizard, Credentials, User Access, Account Nicknames, Role Config, Teams, Audit Logs)
- `components/OnboardingWizard.tsx` — Guided admin account setup
- `components/CostDashboard.tsx` / `components/CostDashboardView.tsx` — Cost summary cards, trend bar chart, account breakdown
- `components/ResourceInventory.tsx` / `components/ResourceInventoryView.tsx` — Resource summary, type/search filters, paginated table
- `components/AuditLogsTab.tsx` — Filterable, paginated audit log viewer
- `components/TeamsTab.tsx` — Team management (create/rename/delete, members, accounts)
- `components/Unauthorized.tsx` — Unauthorized access screen
- `components/types.ts` / `components/utils.ts` — Shared types and helpers

### TypeScript configuration

Two separate tsconfig files to avoid type conflicts between Cloudflare Workers types and DOM types:

- `tsconfig.json` — Frontend (includes `dom` lib, Next.js plugin, `@cloudflare/workers-types`). Covers `app/`, `components/`, and `src/` (for route handler imports).
- `tsconfig.backend.json` — Backend only (no `dom` lib, `worker-configuration.d.ts` types). Covers `src/` only.

The `npm run tsc` command checks both configs.

### Tests

Vitest (`vitest.config.ts`) runs ~24 test files under `test/`, organized by area: `test/constants/`, `test/crypto/` (AES-GCM + HMAC), `test/dao/` (12 DAO tests), `test/error/`, `test/middleware/` (HMAC handler), `test/model/`, `test/utils/` (8 util tests).

## Code Style

- Prettier: 140 char line width, single quotes, semicolons, spaces (not tabs)
- ESLint: typescript-eslint recommended rules; unused vars prefixed with `_` are allowed
- Explicit type annotations are used throughout (e.g., `const x: Type = ...`)
- Models use dual interfaces: `Type` (camelCase, user-facing) and `TypeInternal` (snake_case, D1 schema)

## Configuration

`wrangler.jsonc` contains the worker config (D1 binding, KV binding, secrets store, service binding, vars, cron triggers). It is gitignored. A `wrangler.jsonc.template` is the public version with placeholder IDs. The template has `$version` and `$minimumVersion` fields (commented); CI validates that fork configs are not outdated against `$minimumVersion`.

**Bindings (from template):**

- D1: `AccessBridgeDB` → `aws-access-bridge-db`
- KV: `AccessBridgeKV`
- Service: `SELF` → `aws-access-bridge` (for internal HMAC-signed self-calls)
- Secrets Store: `AES_ENCRYPTION_KEY_SECRET` (credential encryption), `INTERNAL_HMAC_SECRET` (internal request signing)
- Assets: `./app/dist/` (Vite SPA output)
- Cron: `*/10 * * * *`
- Compatibility date: `2025-11-29`

**Environment variables** (in `vars`):

- `POLICY_AUD` / `TEAM_DOMAIN` — Cloudflare Zero Trust config
- `MAX_TOKENS_PER_USER` / `MAX_TOKEN_EXPIRY_DAYS` — PAT limits
- `PRINCIPAL_TRUST_CHAIN_LIMIT` — Max credential chain depth
- `AUDIT_LOG_RETENTION_DAYS` — Audit log retention (default 90)
- `DEMO_MODE` — When `"true"`, all admin write operations throw `MethodNotAllowedError` at the base-class level

## CI/CD

Deployment runs via GitHub Actions (`.github/workflows/deploy-cloudflare-worker.yml`) on Node 24. It only runs on forks (not the source repo). The workflow: checkout → install → dump `wrangler.jsonc` from GitHub vars → validate config `$minimumVersion` → init Cloudflare Secrets Store (`scripts/init-secrets.ts`) → apply D1 migrations → build frontend (Vite SPA) → hide OpenNext config files → wrangler deploy.

The OpenNext config files (`open-next.config.ts`, `next.config.ts`) are temporarily hidden during deploy so wrangler doesn't delegate to `opennextjs-cloudflare` (which OOMs on the GitHub Actions runner).

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
