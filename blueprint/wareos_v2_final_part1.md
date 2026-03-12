# WareOS v2 — Final Blueprint (Part 1 of 3)

## Architecture · Multi-Tenancy · Auth · Database Schema

> General-purpose Inventory & Warehouse Management SaaS.
> Drizzle ORM, JWT middleware, shared-schema + RLS, Vercel + Inngest (Solution D).
> Accounting/compliance excluded (Tally handles that).
> **This is the Claude Code build reference.** Every architectural decision is final.

**Companion docs:**
- [Part 2 — Modules, Frontend, Background Jobs, Offline](./wareos_v2_final_part2.md)
- [Part 3 — Testing, DevOps, Security, Scalability, Roadmap](./wareos_v2_final_part3.md)
- [Design System Reference](./design_reference.html)

**Last updated:** 2026-03-12

---

## 1. Vision & Scope

General-purpose, multi-tenant SaaS for inventory + warehouse management. **Zoho Inventory feature parity** minus accounting/compliance. Serves any industry: agriculture, retail, manufacturing, FMCG, electronics. Renames "commodities" → **"items"**.

### Target Users

| Role | Use Case |
|---|---|
| **Warehouse Manager** | Orders, stock, transfers, documents |
| **Warehouse Operator / Picker** | Receive goods, pick & pack, scan barcodes (mobile/PWA) |
| **Tenant Admin** | Users, permissions, locations, items, custom fields |
| **Super Admin** (platform) | Tenant provisioning, access requests, platform health |
| **Customer** (portal, Phase 3) | View orders, track shipments, update info |
| **Vendor** (portal, Phase 3) | View POs, confirm deliveries |

### Zoho Feature Map (64 features audited)

| Zoho Feature | WareOS Status | Phase | Notes |
|---|---|---|---|
| Items (stock on hand, committed, available) | ✅ Core | 1 | General-purpose items |
| Item Groups (variants by color/size) | 🆕 Planned | 2 | Variant-level tracking |
| Composite Items (bundles/kits/BOM) | 🆕 Planned | 4 | Assemble kits from components |
| Inventory Adjustments (qty + value) | ✅ Core | 1 | Extend with value adjustments |
| Price Lists | 🆕 Planned | 2 | Per-customer, bulk discount tiers |
| Serial Number Tracking | 🆕 Planned | 2 | Individual unit tracking |
| Batch/Expiry Tracking | ✅ Planned | 2 | + expiry alerts, FIFO |
| Barcode Generation & Scanning | ✅ Planned | 2 | + serial/batch scan workflows |
| Multi-Warehouse | ✅ Core | 1 | Locations (warehouse/store/yard) |
| Transfer Orders | ✅ Core | 1 | In-transit + shortage tracking |
| Warehouse Restrictions | ✅ Core | 1 | `user_locations` |
| Picklists | 🆕 Planned | 2 | Order fulfillment picking |
| Sales/Purchase Orders | ✅ Core | 1 | + custom statuses |
| Packages & Shipments | 🆕 Planned | 2 | Pack → Ship → Track lifecycle |
| Returns (sale + purchase) | 🆕 Planned | 2 | + credit memos |
| Backorders | 🆕 Planned | 2 | Auto-create on stock-out |
| Delivery Challans | ✅ Planned | 2 | PDF generation |
| Multi-Currency | 🆕 Planned | 3 | Currency per contact, exchange rates |
| Customer/Vendor Portal | 🆕 Planned | 3 | Self-service portals |
| Users & Roles | ✅ Core | 1 | + role templates |
| Custom Templates | 🆕 Planned | 3 | Tenant-customizable PDF templates |
| Reporting Tags | 🆕 Planned | 3 | Tag-based report filtering |
| Automation / Workflow Rules | 🆕 Planned | 3 | If-this-then-that per module |
| Webhooks | 🆕 Planned | 3 | Event-driven external notifications |
| Bin/Shelf/Rack Locations | 🆕 Planned | 3 | Sub-warehouse location tracking (gap from Zoho audit) |
| Shipping Carrier Integration | 🆕 Planned | 3 | Delhivery/Shiprocket for India (gap from Zoho audit) |
| Mobile App | 🔜 PWA Phase 2 | 2/4 | Online-first PWA Phase 2, React Native Phase 4 |
| GST/E-Invoice/Accounting | ⏭️ Excluded | — | Tally handles this |

