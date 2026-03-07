# Warehouse Management SaaS — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant SaaS Warehouse Management System with a plugin/module architecture that can be sold on a monthly subscription basis.

**Architecture:** Next.js 14+ App Router for frontend and API routes, Supabase (Postgres + Auth + Realtime) for database and authentication. Schema-per-tenant isolation where each customer gets their own Postgres schema. A module registry pattern allows features (inventory, dispatch, purchase, sale, analytics, shortage tracking, user management, audit trail) to be enabled/disabled per tenant. Custom fields stored as JSONB on all entities.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres + Auth + Realtime + RLS), Tailwind CSS, shadcn/ui, Zod validation, Vitest for unit tests, Playwright for E2E.

---

## Context

The owner previously built a Firebase-based "Grain Tracker" app (vanilla JS + Firestore) for grain commodity tracking between warehouses. That app had limitations: NoSQL query constraints (2000-doc limit), client-side business logic, no multi-tenancy. This new system reimagines it as a production SaaS product with proper backend validation, relational DB, and plugin architecture.

**Key domain logic preserved from existing app:**
- Dispatch flow: origin → destination, with receipt confirmation and shortage/gain calculation
- Purchase flow: external supplier → warehouse (auto-received)
- Sale flow: warehouse → external customer (auto-received)
- Stock = Sum(received at location) - Sum(sent from location)
- Role-based access: admin vs employee with granular permissions
- Multi-location user assignment
- Transport details: vehicle number, driver name, driver phone

---

## Pre-requisites

Before starting implementation:
1. Create a Supabase project at https://supabase.com (free tier)
2. Note down: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Have Node.js 18+ and pnpm installed
4. The cloned reference repo is at `/tmp/ashu_project_review` (read-only reference)

---

## Phase 1: Project Foundation (Tasks 1-5)

### Task 1: Initialize Next.js Project & Git Repo

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.local.example`, `.gitignore`, `CLAUDE.md`, `README.md`, `docs/PRD.md`

**Step 1: Initialize the project**

```bash
cd "/Users/nirish/Library/CloudStorage/GoogleDrive-nirish.m2@gmail.com/My Drive/_Coding/Warehouse-Management"
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

**Step 2: Install core dependencies**

```bash
pnpm add @supabase/supabase-js @supabase/ssr zod lucide-react date-fns
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom @types/node
```

**Step 3: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init
# Choose: New York style, Zinc color, CSS variables: yes
pnpm dlx shadcn@latest add button card input label select table tabs dialog dropdown-menu badge separator toast form sheet command popover calendar
```

**Step 4: Create `.env.local.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 5: Create `.env.local`** (copy from example, fill in real values)

**Step 6: Create `CLAUDE.md`**

```markdown
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
```

**Step 7: Create `README.md`**

```markdown
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

\`\`\`
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
\`\`\`

## License

Proprietary — All rights reserved.
```

**Step 8: Create `docs/PRD.md`** (the full PRD from our design)

Write the PRD document covering: Product Vision, Target Users, User Stories by Module, Feature Requirements (P0/P1/P2), Non-Functional Requirements, Success Metrics, and Phases. Content is from our brainstorming session.

**Step 9: Move reference repo files into project**

```bash
# Copy the existing app's backend logic files for reference
mkdir -p docs/reference
cp /tmp/ashu_project_review/app/js/dispatch.js docs/reference/
cp /tmp/ashu_project_review/app/js/admin.js docs/reference/
cp /tmp/ashu_project_review/app/js/dashboard.js docs/reference/
cp /tmp/ashu_project_review/app/js/utils.js docs/reference/
cp /tmp/ashu_project_review/app/js/history.js docs/reference/
cp /tmp/ashu_project_review/app/firestore.rules docs/reference/
cp /tmp/ashu_project_review/directives/grain_tracker.md docs/reference/
```

