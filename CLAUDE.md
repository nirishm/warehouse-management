# CLAUDE.md — WareOS v2

## Project
Multi-tenant SaaS for inventory + warehouse management.
Tech: Next.js 16, Drizzle ORM, Supabase (Postgres + Auth + Realtime), Inngest, Upstash Redis, Tailwind v4, shadcn/ui.
Production: https://wareos.in (Vercel)

## Critical Rules (never break these)

### Tenant Isolation
- Every database query MUST use `withTenantScope(db, ctx.tenantId)`.
- Direct `db.select()` / `db.insert()` without tenant scoping is FORBIDDEN.
- Every tenant-scoped table has `tenant_id UUID NOT NULL` as its second column (after `id`).
- RLS policies exist as defense-in-depth. The app layer (`withTenantScope`) is primary enforcement.

### API Routes
- Tenant API routes live under `src/app/api/v1/t/[tenantSlug]/`.
- Admin API routes live under `src/app/api/v1/admin/` (super_admins table check, NOT JWT-only).
- Every tenant route MUST use `withTenantContext()` wrapper (extracts tenant context from JWT headers).
- `withTenantContext` also enforces rate limiting (Upstash Redis) automatically.
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

### Rate Limiting
- Upstash Redis: 100 req/min per IP, 1000 req/min per tenant.
- Configured in `src/core/api/rate-limiter.ts`, enforced in `src/core/api/with-rate-limit.ts`.
- Gracefully skipped when `UPSTASH_REDIS_REST_URL` is not set (dev environments).

### Realtime
- Supabase Realtime subscriptions in `src/hooks/use-realtime.ts`.
- Pub/sub context in `src/components/realtime/realtime-provider.tsx`.
- `StockRealtimeListener` listens to purchases, sales, transfers, adjustments → notifies `stock_levels`.

### PWA
- Online-only PWA (network-first service worker in `public/sw.js`).
- Offline banner in `src/components/pwa/offline-banner.tsx`.
- Manifest at `public/manifest.json`.

## Architecture

```
src/
  app/
    (auth)/           # Login, register, reset-password, set-password
    admin/            # Super admin pages (tenant mgmt, access requests)
    api/v1/
      admin/          # Admin API (tenants, access-requests)
      t/[tenantSlug]/ # Tenant-scoped API (17 resource groups)
    t/[tenantSlug]/   # Tenant pages (dashboard, inventory, transactions, settings)
  core/
    api/              # Guards (withTenantContext), rate limiter, error handler
    auth/             # JWT decode, permissions, role hierarchy, types
    db/
      schema/         # Drizzle schemas (16 files)
      drizzle.ts      # DB client
      tenant-scope.ts # withTenantScope() — primary tenant isolation
      stock-levels.ts # stock_levels VIEW SQL
    events/           # Inngest event types
    modules/          # Module registry + manifests
  modules/            # Business logic per module (queries, validations)
    inventory/        # Items, locations, units, contacts, stock, custom-fields
    purchase/         # Purchase orders
    sale/             # Sales orders
    transfer/         # Inter-location transfers
    adjustments/      # Stock adjustments
    user-management/  # User CRUD, invites
    audit-trail/      # Audit log queries
    stock-alerts/     # Threshold CRUD + alert queries
    analytics/        # Dashboard KPIs + charts
    shortage-tracking/# Transfer shortage reports
    payments/         # Payment recording
  components/
    ui/               # shadcn/ui + custom variants (data-table, form-section)
    layout/           # Sidebar, header, mobile-bottom-nav, tenant-provider
    realtime/         # RealtimeProvider, StockRealtimeListener
    onboarding/       # First-login onboarding wizard
    pwa/              # Offline banner, service worker registration
    keyboard-shortcuts/ # Global shortcuts provider + help dialog
    search/           # Cmd+K global search
  hooks/              # use-realtime, use-keyboard-shortcuts
  inngest/            # Inngest client + functions/
```

## Modules (11 total)

| Module | API Routes | Pages | Key Files |
|--------|-----------|-------|-----------|
| Inventory | items, locations, units, contacts, inventory, custom-fields | settings/items,locations,contacts,units + inventory | `src/modules/inventory/` |
| Purchases | purchases, purchases/[id], purchases/[id]/status | purchases | `src/modules/purchase/` |
| Sales | sales, sales/[id], sales/[id]/status | sales | `src/modules/sale/` |
| Transfers | transfers, transfers/[id], transfers/[id]/receive,status | transfers | `src/modules/transfer/` |
| Adjustments | adjustments, adjustments/[id], adjustments/[id]/approve | adjustments | `src/modules/adjustments/` |
| User Management | users, users/[userId], users/[userId]/locations,permissions | settings/users | `src/modules/user-management/` |
| Audit Trail | audit-log | audit-log | `src/modules/audit-trail/` |
| Stock Alerts | stock-alerts, stock-alerts/thresholds, thresholds/[id] | stock-alerts | `src/modules/stock-alerts/` |
| Analytics | analytics | dashboard (page.tsx) | `src/modules/analytics/` |
| Shortage Tracking | shortage-tracking | shortage-tracking | `src/modules/shortage-tracking/` |
| Payments | payments, payments/[id], payments/summary | payments | `src/modules/payments/` |

## Super Admin Panel
- Pages at `/admin`, `/admin/tenants`, `/admin/access-requests`.
- API at `/api/v1/admin/tenants` and `/api/v1/admin/access-requests`.
- Guarded by `super_admins` table lookup (the ONE place where admin routes hit DB).
- Self-signup flow: register → confirm → login → `/no-tenant` → access request auto-created → admin approves.

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