---

## 2. Architecture Decision: Solution D (Vercel + Inngest)

> [!IMPORTANT]
> **Hosting is settled: Vercel Pro + Inngest + Supabase + Upstash Redis.**
> This was chosen over VPS + Coolify (Solution B) specifically because:
> 1. **Claude Code compatibility** — single-deploy model, file-based Inngest functions, no Docker/SSH
> 2. **Durable step functions** — Inngest's step-level retry is superior to DIY BullMQ
> 3. **Zero server management** — critical for a solo founder who is new to coding
> 4. **The cost trade-off is acceptable** — $20/mo floor vs $4/mo, but saves weeks of DevOps

```
  Vercel Pro ($20/mo) — Fluid Compute enabled
  ┌──────────────────────────────────────────────────┐
  │ Next.js App                                       │
  │ ┌──────────────┐  ┌────────────────────────────┐  │
  │ │ Pages (SSR)  │  │ API Routes (/api/v1/...)   │  │
  │ │              │  │ 5 min Fluid Compute timeout│  │
  │ └──────────────┘  └────────────────────────────┘  │
  │                                                    │
  │ ┌────────────────────────────────────────────────┐ │
  │ │ Inngest Functions (run inside Vercel functions) │ │
  │ │  • Bulk imports (chunked into steps)            │ │
  │ │  • PDF reports                                  │ │
  │ │  • Stock alert cron (every 5 min)               │ │
  │ │  • Event bus: sale/confirmed → create picklist  │ │
  │ │  • Webhook fan-out                              │ │
  │ │  • Retry + error recovery per step              │ │
  │ └────────────────────────────────────────────────┘ │
  └───────────────────────┬────────────────────────────┘
                          ▼
  ┌──────────────────────────────────────────────────┐
  │ Supabase (Free → Pro)                            │
  │ Postgres + Auth + Realtime + Storage             │
  ├──────────────────────────────────────────────────┤
  │ Upstash Redis (Free → Paid)                      │
  │ Rate limiting + JWT blocklist + caching           │
  └──────────────────────────────────────────────────┘
```

### Cost Trajectory

| Scale | Vercel | Inngest | Supabase | Upstash | Resend | Sentry | Total |
|---|---|---|---|---|---|---|---|
| **Dev / Pre-revenue** | $20 | $0 | $0 | $0 | $0 | $0 | **$20/mo** |
| **Up to 50 tenants** | $20 | $0 | $25 | $0 | $0 | $0 | **$45/mo** |
| **50–200 tenants** | $20 | ~$50 | $25 | $5 | $0 | $0 | **$100/mo** |
| **200–500 tenants** | $20 | ~$150 | $35 | $10 | $20 | $0 | **$235/mo** |
| **500+ tenants** | $20 | ~$250 | $35+ | $15 | $20 | $26 | **$366/mo** |

---

## 3. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR + RSC + co-located API routes. Stable, well-documented. Upgrade to 16 later. |
| Language | TypeScript (strict) | End-to-end type safety |
| ORM | **Drizzle ORM** | Lightweight, edge-compatible, type-safe, near-SQL |
| Database | **Supabase** (PostgreSQL 15) | Managed Postgres + Auth + Realtime + Storage |
| Auth | Supabase Auth + **Custom JWT Claims** | Zero-DB-hit middleware |
| UI | Tailwind CSS v4 + shadcn/ui | Utility-first, accessible |
| Tables | TanStack Table v8 | Headless: sort, filter, pagination |
| Validation | Zod v4 | Runtime validation, shared types |
| Background Jobs | **Inngest** (from day 1) | Durable step functions, event bus, cron scheduling |
| Cache | **Upstash Redis** (from day 1) | Rate limiting, JWT blocklist, job progress |
| PDF | @react-pdf/renderer | Challans, GRNs, packing slips (Phase 2) |
| Barcode | qrcode + JsBarcode | QR + 1D barcode generation (Phase 2) |
| CSV | PapaParse | Bulk import/export (Phase 2) |
| Email | Resend | Transactional emails |
| Testing | Vitest + Playwright | Unit + E2E |
| Charts | Recharts | Stock trends, movement bars, top-items pie |

