# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS AccessBridge is a Cloudflare Worker that provides a web-based AWS role assumption bridge. It lets users assume AWS roles across multiple accounts and generate temporary AWS Console URLs. Authentication is handled by Cloudflare Zero Trust.

**Stack:** Hono + Chanfana (OpenAPI) backend on Cloudflare Workers, React 19 + Tailwind CSS v4 frontend (Vite), Cloudflare D1 database, Cloudflare KV for credential caching, Cloudflare Secrets Store for encryption keys.

## Commands

```bash
# Backend (root)
npm run prettier          # Format backend code
npm run lint              # Lint + autofix backend TypeScript
npm run tsc               # Type-check backend (no emit)
npm run cf-typegen        # Regenerate worker-configuration.d.ts from wrangler.jsonc
npm run deploy            # Full deploy: install, typegen, format, lint, build frontend, then wrangler deploy
npm run deploy:fast       # Skip checks, just wrangler deploy
npx wrangler dev          # Local dev server

# Frontend (app/)
cd app && npm run build   # Build frontend (runs typegen + prettier + lint first)
cd app && npm run release # Clean dist/ then build

# Database
npm run migrations:apply                                        # Apply migrations to remote D1
npx wrangler d1 migrations apply --local aws_access_bridge_db   # Apply migrations locally
```

## Architecture

### Entry point and request flow

`src/index.ts` instantiates `AccessBridgeWorker` which extends `AbstractWorker`. AbstractWorker handles both `fetch` (HTTP) and `scheduled` (cron) events. The `/__scheduled` path triggers the scheduled handler via HTTP for testing.

### Endpoint pattern

Every API endpoint is a standalone file under `src/endpoints/api/{domain}/{resource}/{METHOD}.ts`. Each extends one of two abstract base classes:

- **`IActivityAPIRoute`** (`src/endpoints/IActivityAPIRoute.ts`) - Authenticates the user (via Cloudflare Zero Trust JWT or Bearer PAT), parses the request body, and delegates to `handleRequest()`. All endpoints inherit from this.
- **`IAdminActivityAPIRoute`** (`src/endpoints/IAdminActivityAPIRoute.ts`) - Extends `IActivityAPIRoute`, adds a superadmin check before delegating to `handleAdminRequest()`.

Endpoints are re-exported through `src/endpoints/index.ts` (cast to `any` for Chanfana compatibility) and registered as Hono routes in `AccessBridgeWorker`.

### Internal service-to-service calls

The worker calls itself via the `SELF` service binding. These internal requests are signed with HMAC-SHA256 (`src/utils/helpers/InternalRequestHelper.ts`, `src/middleware/HMACHandler.ts`). Requests with `X-Internal-*` headers or from the self-worker hostname are validated by the HMAC middleware; external requests pass through without HMAC checks.

### Credential chain and caching

Credentials are stored encrypted (AES-GCM) in D1. The system supports multi-hop role assumption chains: a base IAM user credential assumes an intermediate role, which then assumes the target role. `CredentialCacheRefreshTask` (`src/scheduled/`) runs on a cron schedule (every 10 minutes) to pre-cache assumed credentials in KV.

### Data access layer

All D1 queries go through DAO classes in `src/dao/`. KV access for credential caching uses `CredentialsCacheDAO` (implements `IKeyValueDAO`).

### Path aliases

TypeScript and bundler are configured with `@/*` mapping to `./src/*` (see `tsconfig.json`). Always use `@/` imports for backend source.

### Frontend

The React app lives in `app/` with its own `package.json`, `tsconfig.json`, and eslint config. It is built to `app/dist/` and served as static assets by the worker (configured via `assets.directory` in `wrangler.jsonc`). The frontend has its own Cloudflare vite plugin integration.

## Code Style

- Prettier: 140 char line width, single quotes, semicolons, spaces (not tabs)
- ESLint: typescript-eslint recommended rules; unused vars prefixed with `_` are allowed
- Backend and frontend have separate lint/prettier configs; run them from their respective directories
- Explicit type annotations are used throughout (e.g., `const x: Type = ...`)

## Configuration

`wrangler.jsonc` contains the worker config (D1 binding, KV binding, secrets store, vars, cron triggers). A `wrangler.jsonc.template` is the public version with placeholder IDs. The template has a `$minimumVersion` field used by CI to validate that fork configs are not outdated.

## CI/CD

Deployment runs via GitHub Actions (`.github/workflows/deploy-cloudflare-worker.yml`). It only runs on forks (not the source repo). The workflow: checkout, install, dump `wrangler.jsonc` from GitHub vars, validate config version, init secrets, apply D1 migrations, then `npm run deploy`.
