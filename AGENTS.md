# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS AccessBridge is a Cloudflare Worker that provides a web-based AWS role assumption bridge. It lets users assume AWS roles across multiple accounts and generate temporary AWS Console URLs. Authentication is handled by Cloudflare Zero Trust.

**Stack:** Hono + Chanfana (OpenAPI) backend on Cloudflare Workers, React 19 + Tailwind CSS v4 frontend (Vite SPA), Cloudflare D1 database (26 migrations), Cloudflare KV for credential caching, Cloudflare Secrets Store for encryption keys.

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
npm run cf-typegen        # Regenerate worker-configuration.d.ts from wrangler.jsonc
npx wrangler dev          # Local Cloudflare dev server

# Database
npx wrangler d1 migrations apply --remote aws-access-bridge-db    # Apply migrations to remote D1
npx wrangler d1 migrations apply --local aws-access-bridge-db     # Apply migrations locally
```

## Architecture

### Entry point and request flow

`src/index.ts` instantiates `AccessBridgeWorker` which extends `AbstractWorker`. AbstractWorker handles both `fetch` (HTTP) and `scheduled` (cron) events. The `/__scheduled` path triggers the scheduled handler via HTTP for testing.

The frontend SPA is built to `app/dist/` by Vite and served as static assets by Cloudflare. API requests fall through to the Hono worker.

### Dual frontend architecture

The project has two frontend build paths:

1. **Vite SPA** (current, used in CI): `app/SpaApp.tsx` is the entry point. Built with `vite.config.ts` to `app/dist/`. Lightweight (~7s build, <100MB RAM). Client-side rendered with view switching.
2. **Next.js SSR** (future): `app/layout.tsx` + `app/page.tsx` with the Next.js App Router. Built via OpenNext Cloudflare adapter. Requires 2GB+ RAM. The Hono backend is mounted via catch-all route handlers at `app/api/[[...path]]/route.ts`.

Both use the same shared components from `components/`.

### Endpoint pattern

Every API endpoint is a standalone file under `src/endpoints/api/{domain}/{resource}/{METHOD}.ts`. Each extends one of two abstract base classes:

- **`IActivityAPIRoute`** (`src/endpoints/IActivityAPIRoute.ts`) — Authenticates the user (via Cloudflare Zero Trust JWT or Bearer PAT), parses the request body, writes an audit log entry via `waitUntil()`, and delegates to `handleRequest()`. All endpoints inherit from this.
- **`IAdminActivityAPIRoute`** (`src/endpoints/IAdminActivityAPIRoute.ts`) — Extends `IActivityAPIRoute`, adds a superadmin check before delegating to `handleAdminRequest()`.

Endpoints are re-exported through `src/endpoints/index.ts` (cast to `any` for Chanfana compatibility) and registered as Hono routes in `AccessBridgeWorker`.

### API endpoints (46 total)

**AWS Operations (3):** assume-role, console URL generation, federation
**User Operations (10):** assumables list/search, me, favorites, hidden roles, access tokens
**Admin Operations (11):** credentials CRUD, access grant/revoke, account nicknames, role config, credential validation, credential chain testing, IAM role discovery, audit log query
**Cost Operations (6):** cost summary, account detail, trends, spend alerts CRUD, data collection config
**Resource Operations (2):** resource list with filters, resource summary counts
**Team Operations (11):** team CRUD, member add/remove/list/role-update, account add/remove/list
**Other (3):** federate wrapper, docs, scheduled trigger

### Internal service-to-service calls

The worker calls itself via the `SELF` service binding. These internal requests are signed with HMAC-SHA256 (`src/utils/helpers/InternalRequestHelper.ts`, `src/middleware/HMACHandler.ts`). Requests with `X-Internal-*` headers or from the self-worker hostname are validated by the HMAC middleware; external requests pass through without HMAC checks.

### Credential chain and caching

Credentials are stored encrypted (AES-GCM) in D1. The system supports multi-hop role assumption chains: a base IAM user credential assumes an intermediate role, which then assumes the target role. `CredentialCacheRefreshTask` (`src/scheduled/`) runs on a cron schedule (every 10 minutes) to pre-cache assumed credentials in KV.

### Audit logging

Every API request is automatically logged via the `IActivityAPIRoute` base class. The `handle()` method has a `finally` block that uses `c.executionCtx.waitUntil()` to write audit logs asynchronously. A path-to-action map in `src/constants/AuditActions.ts` translates HTTP method+path to semantic action names (e.g., `ASSUME_ROLE`, `GRANT_ACCESS`). The `AuditLogCleanupTask` deletes entries older than the configured retention period (default 90 days).

### Cost analytics

Background collection via `CostDataCollectionTask` (scheduled). Uses `AwsApiUtil.getCostAndUsage()` to call AWS Cost Explorer API via `aws4fetch`. Collects 30 days of daily cost data, 3 accounts per invocation. Data stored in D1 `cost_data` table. Admins must enable collection per-credential via the `data_collection_config` table.

### Resource inventory

Background collection via `ResourceInventoryCollectionTask` (scheduled). Calls EC2 DescribeInstances, S3 ListBuckets, Lambda ListFunctions, and RDS DescribeDBInstances. 2 accounts per invocation. Data stored in D1 `resource_inventory` table. Stale resources are cleaned up after each collection cycle.

### Team workspaces

Multi-tenant team boundaries. Tables: `teams`, `team_members` (role: admin/member), `team_accounts`. A default team (UUID `00000000-0000-0000-0000-000000000000`) is seeded with all existing data. Three authorization tiers: global superadmin, team admin, team member. Teams scope at the account level via `team_accounts`, not at the credentials level (credentials are shared resources).

### Scheduled tasks (4)

1. **CredentialCacheRefreshTask** — Refreshes cached assumed credentials in KV (every 10 min)
2. **AuditLogCleanupTask** — Deletes old audit log entries past retention period
3. **CostDataCollectionTask** — Collects AWS Cost Explorer data for enabled accounts
4. **ResourceInventoryCollectionTask** — Collects EC2/S3/Lambda/RDS inventory for enabled accounts

All run on the same cron trigger (`*/10 * * * *`) via `handleScheduled()` in `AccessBridgeWorker`.

### Data access layer

All D1 queries go through DAO classes in `src/dao/` (18 DAOs). KV access for credential caching uses `CredentialsCacheDAO` (implements `IKeyValueDAO`).

### Path aliases

- Backend: `@/*` maps to `./src/*` (see `tsconfig.backend.json`)
- Frontend (Vite SPA): `@/components/*` maps to `./components/*` (see `vite.config.ts`)
- Frontend (Next.js): Both `@/*` → `./src/*` and `@/components/*` → `./components/*` (see `tsconfig.json`)

Always use `@/` imports for backend source.

### Frontend

Shared React components live in `components/` at the project root. All interactive components use the `'use client'` directive (needed for Next.js compatibility). The Vite SPA entry point is `app/SpaApp.tsx` which provides client-side view switching between Accounts, Costs, Resources, and Admin views.

Key components:
- `components/AccountList.tsx` — Main account list with role assumption and favorites
- `components/AdminPage.tsx` — Tabbed admin interface (Setup Wizard, Credentials, User Access, Account Nicknames, Role Config, Audit Logs)
- `components/OnboardingWizard.tsx` — 6-step guided admin account setup
- `components/CostDashboard.tsx` — Cost summary cards, trend bar chart, account breakdown
- `components/ResourceInventory.tsx` — Resource summary, type/search filters, paginated table
- `components/AuditLogsTab.tsx` — Filterable, paginated audit log viewer

### TypeScript configuration

Two separate tsconfig files to avoid type conflicts between Cloudflare Workers types and DOM types:

- `tsconfig.json` — Frontend (includes `dom` lib, Next.js plugin, `@cloudflare/workers-types`). Covers `app/`, `components/`, and `src/` (for route handler imports).
- `tsconfig.backend.json` — Backend only (no `dom` lib, `worker-configuration.d.ts` types). Covers `src/` only.

The `npm run tsc` command checks both configs.

## Code Style

- Prettier: 140 char line width, single quotes, semicolons, spaces (not tabs)
- ESLint: typescript-eslint recommended rules; unused vars prefixed with `_` are allowed
- Explicit type annotations are used throughout (e.g., `const x: Type = ...`)
- Models use dual interfaces: `Type` (camelCase, user-facing) and `TypeInternal` (snake_case, D1 schema)

## Configuration

`wrangler.jsonc` contains the worker config (D1 binding, KV binding, secrets store, vars, cron triggers). It is gitignored. A `wrangler.jsonc.template` is the public version with placeholder IDs. The template has a `$minimumVersion` field used by CI to validate that fork configs are not outdated.

**Environment variables** (in `vars`):
- `POLICY_AUD` / `TEAM_DOMAIN` — Cloudflare Zero Trust config
- `MAX_TOKENS_PER_USER` / `MAX_TOKEN_EXPIRY_DAYS` — PAT limits
- `PRINCIPAL_TRUST_CHAIN_LIMIT` — Max credential chain depth
- `AUDIT_LOG_RETENTION_DAYS` — Audit log retention (default 90)

## CI/CD

Deployment runs via GitHub Actions (`.github/workflows/deploy-cloudflare-worker.yml`). It only runs on forks (not the source repo). The workflow: checkout → install → dump `wrangler.jsonc` from GitHub vars → validate config version → init secrets → apply D1 migrations → build frontend (Vite SPA) → hide OpenNext config → wrangler deploy.

The OpenNext config files are temporarily hidden during deploy so wrangler doesn't delegate to `opennextjs-cloudflare` (which OOMs on the GitHub Actions runner).

## Database

26 D1 migrations in `migrations/`. Key tables:
- `credentials` — Encrypted AWS IAM credentials with assumption chains
- `assumable_roles` — User-to-account-to-role access mappings
- `aws_accounts` — Account metadata and nicknames
- `user_metadata` — User info, superadmin flag, federation username
- `user_access_tokens` — Personal access tokens (PAT)
- `role_configs` — Per-role destination path/region config
- `credential_cache_config` — Tracks credential cache staleness
- `audit_logs` — Activity log for all API requests
- `cost_data` — AWS Cost Explorer data by account and period
- `data_collection_config` — Per-credential opt-in for cost/resource collection
- `spend_alerts` — Configurable cost threshold alerts
- `resource_inventory` — EC2/S3/Lambda/RDS resource snapshots
- `teams` / `team_members` / `team_accounts` — Multi-tenant team workspaces