### Why Drizzle Over Prisma

| Concern | Prisma | Drizzle |
|---|---|---|
| Edge/serverless | ⚠️ Heavy, cold start issues | ✅ Lightweight (~50KB), edge-compatible |
| SQL closeness | Abstracted | Near-SQL, easy raw when needed |
| Type safety | ✅ Generated types | ✅ Inferred types from schema |
| Migration | Schema-based | SQL-based, one command for all tenants |

### Growth-Phase Additions

| When | Add | Why |
|---|---|---|
| 50+ tenants | Read replicas | Offload analytics queries |
| Phase 4 | React Native (Expo) | Share Zod schemas + API types |
| Full-text search needed | Meilisearch | Fast search across items, orders, contacts |
| Production monitoring | Sentry + Axiom | Error tracking + structured logging |
| Feature flags | PostHog | Granular toggling beyond module enable/disable |

---

## 4. Multi-Tenancy: Shared-Schema + `tenant_id` + RLS

> [!IMPORTANT]
> **Architectural decision.** Schema-per-tenant is replaced by **shared-schema with `tenant_id` column + Row Level Security.** This eliminates migration-explosion (1 migration serves all tenants), enables standard connection pooling, and removes partial-failure risk.

### How It Works

```
┌─────────────────────────────────────────────┐
│              PostgreSQL (single schema)      │
│                                              │
│  items          tenant_id = 'acme'    ─┐     │
│  items          tenant_id = 'stark'   ─┤ RLS │
│  items          tenant_id = 'wayne'   ─┘     │
│                                              │
│  All tenants share the same tables.          │
│  RLS ensures Acme can NEVER see Stark's data.│
└─────────────────────────────────────────────┘
```

### RLS Policies (Database-Level Isolation)

```sql
-- Every tenant-scoped table has a tenant_id column
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON items
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Service role bypasses RLS (for admin/migration operations)
```

### Drizzle Schema: Single Definition, Tenant-Scoped Queries

```typescript
// packages/db/schema/items.ts — ONE definition, no schema parameterization needed
import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull(),         // ← Every table has this
  name:           text('name').notNull(),
  code:           text('code').notNull(),
  sku:            text('sku'),
  type:           text('type').notNull().default('goods'),
  category:       text('category'),
  defaultUnitId:  uuid('default_unit_id').references(() => units.id),
  purchasePrice:  numeric('purchase_price'),
  sellingPrice:   numeric('selling_price'),
  tags:           text('tags').array(),
  reorderLevel:   numeric('reorder_level'),
  isActive:       boolean('is_active').notNull().default(true),
  customFields:   jsonb('custom_fields').notNull().default({}),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:      timestamp('deleted_at', { withTimezone: true }),
});

// Unique constraint scoped to tenant
// CREATE UNIQUE INDEX idx_items_code ON items(tenant_id, code) WHERE deleted_at IS NULL;
```

### Automatic Tenant Scoping (Developer Never Forgets)

```typescript
// packages/db/tenant-scope.ts
import { eq, and, isNull } from 'drizzle-orm';

export function withTenantScope(db: DrizzleClient, tenantId: string) {
  return {
    // SELECT with automatic tenant_id + soft-delete filter
    query: <T extends PgTable>(table: T) =>
      db.select().from(table)
        .where(and(eq(table.tenantId, tenantId), isNull(table.deletedAt))),

    // INSERT with automatic tenant_id injection
    insert: <T extends PgTable>(table: T, values: Omit<InsertType<T>, 'tenantId'>) =>
      db.insert(table).values({ ...values, tenantId } as any),

    // UPDATE scoped to tenant
    update: <T extends PgTable>(table: T) =>
      db.update(table).where(eq(table.tenantId, tenantId)),

    // Soft delete
    softDelete: <T extends PgTable>(table: T, id: string) =>
      db.update(table)
        .set({ deletedAt: new Date() })
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
  };
}

// Usage in API route:
const tenant = withTenantScope(db, ctx.tenantId);
const allItems = await tenant.query(items);
await tenant.insert(items, { name: 'Widget', code: 'WDG-001', type: 'goods' });
```

### Migration: One Command, All Tenants

```bash
# Standard Drizzle migration — runs ONCE, applies to all tenants
pnpm drizzle-kit generate  # Generate SQL from schema changes
pnpm drizzle-kit push       # Apply to production DB
```

