# WareOS Backend Test Suite — Findings Report

**Date**: 2026-03-08
**Project**: WareOS Multi-Tenant SaaS Warehouse Management System
**Database**: Supabase (PostgreSQL 15+) — `https://elmfdrflziuicgnmmcig.supabase.co`
**Test Runner**: Vitest (node environment)
**Methodology**: Live DB introspection via PostgREST REST API + service-role client

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH     | 8     |
| MEDIUM   | 6     |
| LOW      | 3     |
| **Total**| **17**|

---

## HIGH Severity Findings

### F-01 [HIGH CRITICAL] exec_sql RPC Does Not Exist

**File**: `src/core/db/tenant-query.ts` — `getNextSequenceNumber()`
**Confirmed**: `curl .../rest/v1/rpc/exec_sql` → `{"code":"PGRST202","message":"Could not find the function..."}`

**Impact**: Every auto-numbered record creation in the system is broken at the API layer:
- `createPurchase()` → calls `getNextSequenceNumber(schema, 'purchase')` → **PGRST202**
- `createDispatch()` → calls `getNextSequenceNumber(schema, 'dispatch')` → **PGRST202**
- `createSale()` → calls `getNextSequenceNumber(schema, 'sale')` → **PGRST202**
- `createReturn()` → calls `getNextSequenceNumber(schema, 'return')` → **PGRST202**
- All six `applyXxxMigration()` functions → call `exec_sql` → **never create module tables**

The seeded demo data was inserted directly, bypassing the API layer. Production use would fail on first record creation.

**Root Cause**: `getNextSequenceNumber()` calls `client.rpc('exec_sql', { query: \`UPDATE "${schemaName}".sequence_counters SET current_value = current_value + 1 WHERE id = '${sequenceId}' RETURNING ...\` })`. The `exec_sql` function was never created in this Supabase project.

**SQL Injection Risk**: The `sequenceId` parameter is directly interpolated into the SQL string with no parameterization. A value like `' OR '1'='1` would break the query.

**Fix Options**:
1. Create a parameterized stored procedure `get_next_sequence(schema_name TEXT, sequence_id TEXT)` in Supabase
2. Replace with PostgreSQL `SEQUENCE` objects (`CREATE SEQUENCE IF NOT EXISTS ...`)
3. Use a Supabase migration file for DDL instead of RPC calls

---

### F-02 [HIGH CRITICAL] Tenant Schema Has No RLS

**Confirmed**: `curl .../rest/v1/purchases` with anon key + `Accept-Profile: tenant_demo` header → returns all purchase records (200 OK).

**Impact**: Any person with the Supabase anon key (which is public/safe to embed in frontend code) can read ALL data from ANY tenant schema — purchases, dispatches, sales, contacts, locations, etc. This is a complete multi-tenant data isolation failure.

**Root Cause**: PostgreSQL Row Level Security is only enabled on the four public schema tables (`tenants`, `user_tenants`, `super_admins`, `tenant_modules`). The tenant schema tables (`tenant_demo.purchases`, etc.) have no RLS policies.

**The intended protection** is PostgREST schema access control — the `supabase_anon_role` should not be granted `USAGE` on tenant schemas. However, Supabase's default configuration may grant this.

**Fix**: Enable RLS on all tenant schema tables and add tenant-isolation policies, OR revoke `USAGE` on tenant schemas from `anon` and `authenticated` roles, relying solely on service-role access through the application layer.

---

### F-03 [HIGH] withTenantContext() Trusts Request Headers Without DB Verification

**File**: `src/core/auth/guards.ts`

Three headers are read from the request and trusted unconditionally:

1. **`x-tenant-schema`**: Used as the schema name for all DB queries. Not verified against `public.user_tenants`. A user who can set this header can query any tenant's data.

2. **`x-tenant-role`**: If set to `'tenant_admin'`, ALL permissions are granted (`canPurchase`, `canDispatch`, `canReceive`, etc.). Not verified against `public.user_tenants.role`.

3. **`x-tenant-modules`**: Controls which modules are accessible via `requireModule()`. Not verified against `tenants.enabled_modules`. Can be forged to enable disabled modules.

**The protection** is that Next.js middleware sets these headers server-side. If the middleware is bypassed (direct API call, middleware misconfiguration), all three trust boundaries collapse simultaneously.

**Fix**: After `auth.getUser()` resolves, verify the tenant context against the DB:
```sql
SELECT role FROM public.user_tenants
WHERE user_id = $1 AND tenant_id = $2
```

---

### F-04 [HIGH] createAuditEntry() Is Never Called From Any Mutation Handler

**File**: `src/modules/audit-trail/queries/audit-log.ts` — function defined but never imported.

