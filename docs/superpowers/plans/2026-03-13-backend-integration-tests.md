# WareOS v2 — Comprehensive Backend & DB Integration Test Suite

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an extensive backend test suite with 40-50 entries across all modules, 10 user accounts with varied permissions, verifying CRUD operations, tenant isolation, stock level calculations, audit trails, status transitions, soft deletes, and RBAC — all hitting the real database.

**Architecture:** Tests use Vitest with a dedicated backend config (`vitest.backend.config.ts`) running sequentially in a single fork against the real Supabase Postgres via `DATABASE_URL`. Factory functions insert directly via Drizzle (bypassing query modules to avoid Inngest dependency during setup). Transaction lifecycle tests mock Inngest and call actual query functions. Cleanup hard-deletes all test data by tenant ID.

**Tech Stack:** Vitest, Drizzle ORM, postgres-js, Supabase Postgres, `vi.mock` for Inngest

---

## Test Data Blueprint (48 entries)

| Category | Count | Details |
|----------|-------|---------|
| Tenants | 2 | Tenant A (all modules), Tenant B (isolation) |
| User memberships | 11 | 10 in A + 1 cross-tenant in B |
| User profiles | 10 | All 10 users |
| User-location assignments | 6 | Managers + operators + viewer2 |
| Units | 3 | Piece, Kilogram, Box |
| Locations | 3 | Warehouse Alpha, Warehouse Beta, Store Front |
| Items | 5 | Widget, Gadget, Bolt, Nut, Spring |
| Contacts | 4 | 2 suppliers, 2 customers |
| Purchases (+ line items) | 3 (+7) | Draft, ordered, received |
| Sales (+ line items) | 3 (+5) | Draft, confirmed, dispatched |
| Transfers (+ line items) | 2 (+3) | Dispatched, received (with shortage) |
| Adjustments (+ line items) | 2 (+2) | Draft, approved |
| Payments | 3 | Linked to PUR-3, SAL-3, SAL-2 |
| Alert thresholds | 2 | Widget@Alpha, Bolt@Beta |
| Custom field defs | 2 | Item batch_number, purchase po_reference |
| **Total** | **~48 main + 17 line items** | |

### 10 User Accounts

| # | Key | Role | Location Access | Notes |
|---|-----|------|-----------------|-------|
| 1 | owner | owner | All | Tenant A owner |
| 2 | admin1 | admin | All | Full admin |
| 3 | admin2 | admin | All | Second admin |
| 4 | manager1 | manager | Alpha only | Warehouse Alpha manager |
| 5 | manager2 | manager | Beta only | Warehouse Beta manager |
| 6 | operator1 | operator | Alpha only | Floor operator |
| 7 | operator2 | operator | Beta only | Floor operator |
| 8 | viewer1 | viewer | All | Read-only, all locations |
| 9 | viewer2 | viewer | Alpha only | Read-only, restricted |
| 10 | crossTenant | viewer (A), admin (B) | All in B | Isolation testing |

### Stock Level Expected Values (after setup)

Only **received** purchases, **confirmed/dispatched** sales, **dispatched+** transfers, and **approved** adjustments affect stock:

| Item | Location | Source | total_in | total_out | current_stock | in_transit |
|------|----------|--------|----------|-----------|---------------|------------|
| Widget | Beta | PUR-3 received (200), TFR-1 in_transit (50 inbound) | 200 | 0 | 200 | 50 |
| Spring | Beta | PUR-3 received (300), TFR-2 sent (100) | 300 | 100 | 200 | 0 |
| Spring | Alpha | TFR-2 received (95) | 95 | 0 | 95 | 0 |
| Widget | Alpha | TFR-1 dispatched out (50) | 0 | 50 | -50 | 0 |
| Bolt | Alpha | SAL-3 dispatched (100) | 0 | 100 | -100 | 0 |
| Gadget | Beta | SAL-2 confirmed (20) | 0 | 20 | -20 | 0 |
| Nut | Alpha | ADJ-2 approved (-10) | 0 | 10 | -10 | 0 |

*(Draft PUR-1, ordered PUR-2, draft SAL-1, draft ADJ-1 do NOT affect stock)*

---

## File Structure