No loops. No partial failures. No tenant #432 out-of-sync.

### Enterprise Upsell: Dedicated Database

For enterprise customers who require physical isolation, offer a **dedicated Supabase instance**. The app code is identical — just point their `DATABASE_URL` to their dedicated instance. Deployment config change, not a code change.

---

## 5. JWT Middleware (Zero DB Hits)

### The Problem with DB Lookups in Middleware

V1 middleware hits the database on **every request** to resolve tenant context. This is a global performance bottleneck — middleware runs on every route, including static assets.

### Custom Claims Injected on Login

```typescript
// Supabase Auth Hook or Edge Function
async function onUserSignIn(userId: string) {
  const memberships = await db.select().from(userTenants)
    .where(eq(userTenants.userId, userId))
    .innerJoin(tenants, eq(tenants.id, userTenants.tenantId));

  const defaultTenant = memberships.find(m => m.isDefault) || memberships[0];

  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      tenant_id: defaultTenant.tenantId,
      tenant_slug: defaultTenant.tenant.slug,
      role: defaultTenant.role,
      enabled_modules: defaultTenant.tenant.enabledModules,
      memberships: memberships.map(m => ({
        tenantId: m.tenantId,
        slug: m.tenant.slug,
        role: m.role,
      })),
    },
  });
}
```

### Middleware: JWT Decode Only

```typescript
// src/middleware.ts — NO database calls
export async function middleware(request: NextRequest) {
  const token = getAccessToken(request);
  if (!token) return redirectToLogin(request);

  try {
    const decoded = jwtDecode<AppJwtPayload>(token);
    const { tenant_id, tenant_slug, role, enabled_modules } = decoded.app_metadata;

    // Multi-tenant user switching: check memberships array
    const urlSlug = extractTenantSlug(request.nextUrl.pathname);
    if (urlSlug && urlSlug !== tenant_slug) {
      const membership = decoded.app_metadata.memberships?.find(m => m.slug === urlSlug);
      if (!membership) return redirectToHome(request);
    }

    // Inject tenant context as headers
    const headers = new Headers(request.headers);
    headers.set('x-tenant-id', tenant_id);
    headers.set('x-tenant-slug', tenant_slug);
    headers.set('x-tenant-role', role);
    headers.set('x-tenant-modules', JSON.stringify(enabled_modules));
    headers.set('x-user-id', decoded.sub);

    return NextResponse.next({ request: { headers } });
  } catch {
    return redirectToLogin(request);
  }
}
```

### Token Refresh Strategy

| Event | Action |
|---|---|
| Admin enables/disables module | Update `app_metadata` → force refresh |
| User role/permissions change | Update `app_metadata` → force refresh |
| User switches tenant | Update `app_metadata` with new active tenant → refresh |
| Token expires naturally | Supabase auto-refreshes (1 hour default) |

---

## 6. Database Schema

> All tenant-scoped tables include `tenant_id UUID NOT NULL` and a unique index scoped to `(tenant_id, code)` where applicable.

### 6.1 Public Schema (Platform-Level)

```sql
CREATE TABLE public.tenants (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    slug             TEXT NOT NULL UNIQUE,
    status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','suspended','archived')),
    enabled_modules  JSONB NOT NULL DEFAULT '["inventory"]',
    plan             TEXT NOT NULL DEFAULT 'free'
                     CHECK (plan IN ('free','starter','professional','enterprise')),
    settings         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner','admin','member')),
    is_default  BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id, tenant_id)
);

CREATE TABLE public.super_admins (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE
);
```

### 6.2 Core Tables (Phase 1 MVP)