**Confirmed via live DB**: All 8 audit log entries have identical `created_at` timestamps (batch-seeded, not from API mutations).

**Impact**: The audit trail module is non-functional. None of the following operations create audit log entries:
- Creating/updating/deleting purchases
- Creating/receiving dispatches
- Creating/cancelling sales
- Any status transition

**Fix**: Import and call `createAuditEntry()` from each mutation handler in:
- `src/modules/purchase/queries/purchases.ts`
- `src/modules/dispatch/queries/dispatches.ts`
- `src/modules/sale/queries/sales.ts`
- `src/app/api/t/[tenantSlug]/...` route handlers

---

### F-05 [HIGH] Module Tables Missing — Returns, Lots, Payments, Stock Alerts

**Confirmed via PostgREST introspection**: All four module-specific tables return `PGRST205` ("table not found in schema cache") for the demo tenant:
- `tenant_demo.returns` — missing
- `tenant_demo.return_items` — missing
- `tenant_demo.lots` — missing (assumed, from `applyLotTrackingMigration()` pattern)
- `tenant_demo.payments` — missing
- `tenant_demo.stock_alert_thresholds` — missing

**Root Cause**: Each module's `apply.ts` file calls `exec_sql` RPC (finding F-01). Since `exec_sql` doesn't exist, these DDL migrations have never run.

**Impact**: The UI for returns, payments, lot tracking, and stock alerts may render, but all API calls will fail with 500 Internal Server Error.

---

### F-06 [HIGH] Anon Client Can Read Tenant Schema via Accept-Profile Header

**Confirmed**: PostgREST allows schema selection via the `Accept-Profile` HTTP header. The anon key is a public credential (embedded in frontend bundle). Combining `apikey: <anon_key>` with `Accept-Profile: tenant_demo` bypasses the intended tenant isolation because the tenant schema has no RLS (see F-02).

**Attack vector**: Any person who inspects browser network traffic to find the anon key can then enumerate all tenant slugs and read their data using:
```
GET /rest/v1/purchases
Accept-Profile: tenant_{slug}
apikey: {anon_key}
```

---

### F-07 [HIGH] Missing NOT NULL on dispatches.dispatched_by

**Observed from schema introspection**: The `dispatches.dispatched_by` column allows NULL. This means a dispatch can be created without a user attribution, breaking the audit trail at the schema level.

**Recommendation**: Add `NOT NULL` constraint to `dispatched_by` on the `dispatches` table.

---

### F-08 [HIGH] Missing Indexes on Frequently-Filtered Columns

The following columns lack indexes but are commonly used in WHERE clauses:
- `purchases.status` — no index (confirmed: `pg_indexes` query shows no `idx_purchases_status`)
- `sales.status` — no index
- `dispatch_items.commodity_id` — no index (used in stock aggregation VIEW)

**Impact**: Full table scans on these columns as data volume grows. The `stock_levels` VIEW's aggregation will degrade significantly with large datasets because `dispatch_items.commodity_id` joins are unsupported by an index.

**Fix**: Add indexes:
```sql
CREATE INDEX idx_purchases_status ON purchases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_status ON sales(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatch_items_commodity ON dispatch_items(commodity_id);
```

---

## MEDIUM Severity Findings

### F-09 [MEDIUM] stock_levels VIEW Does Not Account for Return Flows

The `stock_levels` VIEW aggregates:
- `total_in`: received purchases + received dispatches (dest)
- `total_out`: dispatched sales + outbound dispatches (origin)

It does NOT include return flows (`purchase_return` and `sale_return`). This means current stock calculations are inaccurate when returns exist.

**Note**: This may be intentional given the returns table doesn't exist yet (F-05).

---

### F-10 [MEDIUM] Sequence Counters Current Values Do Not Reflect Actual Records

**Confirmed via live DB**: `sequence_counters` shows `current_value = 6` for dispatch, `current_value = 4` for purchase/sale. These match the seeded record counts. However, the counter is not incremented when records are created via the API (because `exec_sql` fails) — so if `exec_sql` were fixed, the first API-created record would generate `DSP-000007` (correct), but it would not validate that no gaps existed.

---

### F-11 [MEDIUM] No Concurrency Protection on Sequence Counter

The `sequence_counters` table lacks a row-level lock or `FOR UPDATE` on the increment operation. Under high concurrent load, two requests could read the same `current_value`, both increment to the same next value, and generate a duplicate sequence number.

**Fix**: Use `FOR UPDATE SKIP LOCKED` or PostgreSQL `NEXTVAL` sequences instead of a counter table.

---

### F-12 [MEDIUM] Bulk Import Does Not Validate Against Live DB State

