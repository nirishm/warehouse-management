# CLAUDE.md — WareOS v2

## Project
Multi-tenant SaaS for inventory + warehouse management.
Tech: Next.js 15, Drizzle ORM, Supabase (Postgres + Auth), Inngest, Upstash Redis, Tailwind v4, shadcn/ui.

## Critical Rules (never break these)

### Tenant Isolation
- Every database query MUST use `withTenantScope(db, ctx.tenantId)`.
- Direct `db.select()` / `db.insert()` without tenant scoping is FORBIDDEN.
- Every tenant-scoped table has `tenant_id UUID NOT NULL` as its second column (after `id`).
- RLS policies exist as defense-in-depth. The app layer (`withTenantScope`) is primary enforcement.

### API Routes
- All API routes live under `src/app/api/v1/t/[tenantSlug]/`.
- Every route MUST use `withTenantContext()` wrapper (extracts tenant context from JWT headers).
- Every request body MUST be validated with Zod before any DB operation.
- Every mutation MUST write to `audit_log` table.
- Soft deletes only: `SET deleted_at = now()`, never use `DELETE`.
- Sequence numbers: use `FOR UPDATE` row lock on `sequence_counters` table.

### Authentication
- Middleware (`src/middleware.ts`) decodes JWT only — ZERO database calls.
- Tenant context comes from JWT `app_metadata` (tenant_id, tenant_slug, role, enabled_modules).
- Never call Supabase client in middleware.

### Naming
- Entities are "items" (never "commodities" or "products").
- Locations are "locations" (never "warehouses" — a warehouse is a location type).
- Transfers (never "dispatches" in code, though UI may show "Dispatch").

### Database
- ORM: Drizzle only. No raw SQL except in migrations.
- All timestamps: `TIMESTAMPTZ` (with timezone).
- All IDs: `UUID` with `defaultRandom()`.
- Indexes: every query pattern needs a `(tenant_id, ...)` composite index.
- Drizzle strict mode is always on.

### Frontend
- Design system: `design_reference.html` is the source of truth.
- Always use CSS custom property tokens (e.g., `var(--accent-color)`), never inline hex.
- Two font weights only: 400 (regular) and 700 (bold). No 500, 600, 800.
- CTA buttons: pill-shaped (`border-radius: 9999px`), height 48px.
- Status badges: pill shape. Type labels: rectangular (4px radius).
- White cards (`--bg-base`) on off-white pages (`--bg-off`).
- Orange (`--accent-color`) marks every interaction point.
- Active sidebar: orange left-border + accent-tint bg + orange text (all three together).

### Background Jobs (Inngest)
- Any operation >5 seconds → Inngest function, never inline.
- Inngest functions live in `src/inngest/functions/`.
- Pattern: API returns job ID instantly → emits Inngest event → function runs async.

### Testing
- Unit tests: Vitest. E2E: Playwright.
- Test tenant isolation: verify `withTenantScope` never leaks cross-tenant data.
- Test stock_levels VIEW with fixtures: create purchases + sales + transfers → assert.

## Status State Machines
- Sales: draft → confirmed → dispatched → cancelled
- Purchases: draft → ordered → received → cancelled
- Transfers: draft → dispatched → in_transit → received
- Packages: draft → packed → shipped → delivered → returned

## Key Commands
```
pnpm dev                    # Dev server
pnpm build                  # Production build
pnpm test                   # Unit tests (Vitest)
pnpm test:e2e               # E2E tests (Playwright)
pnpm drizzle-kit generate   # Generate SQL from schema changes
pnpm drizzle-kit push       # Apply migrations to DB
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-only)
- `SUPABASE_SERVICE_API_KEY` — Supabase access token for CLI (starts with `sbp_`)
- `NEXT_PUBLIC_APP_URL` — App base URL (e.g. `https://wareos.in`)
- `RESEND_API_KEY` — Resend API key for transactional email

## CLI Tools
- `supabase` CLI (v2.75.0) — installed at `/opt/homebrew/bin/supabase`
- `vercel` CLI (v50.28.0) — installed at `/opt/homebrew/bin/vercel`
- `inngest-cli` — not yet installed (`npm i -g inngest-cli`)

## Design Reference
- `.claude/context/design_reference.html` is the **strict** source of truth for all UI/frontend design decisions
- All components, tokens, colors, spacing, typography must match this reference exactly
- `blueprint/wareos_v2_final_part{1,2,3}.md` — v2 architecture blueprint

## Reference
- v1 source code is in `v1-archive/` — **NEVER reference automatically**. Always ask the user first if v1 code would be helpful. Only consult v1-archive after explicit user approval.
- Design tokens are in `src/app/globals.css`.
- Zoho feature reference is in `docs/zoho-inventory-features.pdf`.

## Visual Development & Testing

### Quick Visual Check (after every frontend change)
1. Ensure `pnpm dev` is running (`http://localhost:3000`)
2. Navigate to the affected route in the browser
3. Take a screenshot and verify against `.claude/context/design_reference.html`
4. Check at mobile (375px) if the change touches layout or forms
5. Open browser console — verify zero JS errors
6. Check for hardcoded hex colors in changed files (should use CSS tokens)

### Playwright Tool Prefix
```
mcp__plugin_playwright_playwright__*
```
(NOT `mcp__playwright__*` — that prefix will fail.)

### Screenshots
Save all screenshots to `screenshots/` (gitignored). Pattern: `screenshots/{page}-{viewport}-{description}.png`.

### When to Skip Visual Review
Skip for: backend-only changes (API routes, DB migrations, queries), config/env files, documentation, and pure test files.