**Step 10: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: initialize Next.js project with Supabase, shadcn/ui, and project docs"
```

---

### Task 2: Supabase Client Setup & Vitest Config

**Files:**
- Create: `src/lib/supabase/client.ts` (browser client)
- Create: `src/lib/supabase/server.ts` (server-side client with cookies)
- Create: `src/lib/supabase/admin.ts` (service role client for schema ops)
- Create: `src/lib/supabase/middleware.ts` (middleware helper)
- Create: `vitest.config.ts`
- Create: `src/lib/supabase/__tests__/client.test.ts`

**Step 1: Write test for Supabase client creation**

```typescript
// src/lib/supabase/__tests__/client.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('Supabase clients', () => {
  it('createBrowserClient returns a client', async () => {
    const { createBrowserClient } = await import('../client');
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
```

**Step 2: Configure Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom/vitest';
```

**Step 3: Implement Supabase clients**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient as createClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS. Used ONLY for:
// 1. Tenant schema provisioning
// 2. Schema-scoped queries via tenant context
export function createAdminClient(schema?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    schema ? { db: { schema } } : undefined
  );
}
```

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
```

**Step 4: Run tests**

```bash
pnpm test -- src/lib/supabase/__tests__/client.test.ts
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client setup (browser, server, admin, middleware)"
```

---

### Task 3: Public Schema — Tenants, Users, Super Admins

**Files:**
- Create: `supabase/migrations/00001_public_schema.sql`
- Create: `src/core/db/types.ts` (TypeScript types for public schema)

**Step 1: Write the public schema migration**

```sql
-- supabase/migrations/00001_public_schema.sql

-- Tenants (organizations/companies)
CREATE TABLE public.tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    schema_name     TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','trial','cancelled')),
    plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','starter','pro','enterprise')),
    billing_notes   TEXT,
    settings        JSONB NOT NULL DEFAULT '{}',
    enabled_modules TEXT[] NOT NULL DEFAULT ARRAY['inventory','user_management'],
    max_users       INT NOT NULL DEFAULT 5,
    max_locations   INT NOT NULL DEFAULT 3,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maps auth users to tenants (many-to-many)
CREATE TABLE public.user_tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'employee'
                    CHECK (role IN ('tenant_admin','manager','employee')),
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- Super admins (platform owners — you)
CREATE TABLE public.super_admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Module enablement per tenant
CREATE TABLE public.tenant_modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_id       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'enabled'
                    CHECK (status IN ('enabled','disabled','installing','error')),
    config          JSONB NOT NULL DEFAULT '{}',
    enabled_at      TIMESTAMPTZ DEFAULT now(),
    disabled_at     TIMESTAMPTZ,
    UNIQUE(tenant_id, module_id)
);

-- Indexes
CREATE INDEX idx_user_tenants_user ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON public.user_tenants(tenant_id);
CREATE INDEX idx_tenant_modules_tenant ON public.tenant_modules(tenant_id);

-- RLS on public tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- Policies: users see their own tenants
CREATE POLICY "Users view own tenants" ON public.tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Super admins manage tenants" ON public.tenants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Users see own memberships" ON public.user_tenants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins manage memberships" ON public.user_tenants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Super admins only" ON public.super_admins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Users view own tenant modules" ON public.tenant_modules
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Super admins manage modules" ON public.tenant_modules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Step 2: Write TypeScript types**

```typescript
// src/core/db/types.ts
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_notes: string | null;
  settings: Record<string, unknown>;
  enabled_modules: string[];
  max_users: number;
  max_locations: number;
  created_at: string;
  updated_at: string;
}

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'tenant_admin' | 'manager' | 'employee';
  is_default: boolean;
  created_at: string;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  created_at: string;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_id: string;
  status: 'enabled' | 'disabled' | 'installing' | 'error';
  config: Record<string, unknown>;
  enabled_at: string | null;
  disabled_at: string | null;
}
```

**Step 3: Apply migration to Supabase**

```bash
pnpm add -D supabase
pnpm supabase init
pnpm supabase db push
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add public schema migration (tenants, user_tenants, super_admins, tenant_modules)"
```

---

### Task 4: Tenant Schema Template & Provisioning

**Files:**
- Create: `supabase/migrations/00002_tenant_template.sql` (template DDL)
- Create: `src/core/db/tenant-provisioning.ts`
- Create: `src/core/db/tenant-query.ts`
- Create: `src/core/db/__tests__/tenant-query.test.ts`

**Step 1: Write tenant schema template**

This is the SQL template that gets executed for every new tenant. `{schema}` is replaced with the actual schema name.

```sql
-- supabase/migrations/00002_tenant_template.sql
-- NOTE: This is NOT auto-applied. It's a template used by tenant-provisioning.ts

-- Locations (warehouses, stores, yards)
CREATE TABLE {schema}.locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'warehouse'
                    CHECK (type IN ('warehouse','store','yard','external')),
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(code) WHERE deleted_at IS NULL
);

