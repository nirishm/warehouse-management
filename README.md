# Warehouse Management SaaS

A multi-tenant, modular warehouse management system built for SaaS distribution.

## Features

- **Multi-Tenant**: Each customer gets isolated data via Postgres schema-per-tenant
- **Modular**: Enable/disable features per tenant (Inventory, Dispatch, Purchase, Sale, Analytics, Shortage Tracking, User Management, Audit Trail)
- **Custom Fields**: Tenants define custom fields on any entity (stored as JSONB)
- **Configurable Units**: Metric defaults + custom units per tenant
- **Role-Based Access**: Granular permissions per module per user
- **Real-Time**: Live updates via Supabase Realtime subscriptions
- **Admin Dashboards**: Super Admin (platform) + Tenant Admin (per-customer)

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL + Auth + Realtime)
- Tailwind CSS + shadcn/ui
- Zod validation
- Vitest + Playwright testing

## Getting Started

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
3. Install dependencies: `pnpm install`
4. Run migrations: `pnpm db:migrate`
5. Start development: `pnpm dev`

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
│   ├── (auth)/       # Login, register, forgot-password
│   ├── (platform)/   # Super admin dashboard
│   ├── t/[slug]/     # Tenant-scoped routes
│   └── api/          # API endpoints
├── core/             # Framework: auth, db, modules, permissions
├── modules/          # Feature modules (self-contained)
├── components/       # Shared UI components
└── lib/              # Utilities
```

## License

Proprietary — All rights reserved.
