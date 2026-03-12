# WareOS v2 — Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build WareOS v2 Phase 1 MVP from scratch — a multi-tenant inventory & warehouse management SaaS with 6 core modules + 5 lite modules, using Drizzle ORM, shared-schema + RLS, JWT middleware, and Inngest background jobs.

**Architecture:** Shared-schema multi-tenancy with `tenant_id` + RLS on every table. JWT-only middleware (zero DB hits). Drizzle ORM for type-safe queries. Inngest for background jobs and inter-module event bus. Upstash Redis for rate limiting and JWT blocklist. API versioned at `/api/v1/`.

**Tech Stack:** Next.js 15, TypeScript strict, Drizzle ORM, Supabase (Postgres + Auth + Realtime), Inngest, Upstash Redis, Tailwind CSS v4, shadcn/ui, TanStack Table v8, Zod v4, Recharts, Vitest, Playwright.

**Reference Documents:**
- `blueprint/wareos_v2_final_part{1,2,3}.md` — architecture spec
- `.claude/context/design_reference.html` — UI component spec (source of truth)
- `.claude/context/design-principles.md` — 7 non-negotiable design rules
- `v1-archive/` — stock_levels VIEW logic, state machines, existing patterns
- `CLAUDE.md` — critical rules (never break these)

---

## Phase Overview (MVP = Sub-Plans 1–5)

| Sub-Plan | Name | Scope | Demo-able After |
|---|---|---|---|
| **1** | Foundation | Project init, Drizzle schema, RLS, auth, JWT middleware, tenant scoping | Login works, DB created, health route echoes tenant context |
| **2** | Inventory + Design Shell | Module registry, design system, layout, Items/Locations/Units/Contacts CRUD, stock_levels VIEW | Full inventory CRUD with working UI, sidebar navigation |
| **3** | Transactions | Purchase, Sale, Transfer, Adjustments + shortage tracking | Complete inventory loop: buy → sell → transfer → adjust → stock updates |
| **4** | Users + Lite Modules | User management, RBAC, audit trail, stock alerts, analytics dashboard, payments, admin panel | Role-based access, dashboard KPIs, audit log, alerts |
| **5** | Polish + Production | PWA, rate limiting, realtime, keyboard shortcuts, E2E tests, CI/CD, deploy | Production-ready MVP on Vercel |

---

## Sub-Plan 1: Foundation

**Goal:** Project scaffolding, database schema, auth, middleware, and core utilities. Everything subsequent sub-plans depend on.

### File Structure (created in this sub-plan)

```
package.json
tsconfig.json
next.config.ts
drizzle.config.ts
postcss.config.mjs
tailwind.config.ts (if needed beyond v4 defaults)
src/
  app/
    layout.tsx                         # Root layout (fonts, metadata)
    globals.css                        # Design tokens from design_reference.html
    page.tsx                           # Landing redirect
    (auth)/
      layout.tsx
      login/page.tsx
      register/page.tsx
      reset-password/page.tsx
      set-password/page.tsx
    auth/callback/route.ts             # PKCE exchange
    api/
      v1/
        health/route.ts                # Echo tenant context (dev tool)
      inngest/route.ts                 # Inngest serve handler
  middleware.ts                        # JWT-only, zero DB hits
  core/
    db/
      drizzle.ts                       # Drizzle client init (Supabase Postgres)
      schema/
        public.ts                      # tenants, user_tenants, super_admins
        items.ts                       # items table
        locations.ts                   # locations table
        units.ts                       # units table
        contacts.ts                    # contacts table
        sales.ts                       # sales, sale_items
        purchases.ts                   # purchases, purchase_items
        transfers.ts                   # transfers, transfer_items
        adjustments.ts                 # adjustments, adjustment_items
        user-profiles.ts               # user_profiles, user_locations
        audit-log.ts                   # audit_log
        sequence-counters.ts           # sequence_counters
        alert-thresholds.ts            # alert_thresholds
        payments.ts                    # payments
        custom-fields.ts               # custom_field_definitions
        index.ts                       # Re-export all schemas
      tenant-scope.ts                  # withTenantScope(db, tenantId) utility
      stock-levels.ts                  # stock_levels VIEW SQL
    auth/
      session.ts                       # JWT decode + types
      guards.ts                        # withTenantContext() API wrapper
      permissions.ts                   # Role hierarchy, permission checks
      types.ts                         # AppJwtPayload, TenantContext
    api/
      error-handler.ts                 # Standardized error responses
    events/
      types.ts                         # Inngest typed events
  inngest/
    client.ts                          # Inngest client init
  lib/
    supabase/
      client.ts                        # Browser Supabase client
      server.ts                        # Server Supabase client
      middleware.ts                     # Middleware Supabase client
      admin.ts                         # Service role client
    utils.ts                           # cn() utility
supabase/
  migrations/
    0001_initial_schema.sql            # All tables + RLS + indexes + stock_levels VIEW
```

### Task 1.1: Project Initialization

**Files:** Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `drizzle.config.ts`

- [ ] **Step 1:** Initialize Next.js 15 project with pnpm

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

- [ ] **Step 2:** Install core dependencies

```bash
# ORM + DB
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Supabase
pnpm add @supabase/supabase-js @supabase/ssr

# Auth
pnpm add jose                         # JWT decode (lightweight, edge-compatible)

# Validation
pnpm add zod

# Background jobs
pnpm add inngest

# Cache
pnpm add @upstash/redis @upstash/ratelimit

# UI (add more in Sub-Plan 2)
pnpm add tailwindcss @tailwindcss/postcss

# Utils
pnpm add clsx tailwind-merge

# Testing
pnpm add -D vitest @vitejs/plugin-react
```

- [ ] **Step 3:** Configure `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
});
```

- [ ] **Step 4:** Configure `next.config.ts` (server-only env, Inngest)

- [ ] **Step 5:** Verify `pnpm dev` starts

---

### Task 1.2: Drizzle Schema — Public Tables

**Files:** Create: `src/core/db/schema/public.ts`

- [ ] **Step 1:** Write failing test — `tenants` table has required columns

- [ ] **Step 2:** Define `tenants`, `userTenants`, `superAdmins` tables

```typescript
// src/core/db/schema/public.ts
import { pgTable, uuid, text, boolean, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status').notNull().default('active'),  // active | suspended | archived
  enabledModules: jsonb('enabled_modules').notNull().default(['inventory']),
  plan: text('plan').notNull().default('free'),        // free | starter | professional | enterprise
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userTenants = pgTable('user_tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  role: text('role').notNull().default('member'),       // owner | admin | manager | operator | viewer
  isDefault: boolean('is_default').notNull().default(false),
}, (table) => ({
  uniqueUserTenant: uniqueIndex('idx_user_tenant').on(table.userId, table.tenantId),
}));

export const superAdmins = pgTable('super_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
});
```