-- Commodities (products/items/grains)
CREATE TABLE {schema}.commodities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    description     TEXT,
    category        TEXT,
    default_unit_id UUID,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(code) WHERE deleted_at IS NULL
);

-- Units of measure
CREATE TABLE {schema}.units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    abbreviation    TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL DEFAULT 'weight'
                    CHECK (type IN ('weight','volume','count','length','custom')),
    base_unit_id    UUID REFERENCES {schema}.units(id),
    conversion_factor NUMERIC,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts (suppliers and customers)
CREATE TABLE {schema}.contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('supplier','customer','both')),
    email           TEXT,
    phone           TEXT,
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Dispatches (inter-location movements)
CREATE TABLE {schema}.dispatches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number     TEXT NOT NULL UNIQUE,
    origin_location_id  UUID NOT NULL REFERENCES {schema}.locations(id),
    dest_location_id    UUID NOT NULL REFERENCES {schema}.locations(id),
    status              TEXT NOT NULL DEFAULT 'dispatched'
                        CHECK (status IN ('draft','dispatched','in_transit','received','cancelled')),
    dispatched_at       TIMESTAMPTZ,
    received_at         TIMESTAMPTZ,
    dispatched_by       UUID NOT NULL,
    received_by         UUID,
    transporter_name    TEXT,
    vehicle_number      TEXT,
    driver_name         TEXT,
    driver_phone        TEXT,
    notes               TEXT,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CHECK (origin_location_id != dest_location_id)
);

-- Dispatch line items (multi-commodity per dispatch)
CREATE TABLE {schema}.dispatch_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id         UUID NOT NULL REFERENCES {schema}.dispatches(id) ON DELETE CASCADE,
    commodity_id        UUID NOT NULL REFERENCES {schema}.commodities(id),
    unit_id             UUID NOT NULL REFERENCES {schema}.units(id),
    sent_quantity       NUMERIC NOT NULL CHECK (sent_quantity > 0),
    sent_bags           INT,
    received_quantity   NUMERIC,
    received_bags       INT,
    shortage            NUMERIC GENERATED ALWAYS AS (
                            CASE WHEN received_quantity IS NOT NULL
                            THEN sent_quantity - received_quantity
                            ELSE NULL END
                        ) STORED,
    shortage_percent    NUMERIC GENERATED ALWAYS AS (
                            CASE WHEN received_quantity IS NOT NULL AND sent_quantity > 0
                            THEN ROUND(((sent_quantity - received_quantity) / sent_quantity) * 100, 2)
                            ELSE NULL END
                        ) STORED,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchases (inbound from suppliers)
CREATE TABLE {schema}.purchases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number     TEXT NOT NULL UNIQUE,
    contact_id          UUID REFERENCES {schema}.contacts(id),
    location_id         UUID NOT NULL REFERENCES {schema}.locations(id),
    status              TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('draft','ordered','received','cancelled')),
    received_at         TIMESTAMPTZ DEFAULT now(),
    created_by          UUID NOT NULL,
    transporter_name    TEXT,
    vehicle_number      TEXT,
    driver_name         TEXT,
    driver_phone        TEXT,
    notes               TEXT,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- Purchase line items
CREATE TABLE {schema}.purchase_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id         UUID NOT NULL REFERENCES {schema}.purchases(id) ON DELETE CASCADE,
    commodity_id        UUID NOT NULL REFERENCES {schema}.commodities(id),
    unit_id             UUID NOT NULL REFERENCES {schema}.units(id),
    quantity            NUMERIC NOT NULL CHECK (quantity > 0),
    bags                INT,
    unit_price          NUMERIC,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales (outbound to customers)