```
tests/
  helpers/
    db.ts              — Re-exports db, schema, withTenantScope, queryStockLevels
    factories.ts       — Factory functions for all entity types (direct Drizzle inserts)
    cleanup.ts         — Hard-delete all test data by tenantId (reverse FK order)
    test-data.ts       — Pre-generated UUIDs & constants for all test entities
  backend/
    setup.test.ts              — Creates 48 entries, verifies basic counts (25 tests)
    tenant-isolation.test.ts   — Tenant B sees 0 of A's data (15 tests)
    stock-levels.test.ts       — Stock VIEW calculations (12 tests)
    audit-trail.test.ts        — Audit entries for mutations via query functions (10 tests)
    transactions.test.ts       — Full lifecycle + invalid transitions (20 tests)
    soft-delete.test.ts        — Soft delete filtering (8 tests)
    role-permissions.test.ts   — RBAC permission matrix (15 tests)
vitest.backend.config.ts       — Separate config: node env, sequential, single-fork
```

**Critical files to reference during implementation:**
- `src/core/db/drizzle.ts` — DB client (`db`)
- `src/core/db/tenant-scope.ts` — `withTenantScope(db, tenantId)`
- `src/core/db/stock-levels.ts` — `queryStockLevels(db, tenantId, filters?)`
- `src/core/db/schema/*.ts` — All 16 schema files (table definitions)
- `src/core/auth/permissions.ts` — `hasPermission`, `requirePermission`, `ROLE_PERMISSIONS`
- `src/modules/purchase/queries/purchases.ts` — `createPurchase`, `updatePurchaseStatus`, `softDeletePurchase`
- `src/modules/sale/queries/sales.ts` — `createSale`, `updateSaleStatus`
- `src/modules/transfer/queries/transfers.ts` — `createTransfer`, `updateTransferStatus`, `receiveTransfer`
- `src/modules/inventory/queries/items.ts` — `createItem`, `updateItem`, `softDeleteItem`, `listItems`, `getItem`
- `src/modules/inventory/queries/sequence.ts` — `getNextSequence(tenantId, sequenceId, prefix)`

---

## Chunk 1: Infrastructure (helpers + config)

### Task 1: Create `vitest.backend.config.ts`

**Files:**
- Create: `vitest.backend.config.ts`
- Modify: `package.json` (add `test:backend` script)

- [ ] **Step 1: Write the config file**

```typescript
// vitest.backend.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/backend/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    sequence: { concurrent: false },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 2: Add `test:backend` script to `package.json`**

Add to `"scripts"`:
```json
"test:backend": "vitest run --config vitest.backend.config.ts"
```

- [ ] **Step 3: Verify config loads**

Run: `pnpm test:backend --passWithNoTests`
Expected: 0 tests found, no errors

- [ ] **Step 4: Commit**

```bash
git add vitest.backend.config.ts package.json
git commit -m "test: add backend vitest config with sequential single-fork execution"
```

---

### Task 2: Create `tests/helpers/test-data.ts`

**Files:**
- Create: `tests/helpers/test-data.ts`

- [ ] **Step 1: Write the test data constants file**

Contains pre-generated UUIDs for all entities (2 tenants, 10 users, 3 locations, 3 units, 5 items, 4 contacts) plus a mutable `TRANSACTION_IDS` store for IDs generated during setup.

Use `randomUUID()` from `crypto` for all IDs. Include `TENANT_A_ID`, `TENANT_B_ID`, `TENANT_A_SLUG`, `TENANT_B_SLUG`, `USERS` map (10 entries with id/email/role), `LOCATIONS` map (3), `UNITS` map (3), `ITEMS` map (5 with prices), `CONTACTS` map (4).

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/test-data.ts
git commit -m "test: add pre-generated test data constants for backend suite"
```

---

### Task 3: Create `tests/helpers/db.ts`

**Files:**
- Create: `tests/helpers/db.ts`

- [ ] **Step 1: Write the DB helper (re-exports)**