```sql
CREATE TABLE items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    sku             TEXT,
    description     TEXT,
    category        TEXT,
    type            TEXT NOT NULL DEFAULT 'goods'
                    CHECK (type IN ('goods','service','composite')),
    item_group_id   UUID REFERENCES item_groups(id),
    default_unit_id UUID REFERENCES units(id),
    purchase_price  NUMERIC,
    selling_price   NUMERIC,
    hsn_code        TEXT,
    image_url       TEXT,
    tags            TEXT[],
    reorder_level   NUMERIC,
    shelf_life_days INT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE locations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    name              TEXT NOT NULL,
    code              TEXT NOT NULL,
    type              TEXT NOT NULL DEFAULT 'warehouse'
                      CHECK (type IN ('warehouse','store','yard','external')),
    address           TEXT,
    geo_point         JSONB,
    capacity          NUMERIC,
    parent_location_id UUID REFERENCES locations(id),
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE TABLE units (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    name              TEXT NOT NULL,
    abbreviation      TEXT NOT NULL,
    type              TEXT NOT NULL DEFAULT 'weight',
    base_unit_id      UUID REFERENCES units(id),
    conversion_factor NUMERIC DEFAULT 1,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'customer'
                    CHECK (type IN ('supplier','customer','both')),
    email           TEXT,
    phone           TEXT,
    gst_number      TEXT,
    address         TEXT,
    credit_limit    NUMERIC,
    payment_terms   INT,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE item_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    attribute_names TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
```

### 6.3 Transaction Tables (Phase 1 MVP)

| Table | Key Columns | Status Values |
|---|---|---|
| `sales` | sale_number, contact_id, location_id, status, shipping_address, tracking_number, custom_status | draft → confirmed → dispatched → cancelled |
| `sale_items` | sale_id, item_id, unit_id, quantity, unit_price, serial_numbers[], batch_id | |
| `purchases` | purchase_number, contact_id, location_id, status, expected_delivery_date | draft → ordered → received → cancelled |
| `purchase_items` | purchase_id, item_id, unit_id, quantity, unit_price | |
| `transfers` | transfer_number, origin_location_id, dest_location_id, status | draft → dispatched → in_transit → received |
| `transfer_items` | transfer_id, item_id, sent_qty, received_qty, **shortage** (GENERATED ALWAYS) | |
| `adjustments` | adjustment_number, location_id, reason, type (qty/value), status | draft → approved |
| `adjustment_items` | adjustment_id, item_id, unit_id, qty_change, value_change | |

### 6.4 Future Tables (Phase 2–4, schema defined now for reference)

```sql
-- Composite Items / BOM (Phase 4)
CREATE TABLE composite_items (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id),
    UNIQUE(item_id)
);

CREATE TABLE composite_item_components (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composite_id      UUID NOT NULL REFERENCES composite_items(id) ON DELETE CASCADE,
    component_item_id UUID NOT NULL REFERENCES items(id),
    quantity          NUMERIC NOT NULL CHECK (quantity > 0),
    unit_id           UUID NOT NULL REFERENCES units(id)
);

-- Packages & Shipments (Phase 2)
CREATE TABLE packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    package_number  TEXT NOT NULL,
    sale_id         UUID NOT NULL REFERENCES sales(id),
    status          TEXT NOT NULL DEFAULT 'packed'
                    CHECK (status IN ('draft','packed','shipped','delivered','returned')),
    tracking_number TEXT,
    carrier         TEXT,
    weight          NUMERIC,
    dimensions      JSONB,
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE package_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    quantity     NUMERIC NOT NULL CHECK (quantity > 0)
);

-- Price Lists (Phase 2)
CREATE TABLE price_lists (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('sales','purchase')),
    is_percentage BOOLEAN NOT NULL DEFAULT false,
    percentage    NUMERIC,
    currency      TEXT DEFAULT 'INR',
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_list_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    item_id       UUID NOT NULL REFERENCES items(id),
    custom_price  NUMERIC NOT NULL,
    UNIQUE(price_list_id, item_id)
);

-- Picklists (Phase 2)
CREATE TABLE picklists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    picklist_number TEXT NOT NULL,
    sale_id         UUID REFERENCES sales(id),
    location_id     UUID NOT NULL REFERENCES locations(id),
    assigned_to     UUID,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE picklist_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picklist_id  UUID NOT NULL REFERENCES picklists(id) ON DELETE CASCADE,
    item_id      UUID NOT NULL REFERENCES items(id),
    unit_id      UUID NOT NULL REFERENCES units(id),
    required_qty NUMERIC NOT NULL,
    picked_qty   NUMERIC DEFAULT 0,
    bin_location TEXT
);

-- Workflow Automation (Phase 3)
CREATE TABLE workflow_rules (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    name         TEXT NOT NULL,
    module       TEXT NOT NULL,
    trigger      TEXT NOT NULL,
    conditions   JSONB NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_actions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id      UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    config       JSONB NOT NULL,
    sort_order   INT NOT NULL DEFAULT 0
);

-- Bin Locations (Phase 3 — identified in Zoho gap analysis)
CREATE TABLE bins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id),
    bin_code    TEXT NOT NULL,
    aisle       TEXT,
    rack        TEXT,
    shelf       TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);
-- CREATE UNIQUE INDEX idx_bins_code ON bins(tenant_id, location_id, bin_code) WHERE deleted_at IS NULL;
```