CREATE TABLE {schema}.sales (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number         TEXT NOT NULL UNIQUE,
    contact_id          UUID REFERENCES {schema}.contacts(id),
    location_id         UUID NOT NULL REFERENCES {schema}.locations(id),
    status              TEXT NOT NULL DEFAULT 'confirmed'
                        CHECK (status IN ('draft','confirmed','dispatched','cancelled')),
    sold_at             TIMESTAMPTZ DEFAULT now(),
    created_by          UUID NOT NULL,
    transporter_name    TEXT,
    vehicle_number      TEXT,
    driver_name         TEXT,
    driver_phone        TEXT,
    notes               TEXT,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- Sale line items
CREATE TABLE {schema}.sale_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id             UUID NOT NULL REFERENCES {schema}.sales(id) ON DELETE CASCADE,
    commodity_id        UUID NOT NULL REFERENCES {schema}.commodities(id),
    unit_id             UUID NOT NULL REFERENCES {schema}.units(id),
    quantity            NUMERIC NOT NULL CHECK (quantity > 0),
    bags                INT,
    unit_price          NUMERIC,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (tenant-specific)
CREATE TABLE {schema}.user_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE,
    display_name        TEXT NOT NULL,
    phone               TEXT,
    permissions         JSONB NOT NULL DEFAULT '{
        "canPurchase": false,
        "canDispatch": false,
        "canReceive": false,
        "canSale": false,
        "canViewStock": true,
        "canManageLocations": false,
        "canManageCommodities": false,
        "canManageContacts": false,
        "canViewAnalytics": false,
        "canExportData": false,
        "canViewAuditLog": false
    }',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-location assignments
CREATE TABLE {schema}.user_locations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    location_id         UUID NOT NULL REFERENCES {schema}.locations(id),
    UNIQUE(user_id, location_id)
);

-- Custom field definitions
CREATE TABLE {schema}.custom_field_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         TEXT NOT NULL
                        CHECK (entity_type IN (
                            'dispatch','purchase','sale','commodity','location','contact',
                            'dispatch_item','purchase_item','sale_item'
                        )),
    field_key           TEXT NOT NULL,
    field_label         TEXT NOT NULL,
    field_type          TEXT NOT NULL
                        CHECK (field_type IN ('text','number','date','boolean','select','multiselect')),
    options             JSONB,
    is_required         BOOLEAN NOT NULL DEFAULT false,
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, field_key)
);

-- Audit log (append-only)
CREATE TABLE {schema}.audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID,
    user_name           TEXT,
    action              TEXT NOT NULL,
    entity_type         TEXT NOT NULL,
    entity_id           UUID,
    old_data            JSONB,
    new_data            JSONB,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence counters
CREATE TABLE {schema}.sequence_counters (
    id                  TEXT PRIMARY KEY,
    prefix              TEXT NOT NULL,
    current_value       BIGINT NOT NULL DEFAULT 0
);

-- Stock levels view
CREATE VIEW {schema}.stock_levels AS
WITH inbound AS (
    SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
           COALESCE(di.received_quantity, di.sent_quantity) AS quantity
    FROM {schema}.dispatch_items di
    JOIN {schema}.dispatches d ON d.id = di.dispatch_id
    WHERE d.status = 'received' AND d.deleted_at IS NULL

    UNION ALL

    SELECT pi.commodity_id, p.location_id, pi.unit_id, pi.quantity
    FROM {schema}.purchase_items pi
    JOIN {schema}.purchases p ON p.id = pi.purchase_id
    WHERE p.status = 'received' AND p.deleted_at IS NULL
),
outbound AS (
    SELECT di.commodity_id, d.origin_location_id AS location_id, di.unit_id,
           di.sent_quantity AS quantity
    FROM {schema}.dispatch_items di
    JOIN {schema}.dispatches d ON d.id = di.dispatch_id
    WHERE d.status IN ('dispatched','in_transit','received') AND d.deleted_at IS NULL

    UNION ALL

    SELECT si.commodity_id, s.location_id, si.unit_id, si.quantity
    FROM {schema}.sale_items si
    JOIN {schema}.sales s ON s.id = si.sale_id
    WHERE s.status IN ('confirmed','dispatched') AND s.deleted_at IS NULL
),
in_transit AS (
    SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
           di.sent_quantity AS quantity
    FROM {schema}.dispatch_items di
    JOIN {schema}.dispatches d ON d.id = di.dispatch_id
    WHERE d.status IN ('dispatched','in_transit') AND d.deleted_at IS NULL
)
SELECT
    COALESCE(i.commodity_id, o.commodity_id) AS commodity_id,
    COALESCE(i.location_id, o.location_id) AS location_id,
    COALESCE(i.unit_id, o.unit_id) AS unit_id,
    COALESCE(i.total_in, 0) AS total_in,
    COALESCE(o.total_out, 0) AS total_out,
    COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0) AS current_stock,
    COALESCE(t.in_transit, 0) AS in_transit