- [ ] **Step 3:** Run test, verify pass

---

### Task 1.3: Drizzle Schema — Core Entity Tables

**Files:** Create: `src/core/db/schema/items.ts`, `locations.ts`, `units.ts`, `contacts.ts`, `custom-fields.ts`

- [ ] **Step 1:** Define `items` table (blueprint Section 6.2)

Key columns: id, tenant_id, name, code, sku, description, category, type (goods|service|composite), default_unit_id, purchase_price, selling_price, hsn_code, image_url, tags[], reorder_level, shelf_life_days, is_active, custom_fields JSONB, timestamps, deleted_at.

Unique index: `(tenant_id, code) WHERE deleted_at IS NULL`

- [ ] **Step 2:** Define `locations` table

Key columns: id, tenant_id, name, code, type (warehouse|store|yard|external), address, geo_point JSONB, capacity, parent_location_id (self-ref), is_active, timestamps, deleted_at.

- [ ] **Step 3:** Define `units` table

Key columns: id, tenant_id, name, abbreviation, type (weight|volume|length|count|area), base_unit_id (self-ref), conversion_factor, timestamps, deleted_at.

- [ ] **Step 4:** Define `contacts` table

Key columns: id, tenant_id, name, type (supplier|customer|both), email, phone, gst_number, address, credit_limit, payment_terms, custom_fields JSONB, is_active, timestamps, deleted_at.

- [ ] **Step 5:** Define `customFieldDefinitions` table

Key columns: id, tenant_id, entity_type (item|contact|sale|purchase|transfer), field_name, field_type (text|number|date|boolean|select), options JSONB, is_required, sort_order.

---

### Task 1.4: Drizzle Schema — Transaction Tables

**Files:** Create: `src/core/db/schema/sales.ts`, `purchases.ts`, `transfers.ts`, `adjustments.ts`

- [ ] **Step 1:** Define `sales` + `saleItems` tables

`sales`: id, tenant_id, sale_number, contact_id → contacts, location_id → locations, status (draft|confirmed|dispatched|cancelled), shipping_address, tracking_number, custom_status, notes, custom_fields, timestamps, deleted_at.

`saleItems`: id, sale_id → sales, item_id → items, unit_id → units, quantity, unit_price.

- [ ] **Step 2:** Define `purchases` + `purchaseItems` tables

`purchases`: id, tenant_id, purchase_number, contact_id, location_id, status (draft|ordered|received|cancelled), expected_delivery_date, notes, custom_fields, timestamps, deleted_at.

`purchaseItems`: id, purchase_id → purchases, item_id → items, unit_id → units, quantity, unit_price.

- [ ] **Step 3:** Define `transfers` + `transferItems` tables

`transfers`: id, tenant_id, transfer_number, origin_location_id → locations, dest_location_id → locations, status (draft|dispatched|in_transit|received), notes, timestamps, deleted_at.

`transferItems`: id, transfer_id → transfers, item_id → items, unit_id → units, sent_qty, received_qty, shortage (GENERATED ALWAYS AS sent_qty - COALESCE(received_qty, 0) STORED).

- [ ] **Step 4:** Define `adjustments` + `adjustmentItems` tables

`adjustments`: id, tenant_id, adjustment_number, location_id → locations, reason, type (qty|value), status (draft|approved), notes, timestamps, deleted_at.

`adjustmentItems`: id, adjustment_id → adjustments, item_id → items, unit_id → units, qty_change, value_change.

---

### Task 1.5: Drizzle Schema — Supporting Tables

**Files:** Create: `src/core/db/schema/user-profiles.ts`, `audit-log.ts`, `sequence-counters.ts`, `alert-thresholds.ts`, `payments.ts`

- [ ] **Step 1:** Define `userProfiles` + `userLocations`

`userProfiles`: id, tenant_id, user_id, display_name, phone, permissions JSONB, timestamps.
`userLocations`: id, user_id, tenant_id, location_id → locations.

- [ ] **Step 2:** Define `auditLog` (append-only)

Columns: id, tenant_id, user_id, action (create|update|delete|status_change), entity_type, entity_id, old_data JSONB, new_data JSONB, created_at.

- [ ] **Step 3:** Define `sequenceCounters`

Columns: id, tenant_id, sequence_id (e.g., 'SAL', 'PUR', 'TFR', 'ADJ'), current_value INT, prefix TEXT.

- [ ] **Step 4:** Define `alertThresholds`

Columns: id, tenant_id, item_id → items, location_id → locations, min_quantity, timestamps.

- [ ] **Step 5:** Define `payments`

Columns: id, tenant_id, payment_number, type (purchase|sale), reference_id (purchase or sale UUID), amount, payment_method, payment_date, notes, timestamps, deleted_at.

- [ ] **Step 6:** Create `src/core/db/schema/index.ts` — re-export all tables

---

### Task 1.6: Drizzle Client + Tenant Scope Utility

**Files:** Create: `src/core/db/drizzle.ts`, `src/core/db/tenant-scope.ts`

- [ ] **Step 1:** Write failing test — `withTenantScope` filters by tenant_id and excludes soft-deleted rows

- [ ] **Step 2:** Create Drizzle client initialization

```typescript
// src/core/db/drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 3:** Implement `withTenantScope(db, tenantId)` — the core tenant isolation utility

Returns object with: `query(table)`, `insert(table, values)`, `update(table)`, `softDelete(table, id)` — each automatically scopes to tenant_id and filters deleted_at IS NULL.

Reference: blueprint Part 1, Section 4 (code sample provided).

- [ ] **Step 4:** Run test, verify pass

- [ ] **Step 5:** Commit: "feat: drizzle schema + tenant scope utility"

---

### Task 1.7: SQL Migration + RLS Policies

**Files:** Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1:** Generate migration from Drizzle schema

```bash
pnpm drizzle-kit generate
```

- [ ] **Step 2:** Add RLS policies to generated migration (append manually)

For EVERY tenant-scoped table:
```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table}
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Service role bypasses RLS (default Supabase behavior).

- [ ] **Step 3:** Add composite indexes for common query patterns

```sql
CREATE UNIQUE INDEX idx_items_code ON items(tenant_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_locations_code ON locations(tenant_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_contacts_email ON contacts(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_status ON sales(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchases_status ON purchases(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfers_status ON transfers(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_log_entity ON audit_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_payments_ref ON payments(tenant_id, type, reference_id);
```