```typescript
export { db } from '@/core/db/drizzle';
export type { Database } from '@/core/db/drizzle';
export { withTenantScope } from '@/core/db/tenant-scope';
export { queryStockLevels } from '@/core/db/stock-levels';
export * as schema from '@/core/db/schema';
export { sql, eq, and, isNull } from 'drizzle-orm';
```

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/db.ts
git commit -m "test: add db helper re-exports for backend tests"
```

---

### Task 4: Create `tests/helpers/factories.ts`

**Files:**
- Create: `tests/helpers/factories.ts`

- [ ] **Step 1: Write factory functions**

Factory functions for: `createTestTenant`, `createUserMembership`, `createUserProfile`, `createUserLocation`, `createTestUnit`, `createTestLocation`, `createTestItem`, `createTestContact`, `createTestPurchase` (with items), `createTestSale` (with items), `createTestTransfer` (with items), `createTestAdjustment` (with items), `createTestPayment`, `createTestAlertThreshold`, `createTestCustomField`, `createTestAuditEntry`.

Each factory:
- Takes `tenantId` + entity-specific data
- Accepts explicit `id` so we can use pre-generated IDs from test-data.ts
- Uses `db.insert(table).values({...}).returning()` directly (NOT withTenantScope, to avoid typing issues with explicit IDs)
- Returns the inserted row

Key detail: `purchaseItems`, `saleItems`, `transferItems`, `adjustmentItems` do NOT have `tenantId` — they are linked via parent FK only.

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/factories.ts
git commit -m "test: add factory functions for all entity types"
```

---

### Task 5: Create `tests/helpers/cleanup.ts`

**Files:**
- Create: `tests/helpers/cleanup.ts`

- [ ] **Step 1: Write cleanup function**

`cleanupAllTestData()` hard-deletes (SQL `DELETE FROM`) all test data for both `TENANT_A_ID` and `TENANT_B_ID` in reverse FK dependency order:

1. Line items (purchaseItems, saleItems, transferItems, adjustmentItems) — via subquery on parent tenantId
2. Transaction tables (payments, purchases, sales, transfers, adjustments)
3. Alert thresholds, custom field definitions
4. User associations (userLocations, userProfiles)
5. Sequence counters, audit log
6. Master data (items, contacts, locations, units)
7. User-tenant memberships (userTenants)
8. Tenants

Uses `db.execute(sql\`DELETE FROM table WHERE ...\`)` for each.

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/cleanup.ts
git commit -m "test: add cleanup helper for hard-deleting test data"
```

---

## Chunk 2: Setup Test (creates all 48 entries)

### Task 6: Create `tests/backend/setup.test.ts`

**Files:**
- Create: `tests/backend/setup.test.ts`

- [ ] **Step 1: Write the setup test file**

Structure:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, schema, withTenantScope, sql } from '../helpers/db';
import * as factory from '../helpers/factories';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TENANT_A_ID, TENANT_B_ID, TENANT_A_SLUG, TENANT_B_SLUG,
         USERS, LOCATIONS, UNITS, ITEMS, CONTACTS, TRANSACTION_IDS } from '../helpers/test-data';

beforeAll(async () => {
  // Clean slate
  await cleanupAllTestData();
});

afterAll(async () => {
  await cleanupAllTestData();
});
```

**Test sections:**

**describe('Tenants')**
- `it('creates tenant A with all modules')` — factory.createTestTenant, assert returned slug/status/enabledModules
- `it('creates tenant B for isolation')` — minimal modules

**describe('Users (10 accounts)')**
- `it('creates owner + 2 admins')` — 3 memberships + 3 profiles
- `it('creates 2 managers with location assignments')` — manager1→Alpha, manager2→Beta
- `it('creates 2 operators with location assignments')` — operator1→Alpha, operator2→Beta
- `it('creates 2 viewers (viewer2 restricted to Alpha)')` — viewer1: no location restriction, viewer2→Alpha
- `it('creates cross-tenant user (viewer in A, admin in B)')` — 2 memberships in different tenants

**describe('Inventory Entities')**
- `it('creates 3 units')` — Piece, Kilogram, Box
- `it('creates 3 locations')` — Warehouse Alpha, Warehouse Beta, Store Front
- `it('creates 5 items')` — Widget, Gadget, Bolt, Nut, Spring (all linked to Piece unit)
- `it('creates 4 contacts')` — 2 suppliers, 2 customers