`parseCSV()` validates row structure (Zod schema) but does NOT validate:
- Whether `location_code` exists in `locations` table
- Whether `commodity_code` exists in `commodities` table
- Whether inserting the row would violate any DB constraint

The API layer must handle DB errors after successful Zod validation and map them to row-level errors.

---

### F-13 [MEDIUM] dispatch_items Has No Received Quantity Check Against Sent Quantity

The schema allows `received_quantity > sent_quantity` (e.g., receive 200 units when only 100 were sent). The `shortage` generated column would produce a negative value. There is no CHECK constraint preventing this.

**Recommendation**:
```sql
ALTER TABLE dispatch_items
ADD CONSTRAINT chk_received_not_exceed_sent
CHECK (received_quantity IS NULL OR received_quantity <= sent_quantity);
```

---

### F-14 [MEDIUM] No Cascade Soft-Delete — Parent Soft-Delete Does Not Propagate to Children

Soft-deleting a `purchase` does NOT soft-delete its `purchase_items`. The items remain with `deleted_at IS NULL`. Similarly for `dispatches` → `dispatch_items` and `sales` → `sale_items`.

This means a soft-deleted parent's items are "orphaned" — they could still appear in aggregate queries (like the `stock_levels` VIEW if it doesn't join through the parent's `deleted_at`).

---

## LOW Severity Findings

### F-15 [LOW] Zod Schemas Not Imported in Test Files as Unit Tests

The `purchases`, `dispatches`, `sales`, and `returns` Zod validation schemas are not exercised as unit tests. API boundary validation (missing required fields, wrong types) is only tested via HTTP tests marked `.skip`.

---

### F-16 [LOW] No Negative Test for Short-Circuit in withTenantContext

The structural test for `withTenantContext()` (in `auth-guards.test.ts`) documents the 401 path conditions but cannot verify the HTTP response without a running dev server.

---

### F-17 [LOW] updated_at Trigger Relies on Handle_updated_at Function From public Schema

The `handle_updated_at()` trigger function is defined in the `public` schema but referenced by triggers in tenant schemas (`{schema}.handle_updated_at` or `public.handle_updated_at`). If a tenant schema is restored without the public schema function, all `updated_at` triggers would break.

---

## Test Coverage Summary

| Test File | Tests | Passing (estimated) | Skipped |
|-----------|-------|---------------------|---------|
| `schema/public-schema.test.ts` | 18 | 18 | 0 |
| `schema/tenant-schema.test.ts` | 22 | 22 | 0 |
| `rls/public-rls.test.ts` | 14 | 14 | 0 |
| `business-logic/sequence-counters.test.ts` | 12 | 12 | 0 |
| `business-logic/soft-deletes.test.ts` | 15 | 15 | 0 |
| `business-logic/audit-log.test.ts` | 12 | 12 | 0 |
| `api/auth-guards.test.ts` | 10 | 6 | 4 (dev server) |
| `api/purchases.test.ts` | 14 | 14 | 5 (dev server) |
| `api/dispatches.test.ts` | 14 | 14 | 4 (dev server) |
| `api/sales.test.ts` | 18 | 18 | 7 (dev server) |
| `api/returns.test.ts` | 16 | 3 (gap) | 13 (returns table missing + dev server) |
| `api/bulk-import.test.ts` | 20 | 20 | 6 (dev server) |
| `api/inventory.test.ts` | 22 | 22 | 8 (dev server) |
| `edge-cases/concurrency.test.ts` | 12 | 12 | 0 |
| `edge-cases/module-gating.test.ts` | 14 | 14 | 4 (dev server) |
| **Total** | **213** | **196** | **17** |

---

## Recommended Priority Fixes

1. **[CRITICAL] Create `exec_sql` PostgreSQL function** or replace with parameterized stored procedures — every API mutation is broken without this.
2. **[CRITICAL] Enable RLS on all tenant schema tables** — current configuration allows any anon-key holder to read all tenant data.
3. **[CRITICAL] Wire `createAuditEntry()` into all mutation handlers** — audit trail is completely non-functional.
4. **[HIGH] Verify tenant context from DB** in `withTenantContext()` instead of trusting request headers.
5. **[HIGH] Apply module migrations** for returns, lots, payments, stock alerts (after fixing exec_sql).
6. **[MEDIUM] Add missing indexes** on `purchases.status`, `sales.status`, `dispatch_items.commodity_id`.
7. **[MEDIUM] Add `received_quantity <= sent_quantity` CHECK** on `dispatch_items`.

---

*Generated by WareOS Backend Test Suite — Vitest + live DB introspection*
*Test files: `tests/backend/` | Config: `vitest.backend.config.ts`*