- [ ] **Step 4:** Add stock_levels VIEW

Adapt from `v1-archive/src/core/db/stock-levels-view.ts` but for shared-schema (tenant_id column instead of schema prefix). The VIEW computes:
- inbound: received purchases + received transfers at destination + approved adjustment additions
- outbound: dispatched transfers from origin + confirmed/dispatched sales + approved adjustment removals
- in_transit: transfers in dispatched/in_transit status

Columns: tenant_id, item_id, location_id, unit_id, total_in, total_out, current_stock, in_transit.

- [ ] **Step 5:** Push migration to Supabase

```bash
pnpm drizzle-kit push
```

- [ ] **Step 6:** Verify tables, indexes, RLS, and VIEW exist via Supabase dashboard

- [ ] **Step 7:** Commit: "feat: initial migration with RLS + stock_levels VIEW"

---

### Task 1.8: Supabase Client Utilities

**Files:** Create: `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `admin.ts`

- [ ] **Step 1:** Browser client (for client components)
- [ ] **Step 2:** Server client (for Server Components / Route Handlers)
- [ ] **Step 3:** Middleware client (for middleware.ts)
- [ ] **Step 4:** Admin client (service role, bypasses RLS)

Use `@supabase/ssr` patterns. Reference v1-archive for the existing pattern, adapt for v2.

- [ ] **Step 5:** Commit: "feat: supabase client utilities"

---

### Task 1.9: Auth Types + JWT Decode

**Files:** Create: `src/core/auth/types.ts`, `src/core/auth/session.ts`

- [ ] **Step 1:** Define `AppJwtPayload` type

```typescript
export interface AppJwtPayload {
  sub: string;  // user ID
  email: string;
  app_metadata: {
    tenant_id: string;
    tenant_slug: string;
    role: Role;
    enabled_modules: string[];
    memberships: Array<{
      tenantId: string;
      slug: string;
      role: Role;
    }>;
  };
}

export type Role = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  role: Role;
  userId: string;
  userEmail: string;
  enabledModules: string[];
}
```

- [ ] **Step 2:** Implement JWT decode utility using `jose` (edge-compatible)

- [ ] **Step 3:** Commit: "feat: auth types + JWT decode"

---

### Task 1.10: Permissions System

**Files:** Create: `src/core/auth/permissions.ts`

- [ ] **Step 1:** Write failing test — role hierarchy grants correct permissions

- [ ] **Step 2:** Define permission types and role hierarchy

```typescript
export type Permission =
  | 'inventory:read' | 'inventory:write'
  | 'items:read' | 'items:write' | 'items:delete'
  | 'orders:create' | 'orders:update' | 'orders:delete'
  | 'transfers:create' | 'transfers:receive'
  | 'adjustments:create' | 'adjustments:approve'
  | 'reports:read' | 'reports:export'
  | 'users:manage' | 'settings:manage' | 'modules:manage'
  | 'audit:read' | 'tenant:manage' | 'billing:manage'
  | 'barcodes:scan' | 'receive:create'
  | 'payments:manage';