**describe('Transactions')**
- `it('creates PUR-1 draft')` — Widget x100 @$100 + Gadget x50 @$200 at Alpha from SupplierA
- `it('creates PUR-2 ordered')` — Bolt x500 @$5 + Nut x1000 @$3 at Alpha from SupplierB
- `it('creates PUR-3 received')` — Widget x200 @$100 + Spring x300 @$15 at Beta from SupplierA
- `it('creates SAL-1 draft')` — Widget x10 @$150 at Alpha to CustomerA
- `it('creates SAL-2 confirmed')` — Gadget x20 @$300 at Beta to CustomerB
- `it('creates SAL-3 dispatched')` — Bolt x100 @$8 at Alpha to CustomerA
- `it('creates TFR-1 dispatched')` — Widget x50 Alpha→Beta
- `it('creates TFR-2 received')` — Spring x100 Beta→Alpha, receivedQty=95, shortage=5
- `it('creates ADJ-1 draft')` — Widget +25 at Alpha (type: qty)
- `it('creates ADJ-2 approved')` — Nut -10 at Alpha (type: qty)
- `it('creates 3 payments')` — linked to PUR-3, SAL-3, SAL-2
- `it('creates 2 alert thresholds')` — Widget@Alpha min 50, Bolt@Beta min 100
- `it('creates 2 custom field definitions')` — item/batch_number (text), purchase/po_reference (text)