### 6.5 Supporting Tables

| Table | Purpose | Phase |
|---|---|---|
| `user_profiles` | Per-tenant: display_name, phone, permissions JSONB | 1 |
| `user_locations` | User ↔ Location access restriction | 1 |
| `custom_field_definitions` | Tenant-defined fields on any entity | 1 |
| `audit_log` | Append-only: user, action, entity, old/new data | 1 |
| `sequence_counters` | Auto-numbering: DSP-000001, PUR-000001, etc. | 1 |
| `alert_thresholds` | Per-item, per-location low-stock alerts | 1 |
| `payments` | Payment records for purchases and sales | 1 |
| `returns` / `return_items` | Sale + purchase returns with credit memos | 2 |
| `lots` / `batches` | Batch/expiry tracking | 2 |

### 6.6 stock_levels VIEW

Same computed VIEW as v1 (inbound/outbound/in_transit CTEs), but with `tenant_id` scoping. At scale → **MATERIALIZED VIEW** refreshed by Inngest cron every 5 min.

---

## 7. Auth & Permissions

### Role Hierarchy

```
owner → admin → manager → operator → viewer
```

### Permission Model (Granular, Module-Based)

```typescript
export type Role = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';

export const ROLE_HIERARCHY: Record<Role, Permission[]> = {
  viewer:   ['inventory:read', 'items:read', 'contacts:read'],
  operator: ['...viewer', 'orders:create', 'orders:update', 'receive:create', 'barcodes:scan'],
  manager:  ['...operator', 'orders:delete', 'transfers:create', 'reports:read', 'adjustments:create'],
  admin:    ['...manager', 'users:manage', 'settings:manage', 'modules:manage', 'audit:read'],
  owner:    ['...admin', 'tenant:manage', 'billing:manage'],
};

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
  | 'packages:create' | 'packages:update' | 'shipments:track';
```

### Enforcement at 3 Layers

1. **JWT claims** (middleware) — route-level access
2. **API route guard** — `withTenantContext()` permission check
3. **UI filtering** — sidebar/buttons hidden based on role

---

## 8. API Layer Design

### Standardized Route Pattern with Drizzle

```typescript
// src/app/api/v1/t/[tenantSlug]/items/route.ts
import { withTenantContext } from '@/core/api/guards';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  sku: z.string().optional(),
  type: z.enum(['goods', 'service', 'composite']).default('goods'),
  category: z.string().optional(),
  defaultUnitId: z.string().uuid().optional(),
  purchasePrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const POST = withTenantContext(async (req, ctx) => {
  const body = createItemSchema.parse(await req.json());
  const tenant = withTenantScope(db, ctx.tenantId);
  const [item] = await tenant.insert(items, body);

  // Audit log
  await tenant.insert(auditLog, {
    userId: ctx.userId,
    action: 'create',
    entityType: 'item',
    entityId: item.id,
    newData: item,
  });

  return Response.json(item, { status: 201 });
});
```

### Day-1 API Patterns

| Pattern | Implementation |
|---|---|
| **Validation** | Zod at every API boundary |
| **Audit logging** | Every mutation → audit_log insert |
| **Soft deletes** | `SET deleted_at = now()`, never `DELETE` |
| **Sequence numbers** | `FOR UPDATE` row lock on sequence_counters |
| **Custom fields** | Validated against definitions, stored in JSONB |
| **Idempotency** | `Idempotency-Key` header for POST requests (Redis dedup) |
| **Rate limiting** | Upstash Redis: per-tenant, per-IP |
| **API versioning** | `/api/v1/t/{slug}/...` from day 1 |

---

> **Continues in [Part 2](./wareos_v2_final_part2.md)** → Modules, Frontend Architecture, Background Jobs, Offline PWA