FROM (
    SELECT commodity_id, location_id, unit_id, SUM(quantity) AS total_in
    FROM inbound GROUP BY commodity_id, location_id, unit_id
) i
FULL OUTER JOIN (
    SELECT commodity_id, location_id, unit_id, SUM(quantity) AS total_out
    FROM outbound GROUP BY commodity_id, location_id, unit_id
) o ON i.commodity_id = o.commodity_id AND i.location_id = o.location_id AND i.unit_id = o.unit_id
LEFT JOIN (
    SELECT commodity_id, location_id, unit_id, SUM(quantity) AS in_transit
    FROM in_transit GROUP BY commodity_id, location_id, unit_id
) t ON COALESCE(i.commodity_id, o.commodity_id) = t.commodity_id
   AND COALESCE(i.location_id, o.location_id) = t.location_id
   AND COALESCE(i.unit_id, o.unit_id) = t.unit_id;

-- Indexes
CREATE INDEX idx_dispatches_status ON {schema}.dispatches(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatches_origin ON {schema}.dispatches(origin_location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatches_dest ON {schema}.dispatches(dest_location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatches_date ON {schema}.dispatches(dispatched_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatch_items_dispatch ON {schema}.dispatch_items(dispatch_id);
CREATE INDEX idx_purchases_location ON {schema}.purchases(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_location ON {schema}.sales(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_log_entity ON {schema}.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON {schema}.audit_log(created_at DESC);
CREATE INDEX idx_user_locations_user ON {schema}.user_locations(user_id);

-- Seed default units
INSERT INTO {schema}.units (name, abbreviation, type, is_default) VALUES
    ('Kilogram', 'kg', 'weight', true),
    ('Metric Ton', 'MT', 'weight', false),
    ('Quintal', 'qtl', 'weight', false),
    ('Gram', 'g', 'weight', false),
    ('Litre', 'L', 'volume', false),
    ('Piece', 'pc', 'count', false),
    ('Bag', 'bag', 'count', false),
    ('Box', 'box', 'count', false);

-- Seed sequence counters
INSERT INTO {schema}.sequence_counters (id, prefix, current_value) VALUES
    ('dispatch', 'DSP', 0),
    ('purchase', 'PUR', 0),
    ('sale', 'SAL', 0);

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.locations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.commodities
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.dispatches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.purchases
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.sales
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Step 2: Write tenant provisioning logic**

```typescript
// src/core/db/tenant-provisioning.ts
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export async function provisionTenantSchema(tenantSlug: string): Promise<string> {
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`;
  const admin = createAdminClient();

  // Read template and replace {schema} placeholder
  const templatePath = path.join(process.cwd(), 'supabase/migrations/00002_tenant_template.sql');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const sql = template.replace(/{schema}/g, schemaName);

  // Create schema and run template
  const { error: schemaError } = await admin.rpc('exec_sql', {
    query: `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`
  });
  if (schemaError) throw new Error(`Failed to create schema: ${schemaError.message}`);

  const { error: templateError } = await admin.rpc('exec_sql', { query: sql });
  if (templateError) throw new Error(`Failed to provision tenant: ${templateError.message}`);

  return schemaName;
}
```

**Step 3: Write tenant query helper**

```typescript
// src/core/db/tenant-query.ts
import { createAdminClient } from '@/lib/supabase/admin';

export function createTenantClient(schemaName: string) {
  return createAdminClient(schemaName);
}

// Get next sequence number atomically
export async function getNextSequenceNumber(
  schemaName: string,
  sequenceId: string
): Promise<string> {
  const client = createAdminClient();
  const { data, error } = await client.rpc('exec_sql', {
    query: `
      UPDATE "${schemaName}".sequence_counters
      SET current_value = current_value + 1
      WHERE id = '${sequenceId}'
      RETURNING prefix || '-' || LPAD(current_value::TEXT, 6, '0') AS formatted_number;
    `
  });
  if (error) throw new Error(`Sequence error: ${error.message}`);
  return data?.[0]?.formatted_number;
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add tenant schema template and provisioning logic"
```

---

### Task 5: Auth Middleware & Tenant Resolution

**Files:**
- Create: `src/middleware.ts`
- Create: `src/core/auth/types.ts`
- Create: `src/core/auth/guards.ts`

**Step 1: Write middleware**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/auth/callback'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Public routes
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
    if (user) return NextResponse.redirect(new URL('/', request.url));
    return response;
  }

  // Require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Super admin routes
  if (path.startsWith('/admin')) {
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!superAdmin) return NextResponse.redirect(new URL('/', request.url));
    return response;
  }

  // Tenant routes — resolve tenant from URL
  const tenantMatch = path.match(/^\/t\/([^/]+)/);
  if (tenantMatch) {
    const slug = tenantMatch[1];
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, schema_name, status, enabled_modules')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!tenant) return NextResponse.redirect(new URL('/', request.url));

    const { data: membership } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single();

    if (!membership) return NextResponse.redirect(new URL('/', request.url));

    // Pass tenant context via headers
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-schema', tenant.schema_name);
    response.headers.set('x-tenant-role', membership.role);
    response.headers.set('x-tenant-modules', JSON.stringify(tenant.enabled_modules));
    return response;
  }

  // Root: redirect to default tenant
  if (path === '/') {
    const { data: memberships } = await supabase
      .from('user_tenants')
      .select('tenant_id, is_default, tenants(slug)')
      .eq('user_id', user.id);

    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (superAdmin) return NextResponse.redirect(new URL('/admin', request.url));

    if (!memberships?.length) return NextResponse.redirect(new URL('/no-tenant', request.url));
    const defaultTenant = memberships.find(m => m.is_default) || memberships[0];
    const tenantData = defaultTenant.tenants as unknown as { slug: string };
    return NextResponse.redirect(new URL(`/t/${tenantData.slug}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

**Step 2: Write auth types and guards**

```typescript
// src/core/auth/types.ts
export type Permission =
  | 'canPurchase' | 'canDispatch' | 'canReceive' | 'canSale'
  | 'canViewStock' | 'canManageLocations' | 'canManageCommodities'
  | 'canManageContacts' | 'canViewAnalytics' | 'canExportData'
  | 'canViewAuditLog';

export interface TenantContext {
  tenantId: string;
  schemaName: string;
  role: 'tenant_admin' | 'manager' | 'employee';
  enabledModules: string[];
  userId: string;
  permissions: Record<Permission, boolean>;
}
```

```typescript
// src/core/auth/guards.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { TenantContext, Permission } from './types';

export async function withTenantContext(
  request: NextRequest,
  handler: (ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const schemaName = request.headers.get('x-tenant-schema');
    const role = request.headers.get('x-tenant-role') as TenantContext['role'];
    const enabledModules = JSON.parse(request.headers.get('x-tenant-modules') || '[]');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!tenantId || !schemaName || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load permissions from tenant schema
    const tenantClient = createTenantClient(schemaName);
    const { data: profile } = await tenantClient
      .from('user_profiles')
      .select('permissions')
      .eq('user_id', user.id)
      .single();

    const permissions = (profile?.permissions ?? {}) as Record<Permission, boolean>;

    // Tenant admins get all permissions
    if (role === 'tenant_admin') {
      Object.keys(permissions).forEach(k => {
        (permissions as Record<string, boolean>)[k] = true;
      });
    }

    return handler({
      tenantId, schemaName, role, enabledModules,
      userId: user.id, permissions,
    });
  } catch (error) {
    console.error('Tenant context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (ctx.role === 'tenant_admin') return;
  if (!ctx.permissions[permission]) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export function requireModule(ctx: TenantContext, moduleId: string): void {
  if (!ctx.enabledModules.includes(moduleId)) {
    throw new Error(`Module not enabled: ${moduleId}`);
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add auth middleware with tenant resolution and permission guards"
```

---

## Phase 2: Module System (Tasks 6-7)

### Task 6: Module Registry & Loader

**Files:**
- Create: `src/core/modules/types.ts`
- Create: `src/core/modules/registry.ts`
- Create: `src/core/modules/__tests__/registry.test.ts`

**Step 1: Write module types**

```typescript
// src/core/modules/types.ts
export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  dependencies: string[];
  permissions: string[];
  navItems: ModuleNavItem[];
}

export interface ModuleNavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
}
```

**Step 2: Write failing test**

```typescript
// src/core/modules/__tests__/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from '../registry';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  it('registers and retrieves a module', () => {
    registry.register({
      id: 'inventory', name: 'Inventory', description: 'Track stock',
      icon: 'Package', dependencies: [], permissions: ['canViewStock'],
      navItems: [{ label: 'Stock', href: 'inventory', icon: 'Package' }],
    });
    expect(registry.get('inventory')).toBeDefined();
    expect(registry.get('inventory')!.name).toBe('Inventory');
  });

  it('returns enabled modules respecting dependencies', () => {
    registry.register({
      id: 'inventory', name: 'Inventory', description: '', icon: 'Package',
      dependencies: [], permissions: [], navItems: [],
    });
    registry.register({
      id: 'dispatch', name: 'Dispatch', description: '', icon: 'Truck',
      dependencies: ['inventory'], permissions: [], navItems: [],
    });

    const enabled = registry.getEnabledModules(['inventory', 'dispatch']);
    expect(enabled).toHaveLength(2);

    const partial = registry.getEnabledModules(['dispatch']);
    expect(partial).toHaveLength(0);
  });

  it('builds nav items filtered by permissions', () => {
    registry.register({
      id: 'inventory', name: 'Inventory', description: '', icon: 'Package',
      dependencies: [], permissions: [],
      navItems: [
        { label: 'Stock', href: 'inventory', icon: 'Package', permission: 'canViewStock' },
        { label: 'Locations', href: 'locations', icon: 'MapPin', permission: 'canManageLocations' },
      ],
    });

    const navItems = registry.getNavItems(
      ['inventory'],
      { canViewStock: true, canManageLocations: false } as Record<string, boolean>
    );
    expect(navItems).toHaveLength(1);
    expect(navItems[0].label).toBe('Stock');
  });
});
```

**Step 3: Run test, verify fail, implement, verify pass**

```typescript
// src/core/modules/registry.ts
import { ModuleManifest, ModuleNavItem } from './types';

export class ModuleRegistry {
  private modules = new Map<string, ModuleManifest>();

  register(mod: ModuleManifest): void {
    this.modules.set(mod.id, mod);
  }

  get(id: string): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  getAll(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }

  getEnabledModules(enabledIds: string[]): ModuleManifest[] {
    return enabledIds
      .map(id => this.modules.get(id))
      .filter((mod): mod is ModuleManifest => {
        if (!mod) return false;
        return mod.dependencies.every(dep => enabledIds.includes(dep));
      });
  }

  getNavItems(enabledIds: string[], permissions: Record<string, boolean>): ModuleNavItem[] {
    return this.getEnabledModules(enabledIds)
      .flatMap(mod => mod.navItems)
      .filter(item => !item.permission || permissions[item.permission]);
  }

  getDependents(moduleId: string): string[] {
    return this.getAll()
      .filter(mod => mod.dependencies.includes(moduleId))
      .map(mod => mod.id);
  }
}

export const moduleRegistry = new ModuleRegistry();
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add module registry with dependency resolution"
```

---

### Task 7: Register All 8 Modules

**Files:**
- Create: `src/modules/inventory/manifest.ts`
- Create: `src/modules/dispatch/manifest.ts`
- Create: `src/modules/purchase/manifest.ts`
- Create: `src/modules/sale/manifest.ts`
- Create: `src/modules/analytics/manifest.ts`
- Create: `src/modules/shortage-tracking/manifest.ts`
- Create: `src/modules/user-management/manifest.ts`
- Create: `src/modules/audit-trail/manifest.ts`
- Create: `src/modules/index.ts`

Create all 8 module manifests with dependency graph:
- `inventory` → no deps (base)
- `user_management` → no deps (base)
- `audit_trail` → no deps
- `dispatch` → depends on `inventory`
- `purchase` → depends on `inventory`
- `sale` → depends on `inventory`
- `analytics` → depends on `inventory`
- `shortage_tracking` → depends on `inventory`, `dispatch`

**Commit:**
```bash
git add -A
git commit -m "feat: register all 8 module manifests with dependency graph"
```

---

## Phase 3: Auth Pages & Tenant Onboarding (Tasks 8-10)

### Task 8: Login & Register Pages

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/auth/callback/route.ts`

Standard Supabase email/password auth with shadcn/ui forms.

### Task 9: Super Admin Dashboard — Tenant Management

**Files:**
- Create: `src/app/(platform)/layout.tsx`
- Create: `src/app/(platform)/admin/page.tsx`
- Create: `src/app/(platform)/admin/tenants/page.tsx`
- Create: `src/app/(platform)/admin/tenants/new/page.tsx`
- Create: `src/app/(platform)/admin/tenants/[id]/page.tsx`
- Create: `src/app/api/admin/tenants/route.ts`
- Create: `src/app/api/admin/tenants/[id]/route.ts`
- Create: `src/app/api/admin/tenants/[id]/provision/route.ts`

Super admin can: create tenants, provision schemas, enable/disable modules, manage subscriptions.

### Task 10: Tenant Onboarding — First Admin Setup

**Files:**
- Create: `src/app/api/admin/tenants/[id]/invite/route.ts`

Invite first tenant admin via email. First-time setup wizard for tenant admin.

---

## Phase 4: Tenant Dashboard & Core Modules (Tasks 11-17)

### Task 11: Tenant Layout & Navigation

**Files:**
- Create: `src/app/t/[tenantSlug]/layout.tsx`
- Create: `src/app/t/[tenantSlug]/page.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/tenant-provider.tsx`
- Create: `src/components/modules/module-gate.tsx`

Dynamic sidebar based on enabled modules and user permissions.

### Task 12: Inventory Module — Locations CRUD

**Files:** `src/app/t/[tenantSlug]/settings/locations/`, `src/app/api/t/[tenantSlug]/locations/`, `src/modules/inventory/queries/locations.ts`, `src/modules/inventory/validations/location.ts`

### Task 13: Inventory Module — Commodities CRUD

**Files:** `src/app/t/[tenantSlug]/settings/commodities/`, `src/app/api/t/[tenantSlug]/commodities/`, `src/modules/inventory/queries/commodities.ts`

### Task 14: Inventory Module — Stock Levels View

**Files:** `src/app/t/[tenantSlug]/inventory/`, `src/app/api/t/[tenantSlug]/inventory/`, `src/modules/inventory/queries/stock.ts`

### Task 15: Dispatch Module — Create & List

**Files:** `src/app/t/[tenantSlug]/dispatches/`, `src/app/api/t/[tenantSlug]/dispatches/`, `src/modules/dispatch/`

### Task 16: Dispatch Module — Receive Flow

**Files:** `src/app/t/[tenantSlug]/dispatches/[id]/receive/`, `src/app/api/t/[tenantSlug]/dispatches/[id]/receive/`

### Task 17: Purchase & Sale Modules

**Files:** `src/app/t/[tenantSlug]/purchases/`, `src/app/t/[tenantSlug]/sales/`, corresponding API routes and module logic.

---

## Phase 5: Advanced Modules (Tasks 18-21)

### Task 18: User Management Module
### Task 19: Audit Trail Module
### Task 20: Analytics Module
### Task 21: Shortage Tracking Module

---

## Phase 6: Custom Fields & Tenant Settings (Tasks 22-24)

### Task 22: Custom Fields System
### Task 23: Contacts Management
### Task 24: Tenant Settings & Module Configuration

---

## Phase 7: Polish & Deploy (Tasks 25-27)

### Task 25: Realtime Subscriptions
### Task 26: Responsive Design & UX Polish
### Task 27: Deploy to Vercel + Supabase

---

## Verification Plan

After each phase, verify:

1. **Phase 1**: `pnpm dev` starts, Supabase client connects, migration runs successfully
2. **Phase 2**: Module registry tests pass, all 8 modules registered
3. **Phase 3**: Can login, super admin can create and provision a tenant
4. **Phase 4**: Can create locations, commodities, dispatches. Stock levels calculate correctly. Receive flow works with shortage calc.
5. **Phase 5**: User management, audit trail, analytics, and shortage tracking all functional
6. **Phase 6**: Custom fields render dynamically and validate correctly
7. **Phase 7**: Realtime works, deployed and accessible at production URL

**End-to-end test scenario:**
1. Super admin creates tenant "Acme Grain Corp" with slug `acme-grain`
2. Super admin provisions schema and enables all modules
3. Super admin invites tenant admin
4. Tenant admin logs in, creates locations (Warehouse A, Warehouse B)
5. Tenant admin creates commodities (Wheat, Rice)
6. Tenant admin creates employees with location assignments
7. Employee at Warehouse A creates dispatch to Warehouse B (100 qtl wheat)
8. Employee at Warehouse B receives dispatch (98 qtl → 2% shortage)
9. Stock levels show: Warehouse A = -100, Warehouse B = +98
10. Analytics dashboard shows route summary with shortage data
11. Audit trail logs all actions