**describe('Verification')**
- `it('total entity counts match expected')` — query each table with tenant scope, assert counts:
  - items: 5, locations: 3, units: 3, contacts: 4
  - purchases: 3, sales: 3, transfers: 2, adjustments: 2
  - payments: 3, alertThresholds: 2, customFieldDefinitions: 2
  - userProfiles: 10, userLocations: 6 (manager1+operator1+viewer2 at Alpha, manager2+operator2 at Beta... actually let's count: manager1→Alpha, manager2→Beta, operator1→Alpha, operator2→Beta, viewer2→Alpha = 5 assignments)

Save all transaction IDs to `TRANSACTION_IDS` for use by subsequent test files.

- [ ] **Step 2: Run setup test to verify it passes**

Run: `pnpm test:backend -- tests/backend/setup.test.ts`
Expected: All tests PASS, 48 entries created

- [ ] **Step 3: Commit**

```bash
git add tests/backend/setup.test.ts
git commit -m "test: add setup test creating 48 entries across all modules"
```

---

## Chunk 3: Tenant Isolation Tests

### Task 7: Create `tests/backend/tenant-isolation.test.ts`

**Files:**
- Create: `tests/backend/tenant-isolation.test.ts`

- [ ] **Step 1: Write tenant isolation tests**

Structure: Uses `beforeAll` to create test data (calls setup factories), `afterAll` to cleanup.

**15 test cases:**

```
describe('Tenant Isolation')
  describe('withTenantScope queries return zero rows for wrong tenant')
    it('tenant B sees 0 items')         — withTenantScope(db, TENANT_B_ID).query(items) → length 0
    it('tenant B sees 0 locations')
    it('tenant B sees 0 units')
    it('tenant B sees 0 contacts')
    it('tenant B sees 0 purchases')
    it('tenant B sees 0 sales')
    it('tenant B sees 0 transfers')
    it('tenant B sees 0 adjustments')
    it('tenant B sees 0 payments')
    it('tenant B sees 0 alert thresholds')
    it('tenant B sees 0 custom field definitions')
    it('tenant B sees 0 user profiles')

  describe('stock_levels VIEW isolation')
    it('queryStockLevels for tenant B returns empty')

  describe('Cross-tenant user queries')
    it('scope with tenant A ID returns items for tenant A')
    it('scope with tenant B ID returns 0 items despite same user existing in both')
```

NOTE: This file re-creates its own test data in `beforeAll` (calls the same factories as setup.test.ts) so it can run independently. Alternatively, if running the full suite sequentially, it can rely on setup.test.ts data. **Decision: make it self-contained with its own beforeAll/afterAll.**

- [ ] **Step 2: Run test**

Run: `pnpm test:backend -- tests/backend/tenant-isolation.test.ts`
Expected: All 15 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/backend/tenant-isolation.test.ts
git commit -m "test: add 15 tenant isolation tests verifying zero cross-tenant leakage"
```

---

## Chunk 4: Stock Levels Tests

### Task 8: Create `tests/backend/stock-levels.test.ts`

**Files:**
- Create: `tests/backend/stock-levels.test.ts`

- [ ] **Step 1: Write stock levels tests**

Self-contained with `beforeAll` that creates the exact fixture data needed:
- PUR-3 (received) at Beta: Widget x200, Spring x300
- SAL-2 (confirmed) at Beta: Gadget x20
- SAL-3 (dispatched) at Alpha: Bolt x100
- TFR-1 (dispatched) Alpha→Beta: Widget x50
- TFR-2 (received) Beta→Alpha: Spring sent 100, received 95
- ADJ-2 (approved) at Alpha: Nut -10
- PUR-1 (draft), PUR-2 (ordered), SAL-1 (draft), ADJ-1 (draft) — should NOT affect stock

**12 test cases:**

```
describe('Stock Levels VIEW')
  describe('Received purchases create inbound stock')
    it('Widget at Beta: currentStock=200 from PUR-3')
    it('Spring at Beta: 300 in from PUR-3, 100 out from TFR-2 = 200 current')

  describe('Draft/ordered purchases do NOT affect stock')
    it('PUR-1 draft items not in stock_levels')
    it('PUR-2 ordered items not in stock_levels')

  describe('Confirmed/dispatched sales create outbound stock')
    it('Bolt at Alpha: 100 out from SAL-3 dispatched')
    it('Gadget at Beta: 20 out from SAL-2 confirmed')

  describe('Draft sales do NOT affect stock')
    it('SAL-1 draft items not reflected in stock')

  describe('Transfers affect both locations')
    it('TFR-1 dispatched: Widget 50 out from Alpha')
    it('TFR-2 received: Spring 95 in at Alpha')

  describe('Approved adjustments affect stock')
    it('ADJ-2 approved: Nut -10 at Alpha')

  describe('Draft adjustments do NOT affect stock')
    it('ADJ-1 draft: Widget +25 NOT in stock')

  describe('Filtering')
    it('queryStockLevels with itemId filter returns only that item')
```

NOTE: Stock level values depend on how the `stock_levels` VIEW is defined in the SQL migration. If the VIEW considers `confirmed` sales as outbound (not just `dispatched`), the values change. The test will validate the actual VIEW behavior.

- [ ] **Step 2: Run test**

Run: `pnpm test:backend -- tests/backend/stock-levels.test.ts`
Expected: All PASS (may need to adjust expected values based on actual VIEW definition)

- [ ] **Step 3: Commit**

```bash
git add tests/backend/stock-levels.test.ts
git commit -m "test: add 12 stock level VIEW tests with fixture-based calculations"
```

---

## Chunk 5: Audit Trail Tests

### Task 9: Create `tests/backend/audit-trail.test.ts`

**Files:**
- Create: `tests/backend/audit-trail.test.ts`

- [ ] **Step 1: Write audit trail tests**

This file tests that the **query functions** (not factories) correctly write audit entries. Requires mocking Inngest since query functions import it.

```typescript
import { vi, beforeAll, afterAll } from 'vitest';

// Mock Inngest BEFORE any query module imports
vi.mock('@/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ['mock'] }) },
}));
```

Then import query functions: `createItem`, `updateItem`, `softDeleteItem`, `createPurchase`, `updatePurchaseStatus`.

Each test:
1. Calls the query function
2. Queries `auditLog` table for the matching `entityId`
3. Asserts: correct `tenantId`, `userId`, `action`, `entityType`, `newData`/`oldData`

**10 test cases:**

```
describe('Audit Trail')
  it('createItem writes action=create, entityType=item, newData contains name')
  it('updateItem writes action=update with oldData and newData')
  it('softDeleteItem writes action=delete with oldData')
  it('createPurchase writes action=create, entityType=purchase')
  it('updatePurchaseStatus writes action=status_change with old+new status')
  it('all audit entries have correct tenantId')
  it('all audit entries have non-null userId')
  it('create audit entries have null oldData')
  it('update audit entries have both oldData and newData')
  it('delete audit entries have oldData and null newData')
```

Each test creates a fresh entity (fresh UUID) to avoid collision. Cleanup soft-deletes or hard-deletes the test entities in `afterAll`.

- [ ] **Step 2: Run test**

Run: `pnpm test:backend -- tests/backend/audit-trail.test.ts`
Expected: All 10 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/backend/audit-trail.test.ts
git commit -m "test: add 10 audit trail tests verifying mutation logging"
```