export const ROLE_HIERARCHY: Record<Role, Permission[]> = {
  viewer: ['inventory:read', 'items:read'],
  operator: [/* ...viewer + */ 'orders:create', 'orders:update', 'receive:create', 'barcodes:scan'],
  manager: [/* ...operator + */ 'orders:delete', 'transfers:create', 'reports:read', 'adjustments:create', 'payments:manage'],
  admin: [/* ...manager + */ 'users:manage', 'settings:manage', 'modules:manage', 'audit:read'],
  owner: [/* ...admin + */ 'tenant:manage', 'billing:manage'],
};
```

- [ ] **Step 3:** Implement `hasPermission(role, permission)`, `requirePermission(ctx, permission)`

- [ ] **Step 4:** Run test, verify pass

- [ ] **Step 5:** Commit: "feat: role hierarchy + permission checks"

---

### Task 1.11: JWT-Only Middleware

**Files:** Create: `src/middleware.ts`

- [ ] **Step 1:** Write failing test — middleware injects correct headers from JWT

- [ ] **Step 2:** Implement middleware

Key behavior:
- Public routes: `/login`, `/register`, `/auth/callback`, `/reset-password`, `/set-password`, `/no-tenant`, `/api/inngest`
- Decode JWT from cookie (Supabase auth token)
- Extract `app_metadata`: tenant_id, tenant_slug, role, enabled_modules
- Multi-tenant switching: if URL slug differs from JWT slug, check memberships array
- Inject headers: `x-tenant-id`, `x-tenant-slug`, `x-tenant-role`, `x-tenant-modules`, `x-user-id`, `x-user-email`
- **ZERO database calls** — this is a critical rule from CLAUDE.md

- [ ] **Step 3:** Configure route matcher

- [ ] **Step 4:** Run test, verify pass

- [ ] **Step 5:** Commit: "feat: JWT-only middleware"

---

### Task 1.12: API Route Guard (`withTenantContext`)

**Files:** Create: `src/core/auth/guards.ts`, `src/core/api/error-handler.ts`

- [ ] **Step 1:** Implement `withTenantContext(handler)` wrapper

Reads headers injected by middleware, constructs `TenantContext`, calls handler. Pattern:
```typescript
export function withTenantContext(
  handler: (req: NextRequest, ctx: TenantContext) => Promise<Response>,
  options?: { permission?: Permission }
) {
  return async (req: NextRequest) => {
    const tenantId = req.headers.get('x-tenant-id');
    // ... extract all headers, build TenantContext
    // Check permission if specified
    // Call handler with ctx
    // Catch errors → standardized error response
  };
}
```

- [ ] **Step 2:** Implement standardized error handler (400, 401, 403, 404, 500 with consistent JSON shape)

- [ ] **Step 3:** Create health route: `src/app/api/v1/health/route.ts` — echoes tenant context (dev verification)

- [ ] **Step 4:** Commit: "feat: withTenantContext API guard + error handler"

---

### Task 1.13: Auth Pages (Login, Register, Reset, Set Password, Callback)

**Files:** Create: `src/app/(auth)/layout.tsx`, `login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx`, `set-password/page.tsx`, `src/app/auth/callback/route.ts`

- [ ] **Step 1:** Create auth layout (centered card on off-white background)

- [ ] **Step 2:** Login page — combined sign-in + forgot-password (3 views: login, forgot, forgot-sent)

- [ ] **Step 3:** Register page — email + password sign-up, confirmation email flow

- [ ] **Step 4:** Reset password page — handles both PKCE `?code=` and OTP `?token_hash=` flows

- [ ] **Step 5:** Set password page — for invited users (reached via `/auth/callback?next=/set-password`)

- [ ] **Step 6:** Auth callback route — PKCE exchange, accepts `?next=` param for redirect

- [ ] **Step 7:** No-tenant page (`/no-tenant`) — "Access Pending" for users with no tenant membership

- [ ] **Step 8:** Commit: "feat: auth pages (login, register, reset, set-password, callback)"

---

### Task 1.14: Inngest + Event Types Setup

**Files:** Create: `src/inngest/client.ts`, `src/core/events/types.ts`, `src/app/api/inngest/route.ts`

- [ ] **Step 1:** Initialize Inngest client

```typescript
import { Inngest } from 'inngest';
export const inngest = new Inngest({ id: 'wareos' });
```

- [ ] **Step 2:** Define typed events (from blueprint Part 2, Section 9)

```typescript
export const AppEvents = {
  'sale/confirmed': z.object({ saleId: z.string().uuid(), tenantId: z.string() }),
  'purchase/received': z.object({ purchaseId: z.string().uuid(), tenantId: z.string() }),
  'transfer/dispatched': z.object({ transferId: z.string().uuid(), tenantId: z.string() }),
  'transfer/received': z.object({ transferId: z.string().uuid(), tenantId: z.string() }),
  'stock/below-threshold': z.object({ itemId: z.string(), locationId: z.string(), current: z.number(), threshold: z.number() }),
};
```

- [ ] **Step 3:** Create Inngest serve route handler at `/api/inngest`

- [ ] **Step 4:** Commit: "feat: inngest client + typed events"

---

### Task 1.15: Utils + Shared Helpers

**Files:** Create: `src/lib/utils.ts`, `src/lib/pagination.ts`

- [ ] **Step 1:** `cn()` utility (clsx + tailwind-merge)

- [ ] **Step 2:** Pagination helper (parse page/limit from searchParams, return offset/limit)

- [ ] **Step 3:** Commit: "feat: utility helpers"

---

### Task 1.16: Vitest Configuration

**Files:** Create: `vitest.config.ts`

- [ ] **Step 1:** Configure Vitest with path aliases matching tsconfig

- [ ] **Step 2:** Verify `pnpm test` runs (empty suite OK)

- [ ] **Step 3:** Commit: "chore: vitest configuration"

---

### Sub-Plan 1 Verification Checklist

- [ ] `pnpm dev` starts without errors
- [ ] `pnpm drizzle-kit push` creates all tables in Supabase
- [ ] Login/register/password-reset pages render
- [ ] Auth flow works end-to-end (sign up → confirm email → login)
- [ ] Middleware decodes JWT and injects headers (verify via `/api/v1/health`)
- [ ] `withTenantScope` test passes (tenant isolation verified)
- [ ] Permission system test passes (role hierarchy correct)
- [ ] RLS policies exist on all tenant-scoped tables (verify in Supabase dashboard)
- [ ] stock_levels VIEW exists and returns empty result set
- [ ] Inngest dev server starts (`npx inngest-cli dev`)

---

## Sub-Plan 2: Inventory Module + Design System Shell

**Goal:** Working inventory CRUD (items, locations, units, contacts) with the full design system, layout shell, module registry, and stock_levels display.

### File Structure (created in this sub-plan)

```
src/
  core/
    modules/
      registry.ts                      # ModuleManifest interface, registry
      types.ts                         # Shared module types
  modules/
    inventory/
      manifest.ts
      queries/
        items.ts
        locations.ts
        units.ts
        contacts.ts
        stock.ts                       # Query stock_levels VIEW
        custom-fields.ts
      validations/
        item.ts
        location.ts
        unit.ts
        contact.ts
        custom-field.ts
    transfer/manifest.ts               # Stub manifests for sidebar
    purchase/manifest.ts
    sale/manifest.ts
    adjustments/manifest.ts
    user-management/manifest.ts
    audit-trail/manifest.ts
    stock-alerts/manifest.ts
    analytics/manifest.ts
    shortage-tracking/manifest.ts
    payments/manifest.ts
    index.ts                           # Register all modules
  app/
    api/v1/t/[tenantSlug]/
      items/route.ts
      items/[id]/route.ts
      locations/route.ts
      locations/[id]/route.ts
      units/route.ts
      contacts/route.ts
      contacts/[id]/route.ts
      inventory/route.ts               # stock_levels query
      custom-fields/route.ts
      custom-fields/[id]/route.ts
    t/[tenantSlug]/
      layout.tsx                       # Platform layout (sidebar + header + content)
      page.tsx                         # Dashboard placeholder
      loading.tsx                      # Root loading skeleton
      settings/
        items/page.tsx
        items/items-table.tsx
        items/item-form.tsx
        locations/page.tsx
        locations/locations-table.tsx
        locations/location-form.tsx
        contacts/page.tsx
        contacts/contacts-table.tsx
        contacts/contact-form.tsx
        custom-fields/page.tsx
        custom-fields/custom-field-form.tsx
      inventory/
        page.tsx                       # Stock levels display
        stock-table.tsx
  components/
    ui/                                # shadcn/ui components
      button.tsx
      input.tsx
      label.tsx
      select.tsx
      dialog.tsx
      card.tsx
      table.tsx
      badge.tsx
      skeleton.tsx
      sonner.tsx (toast)
      command.tsx                       # For global search
      popover.tsx
      sheet.tsx
      tabs.tsx
      separator.tsx
      dropdown-menu.tsx
      textarea.tsx
      form-section.tsx                 # Reusable form section layout
      data-table.tsx                   # Reusable TanStack Table wrapper
    layout/
      header.tsx
      sidebar.tsx
      mobile-bottom-nav.tsx
      tenant-provider.tsx
    search/
      global-search.tsx                # Cmd+K search
