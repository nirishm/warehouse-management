# Warehouse Management SaaS

## Project Overview
Multi-tenant SaaS Warehouse Management System built with Next.js 14 + Supabase.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL) with schema-per-tenant
- **Auth**: Supabase Auth (email/password)
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Testing**: Vitest (unit), Playwright (E2E)

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/core/` — Core framework (auth, db, modules, permissions)
- `src/modules/` — Feature modules (inventory, dispatch, purchase, sale, analytics, shortage, user-mgmt, audit)
- `src/components/` — Shared UI components
- `src/lib/` — Utilities and helpers
- `supabase/migrations/` — Database migrations

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