---

## Chunk 6: Transaction Lifecycle Tests

### Task 10: Create `tests/backend/transactions.test.ts`

**Files:**
- Create: `tests/backend/transactions.test.ts`

- [ ] **Step 1: Write transaction lifecycle tests**

Mocks Inngest. Creates fresh entities per test to avoid state leakage.

Requires setup data (units, items, locations, contacts, tenant) in `beforeAll`.

**20 test cases:**

```
describe('Transaction Lifecycles')
  describe('Purchase: draft → ordered → received')
    it('createPurchase returns draft with purchaseNumber')
    it('draft → ordered succeeds')
    it('ordered → received succeeds')
    it('received → draft throws INVALID_TRANSITION')
    it('ordered → draft throws INVALID_TRANSITION')
    it('draft → cancelled succeeds')
    it('updatePurchase rejects non-draft purchase')
    it('softDeletePurchase rejects non-draft purchase')

  describe('Sale: draft → confirmed → dispatched')
    it('createSale returns draft with saleNumber')
    it('draft → confirmed succeeds')
    it('confirmed → dispatched succeeds')
    it('dispatched → confirmed throws INVALID_TRANSITION')
    it('draft → cancelled succeeds')
    it('confirmed → cancelled succeeds')

  describe('Transfer: draft → dispatched → in_transit → received')
    it('createTransfer returns draft with transferNumber')
    it('draft → dispatched succeeds')
    it('dispatched → in_transit succeeds')
    it('in_transit → received succeeds')
    it('received → dispatched throws INVALID_TRANSITION')

  describe('Adjustment: draft → approved')
    it('draft → approved succeeds')
    it('approved → draft throws or is rejected')
```

Each lifecycle test creates a fresh transaction, transitions it step by step, and asserts the new status is persisted in DB.

For invalid transitions, assert that calling the status update function throws an `ApiError` with code `'INVALID_TRANSITION'`.

- [ ] **Step 2: Run test**

Run: `pnpm test:backend -- tests/backend/transactions.test.ts`
Expected: All 20 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/backend/transactions.test.ts
git commit -m "test: add 20 transaction lifecycle tests with status transition validation"
```

---

## Chunk 7: Soft Delete + RBAC Tests

### Task 11: Create `tests/backend/soft-delete.test.ts`

**Files:**
- Create: `tests/backend/soft-delete.test.ts`

- [ ] **Step 1: Write soft delete tests**

Creates entities, soft-deletes them, then verifies they're excluded from queries.

**8 test cases:**

```
describe('Soft Deletes')
  describe('withTenantScope.query() excludes deleted rows')
    it('soft-deleted item not in scope.query(items)')
    it('soft-deleted location not in scope.query(locations)')
    it('soft-deleted contact not in scope.query(contacts)')

  describe('List functions exclude deleted')
    it('listItems excludes soft-deleted')
    it('listPurchases excludes soft-deleted')

  describe('Get functions return null for deleted')
    it('getItem returns null for soft-deleted item')
    it('getPurchase returns null for soft-deleted purchase')

  describe('Row still exists in DB')
    it('direct SQL query (no tenant scope) finds the soft-deleted row with deletedAt set')
```

- [ ] **Step 2: Run test**

Run: `pnpm test:backend -- tests/backend/soft-delete.test.ts`
Expected: All 8 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/backend/soft-delete.test.ts
git commit -m "test: add 8 soft delete tests verifying query exclusion"
```

---

### Task 12: Create `tests/backend/role-permissions.test.ts`

**Files:**
- Create: `tests/backend/role-permissions.test.ts`

- [ ] **Step 1: Write RBAC tests**

Pure function tests — no DB needed. Tests `hasPermission` and `requirePermission` from `@/core/auth/permissions`.

**15 test cases:**