```

### Task 2.1: Design System — globals.css + Tokens

**Files:** Create/update: `src/app/globals.css`

- [ ] **Step 1:** Implement all design tokens from `.claude/context/design-principles.md` Section II

All tokens: --bg-base, --bg-off, --bg-ink, --accent-color, --accent-dark, --accent-tint, --orange-bg, --text-primary, --text-muted, --text-dim, --border, --border-mid, --green/--blue/--red + bg tints, --color-info, --color-warning, layout tokens, sizing tokens.

- [ ] **Step 2:** Base typography: system sans-serif, 400 + 700 weights only, type scale per design-principles Section V

- [ ] **Step 3:** Tailwind v4 integration (verify token access from Tailwind utilities)

- [ ] **Step 4:** Commit: "feat: design system tokens + globals.css"

---

### Task 2.2: shadcn/ui Component Installation

**Files:** Create: `src/components/ui/*.tsx`, `components.json`

- [ ] **Step 1:** Initialize shadcn/ui (`pnpm dlx shadcn@latest init`)

- [ ] **Step 2:** Install components: button, input, label, select, dialog, card, table, badge, skeleton, sonner, command, popover, sheet, tabs, separator, dropdown-menu, textarea

- [ ] **Step 3:** Customize button variants to match design_reference.html (btn--orange pill, btn--ghost, btn--outline-orange, btn--ink, btn--subtle, btn--destructive, btn--icon-only)

- [ ] **Step 4:** Customize badge variants (received/green, dispatched/orange, confirmed/blue, cancelled/red, pending/muted — all pill 9999px)

- [ ] **Step 5:** Create `data-table.tsx` — reusable TanStack Table wrapper with sorting, filtering, pagination

- [ ] **Step 6:** Create `form-section.tsx` — reusable form section (label + description + input group)

- [ ] **Step 7:** Commit: "feat: shadcn/ui components + custom variants"

---

### Task 2.3: Module Registry

**Files:** Create: `src/core/modules/registry.ts`, `types.ts`

- [ ] **Step 1:** Write failing test — registry resolves dependencies, detects circular deps

- [ ] **Step 2:** Implement `ModuleManifest` interface (from blueprint Part 2, Section 9)

Fields: id, name, description, version, icon, dependencies, permissions, routes (with path, label, icon, permission, group)

- [ ] **Step 3:** Implement `ModuleRegistry` class: register, get, getAll, getEnabled, getNavItems, getDependents

- [ ] **Step 4:** Run test, verify pass

- [ ] **Step 5:** Commit: "feat: module registry with dependency resolution"

---

### Task 2.4: Module Manifests (All 11 Phase 1 Modules)

**Files:** Create: `src/modules/*/manifest.ts`, `src/modules/index.ts`

- [ ] **Step 1:** Create inventory manifest (full routes: items, locations, units, contacts, inventory, custom-fields)

- [ ] **Step 2:** Create stub manifests for: transfer, purchase, sale, adjustments, user-management, audit-trail, stock-alerts, analytics, shortage-tracking, payments

Each stub has: id, name, icon, dependencies, routes (sidebar entries), permissions — no queries/API yet.

- [ ] **Step 3:** Create `src/modules/index.ts` — registers all manifests with registry

- [ ] **Step 4:** Commit: "feat: module manifests for all Phase 1 modules"

---

### Task 2.5: Layout Shell (Sidebar + Header + Mobile Nav)

**Files:** Create: `src/components/layout/header.tsx`, `sidebar.tsx`, `mobile-bottom-nav.tsx`, `tenant-provider.tsx`, `src/app/t/[tenantSlug]/layout.tsx`

- [ ] **Step 1:** Create tenant provider (reads JWT context, provides to children)

- [ ] **Step 2:** Create sidebar — module-aware navigation filtered by `enabled_modules` from JWT

Sidebar spec from design_reference.html: 240px wide, --bg-base background, active state = orange left-border + accent-tint bg + orange text (all three together — Rule 4).

- [ ] **Step 3:** Create header — tenant name, user avatar/dropdown, Cmd+K search trigger

- [ ] **Step 4:** Create mobile bottom nav (72px, 5 icons, fixed bottom)

- [ ] **Step 5:** Create platform layout — sidebar (hidden on mobile) + header + content area

- [ ] **Step 6:** Commit: "feat: layout shell (sidebar, header, mobile nav)"

---

### Task 2.6: Inventory Module — API Routes (Items)

**Files:** Create: `src/modules/inventory/queries/items.ts`, `validations/item.ts`, `src/app/api/v1/t/[tenantSlug]/items/route.ts`, `items/[id]/route.ts`

- [ ] **Step 1:** Define Zod schemas: `createItemSchema`, `updateItemSchema`

- [ ] **Step 2:** Implement queries: `listItems(db, tenantId, filters)`, `getItem(db, tenantId, id)`, `createItem(db, tenantId, data, userId)`, `updateItem(db, tenantId, id, data, userId)`, `softDeleteItem(db, tenantId, id, userId)`

Each mutation calls audit log insert.

- [ ] **Step 3:** Implement API routes with `withTenantContext`:
  - GET `/items` — list with pagination, search, filter by category/type/is_active
  - POST `/items` — create (validate with Zod, auto-generate code via sequence counter)
  - GET `/items/[id]` — get by ID
  - PATCH `/items/[id]` — update
  - DELETE `/items/[id]` — soft delete

- [ ] **Step 4:** Commit: "feat: items API (CRUD + audit)"

---

### Task 2.7: Inventory Module — API Routes (Locations, Units, Contacts)

**Files:** Create: queries, validations, and API routes for locations, units, contacts

- [ ] **Step 1:** Locations: queries + validations + GET/POST/PATCH/DELETE routes

- [ ] **Step 2:** Units: queries + validations + GET/POST routes (units rarely deleted)

- [ ] **Step 3:** Contacts: queries + validations + GET/POST/PATCH/DELETE routes

- [ ] **Step 4:** Custom fields: queries + validations + GET/POST/PATCH/DELETE routes

- [ ] **Step 5:** Commit: "feat: locations, units, contacts, custom-fields API"

---

### Task 2.8: Inventory Module — Stock Levels API

**Files:** Create: `src/modules/inventory/queries/stock.ts`, `src/app/api/v1/t/[tenantSlug]/inventory/route.ts`

- [ ] **Step 1:** Query stock_levels VIEW with Drizzle (raw SQL query against the VIEW, scoped by tenant_id)

- [ ] **Step 2:** API route: GET `/inventory` — returns stock levels with item name, location name, unit, current_stock, in_transit

- [ ] **Step 3:** Commit: "feat: stock levels API"

---

### Task 2.9: Inventory Module — Frontend (Items)

**Files:** Create: `src/app/t/[tenantSlug]/settings/items/page.tsx`, `items-table.tsx`, `item-form.tsx`

- [ ] **Step 1:** Items list page (Server Component — fetches items, renders ItemsTable)

- [ ] **Step 2:** Items table (Client Component — TanStack Table with columns: code, name, category, type, purchase_price, selling_price, stock [from stock_levels], is_active, actions)

- [ ] **Step 3:** Item form (dialog or page — create/edit with all fields + custom fields)

- [ ] **Step 4:** Empty state, skeleton loading, toast on success/error

- [ ] **Step 5:** Commit: "feat: items UI (list + form)"

---

### Task 2.10: Inventory Module — Frontend (Locations, Units, Contacts)

- [ ] **Step 1:** Locations: list page + table + form (similar pattern to items)
- [ ] **Step 2:** Units: list page + table + form
- [ ] **Step 3:** Contacts: list page + table + form
- [ ] **Step 4:** Custom fields: management page + form
- [ ] **Step 5:** Commit: "feat: locations, units, contacts, custom-fields UI"

---

### Task 2.11: Inventory Page (Stock Levels Display)

**Files:** Create: `src/app/t/[tenantSlug]/inventory/page.tsx`, `stock-table.tsx`

- [ ] **Step 1:** Inventory page — fetches stock_levels, renders StockTable
- [ ] **Step 2:** StockTable — columns: item name, location, unit, current_stock, in_transit, available (current - committed)
- [ ] **Step 3:** Filters: by location, by item category, search
- [ ] **Step 4:** Commit: "feat: inventory stock levels page"

---

### Task 2.12: Global Search (Cmd+K)

**Files:** Create: `src/components/search/global-search.tsx`

- [ ] **Step 1:** Implement Cmd+K / Ctrl+K command palette (using cmdk)
- [ ] **Step 2:** 300ms debounce, searches items + contacts + locations (max 5 per type)
- [ ] **Step 3:** Mount in header
- [ ] **Step 4:** Commit: "feat: global search (Cmd+K)"

---

### Sub-Plan 2 Verification Checklist

- [ ] Items, locations, units, contacts CRUD works end-to-end (API + UI)
- [ ] Sidebar shows correct navigation based on enabled modules
- [ ] Design system matches design_reference.html (screenshot at 1440px + 375px)
- [ ] Stock levels display on inventory page (empty for now — no transactions yet)
- [ ] Global search finds items, contacts, locations
- [ ] Module registry resolves dependencies (unit test)
- [ ] Custom fields can be defined and values stored
- [ ] All mutations create audit log entries (verify via DB)

---

## Sub-Plan 3: Transaction Modules

**Goal:** Purchase, Sale, Transfer, Adjustments with full status workflows. After this, the complete inventory loop works: buy → sell → transfer → adjust → stock updates correctly.

### Task 3.1: Purchase Module — API

**Files:** Create: `src/modules/purchase/queries/purchases.ts`, `validations/purchase.ts`, API routes

- [ ] **Step 1:** Zod schemas: `createPurchaseSchema`, `updatePurchaseSchema` (with line items)
- [ ] **Step 2:** Queries: listPurchases, getPurchase (with items joined), createPurchase, updatePurchase, receivePurchase (status → received, stock update), cancelPurchase
- [ ] **Step 3:** Sequence counter: PUR-000001
- [ ] **Step 4:** API routes: GET/POST `/purchases`, GET/PATCH/DELETE `/purchases/[id]`
- [ ] **Step 5:** Status transitions: draft → ordered → received | cancelled
- [ ] **Step 6:** On receive: emit `purchase/received` Inngest event
- [ ] **Step 7:** Commit: "feat: purchase module API"

---

### Task 3.2: Sale Module — API

**Files:** Create: `src/modules/sale/queries/sales.ts`, `validations/sale.ts`, API routes

- [ ] **Step 1:** Zod schemas for sales + line items
- [ ] **Step 2:** Queries: listSales, getSale, createSale, updateSale, confirmSale, dispatchSale, cancelSale
- [ ] **Step 3:** Sequence counter: SAL-000001
- [ ] **Step 4:** API routes: GET/POST `/sales`, GET/PATCH/DELETE `/sales/[id]`
- [ ] **Step 5:** Status transitions: draft → confirmed → dispatched | cancelled
- [ ] **Step 6:** On confirm: emit `sale/confirmed`
- [ ] **Step 7:** Commit: "feat: sale module API"

---

### Task 3.3: Transfer Module — API

**Files:** Create: `src/modules/transfer/queries/transfers.ts`, `validations/transfer.ts`, API routes

- [ ] **Step 1:** Zod schemas for transfers + line items
- [ ] **Step 2:** Queries: listTransfers, getTransfer, createTransfer, dispatchTransfer, receiveTransfer (with received_qty per item → shortage computed)
- [ ] **Step 3:** Sequence counter: TFR-000001
- [ ] **Step 4:** API routes: GET/POST `/transfers`, GET/PATCH `/transfers/[id]`, POST `/transfers/[id]/receive`
- [ ] **Step 5:** Status transitions: draft → dispatched → in_transit → received
- [ ] **Step 6:** On dispatch: emit `transfer/dispatched`. On receive: emit `transfer/received`
- [ ] **Step 7:** Commit: "feat: transfer module API"

---

### Task 3.4: Adjustments Module — API

**Files:** Create: `src/modules/adjustments/queries/adjustments.ts`, `validations/adjustment.ts`, API routes

- [ ] **Step 1:** Zod schemas for adjustments + line items (qty_change can be positive or negative)
- [ ] **Step 2:** Queries: listAdjustments, getAdjustment, createAdjustment, approveAdjustment
- [ ] **Step 3:** Sequence counter: ADJ-000001
- [ ] **Step 4:** API routes: GET/POST `/adjustments`, GET/PATCH `/adjustments/[id]`
- [ ] **Step 5:** Status transitions: draft → approved
- [ ] **Step 6:** Commit: "feat: adjustments module API"

---

### Task 3.5: Stock Levels Integration Test

- [ ] **Step 1:** Write integration test: create item → create purchase (received) → verify stock_levels shows inbound
- [ ] **Step 2:** Add sale (confirmed) → verify outbound reflected
- [ ] **Step 3:** Add transfer (dispatched) → verify origin deducted, in_transit shown
- [ ] **Step 4:** Receive transfer with shortage → verify destination stock, shortage computed
- [ ] **Step 5:** Create adjustment (approved, positive) → verify stock increased
- [ ] **Step 6:** Commit: "test: stock_levels integration test"

---

### Task 3.6: Shortage Tracking — API

**Files:** Create: `src/modules/shortage-tracking/queries/shortages.ts`, API route

- [ ] **Step 1:** Query: listShortages — transfers with items where shortage > 0
- [ ] **Step 2:** API route: GET `/shortage-tracking` with filters (date range, location)
- [ ] **Step 3:** Commit: "feat: shortage tracking API"

---

### Task 3.7: Purchase Module — Frontend

**Files:** Create pages + table + form for purchases

- [ ] **Step 1:** Purchases list page + table (columns: purchase_number, contact, location, status, total, date)
- [ ] **Step 2:** Create purchase form with line items (use-purchase-form.ts hook)
- [ ] **Step 3:** Purchase detail page — status badge, line items table, status transition buttons
- [ ] **Step 4:** Receive purchase action (button on detail page)
- [ ] **Step 5:** Commit: "feat: purchases UI"

---

### Task 3.8: Sale Module — Frontend

- [ ] **Step 1:** Sales list page + table
- [ ] **Step 2:** Create sale form with line items (use-sale-form.ts hook)
- [ ] **Step 3:** Sale detail page with status transitions (confirm, dispatch, cancel)
- [ ] **Step 4:** Commit: "feat: sales UI"

---

### Task 3.9: Transfer Module — Frontend

- [ ] **Step 1:** Transfers list page + table
- [ ] **Step 2:** Create transfer form (origin + destination locations, line items; use-transfer-form.ts hook)
- [ ] **Step 3:** Transfer detail page with status transitions
- [ ] **Step 4:** Receive form — enter received_qty per item (desktop + mobile dual-form pattern)
- [ ] **Step 5:** Commit: "feat: transfers UI"

---

### Task 3.10: Adjustments Module — Frontend

- [ ] **Step 1:** Adjustments list page + table
- [ ] **Step 2:** Create adjustment form (location, reason, line items with qty_change)
- [ ] **Step 3:** Adjustment detail page with approve action
- [ ] **Step 4:** Commit: "feat: adjustments UI"

---

### Task 3.11: Shortage Tracking — Frontend

- [ ] **Step 1:** Shortage dashboard page — table of transfers with shortages
- [ ] **Step 2:** Filters: date range, location
- [ ] **Step 3:** Commit: "feat: shortage tracking UI"

---

### Sub-Plan 3 Verification Checklist

- [ ] Complete inventory loop works: create item → purchase → receive → verify stock → sell → dispatch → verify stock deducted → transfer → receive with shortage → verify
- [ ] All status transitions work correctly in UI
- [ ] Sequence numbers auto-increment (PUR-000001, SAL-000001, etc.)
- [ ] stock_levels VIEW returns correct values after all transaction types
- [ ] Shortage tracking shows transfers with discrepancies
- [ ] Inngest events fire on status changes (verify in Inngest dev dashboard)
- [ ] All mutations create audit log entries

---

## Sub-Plan 4: Users + Lite Modules

**Goal:** Role-based access control, audit trail UI, stock alerts, analytics dashboard, payments, and super admin panel.

### Task 4.1: User Management — API

- [ ] **Step 1:** Queries: listUsers, getUser, updateUserRole, updateUserPermissions, updateUserLocations
- [ ] **Step 2:** Invite flow: POST `/users` → call Supabase `auth.admin.inviteUserByEmail()` → set app_metadata
- [ ] **Step 3:** API routes: GET/POST `/users`, GET/PATCH/DELETE `/users/[userId]`, PUT `/users/[userId]/locations`
- [ ] **Step 4:** Commit: "feat: user management API"

---

### Task 4.2: Permission Enforcement (API + UI)

- [ ] **Step 1:** Add permission checks to ALL existing API routes (from Sub-Plans 2-3)
- [ ] **Step 2:** Sidebar: filter nav items by role permissions
- [ ] **Step 3:** UI: hide action buttons (create, edit, delete, approve) based on permissions
- [ ] **Step 4:** Commit: "feat: permission enforcement across all routes"

---

### Task 4.3: User Management — Frontend

- [ ] **Step 1:** Users list page + table (name, email, role, locations, status)
- [ ] **Step 2:** User detail/edit page (change role, assign permissions, assign locations)
- [ ] **Step 3:** Invite user dialog
- [ ] **Step 4:** Commit: "feat: user management UI"

---

### Task 4.4: Audit Trail — API + Frontend

- [ ] **Step 1:** API route: GET `/audit-log` with filters (entity_type, date range, user)
- [ ] **Step 2:** Audit log page + table (timestamp, user, action, entity_type, entity_id)
- [ ] **Step 3:** Detail dialog — shows old/new data diff
- [ ] **Step 4:** Commit: "feat: audit trail UI"

---

### Task 4.5: Stock Alerts — Inngest Cron + API + Frontend

- [ ] **Step 1:** Alert thresholds CRUD: API routes for GET/POST/PATCH/DELETE `/stock-alerts/thresholds`
- [ ] **Step 2:** Inngest cron function: `stock-alerts.ts` — every 5 min, query stock_levels vs alert_thresholds, emit `stock/below-threshold` for matches
- [ ] **Step 3:** API route: GET `/stock-alerts` — items currently below threshold
- [ ] **Step 4:** Stock alerts page + table
- [ ] **Step 5:** Thresholds management page
- [ ] **Step 6:** Commit: "feat: stock alerts (cron + UI)"

---

### Task 4.6: Analytics Dashboard

- [ ] **Step 1:** API route: GET `/analytics` — compute 6 KPIs: total stock value, items below reorder, open orders count, transfers in-transit, revenue (period), top-selling items
- [ ] **Step 2:** Dashboard home page with KPI cards (Recharts for charts)
- [ ] **Step 3:** Stock trend line chart, movement bar chart, top-items pie chart
- [ ] **Step 4:** Commit: "feat: analytics dashboard"

---

### Task 4.7: Payments — API + Frontend

- [ ] **Step 1:** Queries: listPayments, createPayment, getPayment, deletePayment
- [ ] **Step 2:** API routes: GET/POST `/payments`, GET/DELETE `/payments/[id]`
- [ ] **Step 3:** Payments list page + table (number, type, reference, amount, date)
- [ ] **Step 4:** Record payment dialog (appears on purchase/sale detail pages)
- [ ] **Step 5:** Payment summary on purchase/sale detail (total paid, balance due)
- [ ] **Step 6:** Commit: "feat: payments module"

---

### Task 4.8: Super Admin Panel

- [ ] **Step 1:** Admin guard middleware (check super_admins table — this is the ONE case where admin routes hit DB)
- [ ] **Step 2:** API routes: `/api/v1/admin/tenants` (GET/POST), `/admin/tenants/[id]` (GET/PATCH), `/admin/tenants/[id]/invite`, `/admin/tenants/[id]/provision`
- [ ] **Step 3:** API routes: `/api/v1/admin/access-requests` (GET, PATCH approve/reject)
- [ ] **Step 4:** Admin pages: tenant list, tenant detail (module toggle, invite), access requests
- [ ] **Step 5:** Self-signup flow: register → confirm → login → `/no-tenant` → access request auto-created → admin approves
- [ ] **Step 6:** Commit: "feat: super admin panel"

---

### Task 4.9: Onboarding Wizard

- [ ] **Step 1:** First-login detection (no items, no locations, no units)
- [ ] **Step 2:** Wizard steps: create first location → add default units → add first item
- [ ] **Step 3:** Dismiss + re-trigger from settings
- [ ] **Step 4:** Commit: "feat: onboarding wizard"

---

### Sub-Plan 4 Verification Checklist

- [ ] Login as operator → cannot access admin pages, cannot delete orders
- [ ] Login as viewer → can only see inventory, cannot create anything
- [ ] Login as owner → full access to everything
- [ ] Invite user → email sent → user sets password → appears in users list
- [ ] Audit trail shows all mutations with correct before/after data
- [ ] Stock alerts cron fires in Inngest, identifies items below threshold
- [ ] Dashboard shows 6 live KPIs with charts populated from real data
- [ ] Payments recorded against purchases/sales, balance computed
- [ ] Super admin can provision new tenant, toggle modules, approve access requests
- [ ] Onboarding wizard appears for new tenants

---

## Sub-Plan 5: Polish + Production Readiness

**Goal:** PWA setup, rate limiting, realtime, keyboard shortcuts, E2E tests, CI/CD, and deployment.

### Task 5.1: PWA Setup (Online-Only)

- [ ] **Step 1:** Create `public/manifest.json` (app name, icons, theme color)
- [ ] **Step 2:** Service worker for app shell caching only (not offline data)
- [ ] **Step 3:** "You're offline" banner component
- [ ] **Step 4:** "Add to Home Screen" support
- [ ] **Step 5:** Commit: "feat: online-only PWA"

---

### Task 5.2: Rate Limiting

- [ ] **Step 1:** Upstash Redis rate limiter middleware: 100 req/min per IP, 1000 req/min per tenant
- [ ] **Step 2:** Apply to all `/api/v1/` routes
- [ ] **Step 3:** Commit: "feat: rate limiting via Upstash Redis"

---

### Task 5.3: Supabase Realtime

- [ ] **Step 1:** Realtime listener component for stock level changes
- [ ] **Step 2:** Live transfer status updates
- [ ] **Step 3:** Commit: "feat: realtime stock + transfer updates"

---

### Task 5.4: Keyboard Shortcuts

- [ ] **Step 1:** `N` = new entity, `S` = save form, `Esc` = cancel/close, `/` = focus search
- [ ] **Step 2:** Commit: "feat: keyboard shortcuts"

---

### Task 5.5: Error Handling + Polish

- [ ] **Step 1:** Root error boundary (`src/app/error.tsx`)
- [ ] **Step 2:** Not-found page (`src/app/not-found.tsx`)
- [ ] **Step 3:** Loading skeletons audit — every data page has one
- [ ] **Step 4:** Empty states audit — every table has empty state
- [ ] **Step 5:** Responsive audit — all pages at 1440px, 768px, 375px
- [ ] **Step 6:** Design system audit — no hardcoded hex, correct tokens, 7 rules pass
- [ ] **Step 7:** Commit: "fix: polish pass (errors, loading, empty states, responsive)"

---

### Task 5.6: E2E Tests (Playwright)

- [ ] **Step 1:** Configure Playwright with auth state (login once, reuse session)
- [ ] **Step 2:** Test: login flow
- [ ] **Step 3:** Test: create item → create purchase → receive → verify stock
- [ ] **Step 4:** Test: create sale → dispatch → verify stock deduction
- [ ] **Step 5:** Test: transfer with shortage
- [ ] **Step 6:** Test: role-based access (operator vs admin)
- [ ] **Step 7:** Test: mobile viewport (375px)
- [ ] **Step 8:** Commit: "test: E2E test suite"

---

### Task 5.7: CI/CD Pipeline

- [ ] **Step 1:** GitHub Actions workflow: lint → typecheck → unit tests → build → E2E tests
- [ ] **Step 2:** Vercel deployment configuration
- [ ] **Step 3:** Commit: "ci: GitHub Actions + Vercel deploy"

---

### Task 5.8: Production Deploy

- [ ] **Step 1:** `pnpm drizzle-kit push` to production Supabase
- [ ] **Step 2:** Configure Vercel env vars
- [ ] **Step 3:** Deploy to Vercel (`vercel deploy --prod`)
- [ ] **Step 4:** Verify health route, login, and one full transaction flow on production
- [ ] **Step 5:** Commit: "chore: production deployment config"

---

### Sub-Plan 5 Verification Checklist

- [ ] PWA installable on mobile, "Add to Home Screen" works
- [ ] Offline banner appears when connectivity drops
- [ ] Rate limiting returns 429 on excess requests
- [ ] Realtime: open two tabs, create item in one, appears in other
- [ ] Keyboard shortcuts work (N, S, Esc, /)
- [ ] All pages render correctly at 1440px, 768px, 375px
- [ ] No hardcoded hex colors in source
- [ ] E2E tests pass locally and in CI
- [ ] CI pipeline green on push
- [ ] Production deployment works end-to-end

---

## Estimated Totals

| Sub-Plan | Tasks | Cumulative |
|---|---|---|
| 1: Foundation | 16 tasks | 16 |
| 2: Inventory + Design Shell | 12 tasks | 28 |
| 3: Transactions | 11 tasks | 39 |
| 4: Users + Lite Modules | 9 tasks | 48 |
| 5: Polish + Production | 8 tasks | 56 |

Each task contains 3–7 steps. Total steps: ~250.

---

## Risk Areas

1. **stock_levels VIEW** — Most critical piece. Must correctly compute available stock across all transaction types. Integration test in Task 3.5 is the gatekeeper.

2. **JWT custom claims** — Supabase Auth Hook must inject tenant context on every login. If claims are stale (role change, module toggle), user sees wrong UI until token refresh.

3. **Drizzle + RLS interaction** — Drizzle uses service role connection (bypasses RLS). `withTenantScope` is primary isolation. RLS is defense-in-depth for direct DB access.

4. **Inngest in Vercel** — Inngest serve handler must be correctly wired. Test early with `npx inngest-cli dev`.

5. **Shared-schema migration** — Single migration for all tenants is simpler, but any schema error affects everyone. Test migrations thoroughly before pushing to production.
