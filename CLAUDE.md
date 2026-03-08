# Warehouse Management SaaS

## Project Overview
Multi-tenant SaaS Warehouse Management System built with Next.js + Supabase.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL) with schema-per-tenant
- **Auth**: Supabase Auth (email/password)
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Testing**: Vitest (unit), Playwright (E2E)
- **PDF generation**: @react-pdf/renderer (dispatch challan, GRN, delivery note)
- **Barcode/QR**: qrcode, react-qr-code
- **CSV**: papaparse (bulk import/export)

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/core/` — Core framework (auth, db, modules, permissions)
- `src/modules/` — 16 feature modules (inventory, dispatch, purchase, sale, analytics, shortage-tracking, user-management, audit-trail, payments, stock-alerts, document-gen, lot-tracking, returns, bulk-import, barcode)
- `src/components/` — Shared UI components
- `src/lib/` — Utilities and helpers
- `supabase/migrations/` — Database migrations
- `.claude/agents/` — Custom subagents (e.g. `design-review` for visual QA)
- `.claude/commands/` — Slash commands (e.g. `/design-review`)
- `.claude/context/` — Reference docs: `design-principles.md`, `design_reference.html` (WareOS spec)

## Multi-Tenancy
- Schema-per-tenant: each tenant gets `tenant_{slug}` Postgres schema
- Public schema holds: tenants, user_tenants, super_admins
- Tenant context resolved via URL: `/t/[tenantSlug]/...`
- Service role client with schema parameter for tenant queries

## Module System
- Modules self-register via manifest files in `src/modules/*/manifest.ts`
- Registry at `src/core/modules/registry.ts` handles dependency resolution
- Modules enabled/disabled per tenant via `public.tenant_modules` table
- Each module owns: API routes, components, migrations, permissions
- Module DDL registered via `registerModuleMigration(id, fn)` in `src/core/db/module-migrations.ts`
- Migrations run idempotently when a module is enabled via admin PATCH route (`applyModuleMigration`)

## Key Commands
- `pnpm dev` — Start development server
- `pnpm test` — Run unit tests
- `pnpm test:e2e` — Run E2E tests
- `pnpm build` — Production build
- `pnpm lint` — Lint code

## Conventions
- All API routes use `withTenantContext()` wrapper for auth + tenant resolution
- Zod schemas validate all input at API boundary
- Custom fields stored as JSONB, validated against `custom_field_definitions` table
- All mutations create audit log entries
- Soft deletes (`deleted_at` column) on all entity tables
- Sequence counters for auto-numbering (DSP-000001, PUR-000001, SAL-000001)
- Permission types: canPurchase, canDispatch, canReceive, canSale, canViewStock, canManageLocations, canManageCommodities, canManageContacts, canViewAnalytics, canExportData, canViewAuditLog, canManagePayments, canManageAlerts, canGenerateDocuments, canManageLots, canManageReturns, canImportData

## UI / Design System (WareOS)
- Theme: light Swiss-editorial — white backgrounds, `#F45F00` orange primary, black type
- Design tokens in `src/app/globals.css`: `--bg-base`, `--bg-off`, `--bg-ink`, `--accent-color` (`#F45F00`), `--accent-dark`, `--accent-tint`, text-primary/body/muted/dim, status colors (green/blue/red with 8% tints)
- **Token note**: `--accent-color: #F45F00` is the WareOS orange (not `--accent`, which shadcn/ui uses for the 6% tint)
- Layout tokens: `--header-h` (60px), `--sidebar-w` (240px), `--content-px` (28px)
- Mobile receive form: `src/components/mobile/mobile-receive-form.tsx` — card layout, inputMode, sticky submit button
- Responsive dual-form pattern on `/dispatches/[id]/receive`: mobile form (`block md:hidden`) + desktop form (`hidden md:block`)

## Visual Development & Testing

### Quick Visual Check (after every frontend change)

Before marking any UI task complete, run a quick visual check:

1. Ensure `pnpm dev` is running (`http://localhost:3000`)
2. Determine a valid `tenantSlug` (all routes are `/t/[tenantSlug]/...`)
3. Navigate to the affected route in the browser
4. Take a screenshot and verify against the 7 Non-Negotiable Rules in `.claude/context/design-principles.md`
5. Check at mobile (375px) if the change touches layout or forms
6. Open browser console — verify zero JS errors
7. Check for hardcoded hex colors in changed files (should use CSS tokens)

### `/design-review` Slash Command

For comprehensive reviews (major UI features, design system changes, pre-merge):

```
/design-review
```

This command auto-injects `git diff` context and invokes the `design-review` agent, which runs all 7 review phases: Preparation → User Flows → Responsiveness → Visual Polish → Accessibility → Robustness → Code Health.

The agent returns a structured report with screenshots, findings by severity (Blocker / High / Medium / Nitpick), and concrete fix suggestions.

### Playwright Tool Prefix

In this project, the correct Playwright MCP tool prefix is:
```
mcp__plugin_playwright_playwright__*
```
(NOT `mcp__playwright__*` — that prefix will fail.)

### When to Skip Visual Review

Skip visual checks for: backend-only changes (API routes, DB migrations, queries), config/env files, documentation, and pure test files.