```
describe('Role-Based Access Control')
  describe('Viewer permissions')
    it('has inventory:read and items:read')
    it('does NOT have orders:create, items:write, transfers:create')

  describe('Operator permissions (inherits viewer)')
    it('has orders:create, orders:update, receive:create, barcodes:scan')
    it('does NOT have items:write, transfers:create')

  describe('Manager permissions (inherits operator)')
    it('has items:write, orders:delete, transfers:create, adjustments:create, payments:manage')
    it('does NOT have adjustments:approve, users:manage')

  describe('Admin permissions (inherits manager)')
    it('has adjustments:approve, users:manage, settings:manage, audit:read')
    it('does NOT have tenant:manage, billing:manage')

  describe('Owner permissions (inherits admin)')
    it('has tenant:manage and billing:manage')
    it('has ALL 22 permissions')

  describe('Cumulative inheritance')
    it('each higher role has strictly more permissions')
    it('owner permissions is superset of admin')
    it('admin permissions is superset of manager')

  describe('requirePermission throws correctly')
    it('throws for viewer attempting orders:create')
    it('does NOT throw for operator attempting orders:create')
```

- [ ] **Step 2: Run test**

Run: `pnpm test:backend -- tests/backend/role-permissions.test.ts`
Expected: All 15 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/backend/role-permissions.test.ts
git commit -m "test: add 15 RBAC permission matrix tests"
```

---

## Chunk 8: Final Integration & Verification

### Task 13: Run Full Suite + Fix Issues

- [ ] **Step 1: Run the complete backend test suite**

Run: `pnpm test:backend`
Expected: All ~105 tests pass across 7 files

- [ ] **Step 2: Fix any failures**

Common issues to watch for:
- `stock_levels` VIEW may not exist in the test DB if migrations haven't been run — run `pnpm drizzle-kit push` first
- Inngest mock may not intercept all import paths — check for dynamic imports
- Sequence counter conflicts if tests don't clean up properly
- `customFieldDefinitions` may not be exported from schema index — verify exports

- [ ] **Step 3: Run suite again to confirm all pass**

Run: `pnpm test:backend`
Expected: All PASS, clean output

- [ ] **Step 4: Commit any fixes**

```bash
git add -A tests/
git commit -m "test: fix integration issues in backend test suite"
```

---

### Task 14: Final Commit

- [ ] **Step 1: Verify no regressions in existing tests**

Run: `pnpm test`
Expected: Existing `sync-metadata.test.ts` still passes

- [ ] **Step 2: Final commit with all test files**

```bash
git add .
git commit -m "feat(test): comprehensive backend test suite — 105 tests across 7 files

- 48 entities across all modules (items, locations, contacts, purchases, sales, transfers, adjustments, payments, alerts, custom fields)
- 10 user accounts with 5 different roles and location-level permissions
- Tenant isolation: verifies zero cross-tenant data leakage
- Stock levels: validates VIEW calculations against known fixture data
- Audit trail: every mutation writes correct audit log entries
- Transaction lifecycles: full status transitions + invalid transition rejection
- Soft deletes: excluded from all queries, still present in DB
- RBAC: complete permission matrix for all 5 roles"
```

---

## Verification

After implementation, verify the suite end-to-end:

1. **Clean state:** `pnpm test:backend` — all tests pass from scratch
2. **Idempotent:** Run `pnpm test:backend` twice — both runs pass (cleanup works)
3. **No production impact:** Verify test data is fully cleaned up — query `SELECT count(*) FROM tenants WHERE slug IN ('test-warehouse-co', 'other-org')` returns 0 after tests
4. **Existing tests unaffected:** `pnpm test` still passes (sync-metadata test)
5. **Stock level sanity:** The stock VIEW test values match the expected table in this plan

---

## Key Design Decisions

1. **Direct Drizzle inserts for setup (not query functions):** Avoids Inngest dependency. Query functions are tested separately in audit-trail and transactions tests with mocked Inngest.

2. **Self-contained test files:** Each file creates its own data in `beforeAll` where needed, so files can run independently or as a suite.

3. **Hard deletes for cleanup:** Tests use `DELETE FROM` (not soft delete) to ensure complete cleanup. This is safe because test data uses unique tenant IDs.

4. **Pre-generated UUIDs:** Each test run generates fresh random UUIDs, preventing collision with production data.

5. **Sequential execution:** DB integration tests run in a single fork to avoid connection pool contention and ensure deterministic ordering.

6. **No Supabase Auth dependency:** User IDs are fake UUIDs — no real Supabase auth users are created. This keeps tests fast and avoids auth API rate limits.
