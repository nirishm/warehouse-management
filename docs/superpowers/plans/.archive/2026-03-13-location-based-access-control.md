# Location-Based Access Control (LBAC) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict managers, operators, and viewers to only see data from their assigned warehouse locations, while owners and admins always have full tenant-wide visibility.

**Architecture:** A new `getUserLocationScope()` helper queries `user_locations` once per API request and returns `null` (unrestricted) for owner/admin or `string[]` of assigned location IDs for other roles. This scope is passed to every query function, which applies `IN (locationIds)` filtering. Empty array = no data visible.

**Tech Stack:** Drizzle ORM (`inArray`, `or`), existing `user_locations` table, existing `withTenantContext` guard pattern.

---

## Context

WareOS supports multiple warehouse locations per tenant, but currently all users see all data regardless of which locations they manage. The `user_locations` junction table already exists (`src/core/db/schema/user-profiles.ts:18-25`), and an API route to assign locations to users (`PUT /users/:id/locations`) is already built. What's missing is **enforcement** — no code reads these assignments to filter query results.

## Design Decisions (confirmed with user)

1. **Owners + admins** → always unrestricted (see all locations)
2. **Manager, operator, viewer** → scoped to assigned locations only
3. **No assignments = no data visible** (safest default)
4. **Enforcement at API layer** (not JWT, not RLS)
5. **Transfers** → visible if user is assigned to **either** origin or destination

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/core/db/location-scope.ts` | `getUserLocationScope()`, `assertLocationAccess()`, `assertTransferLocationAccess()`, `LocationScope` type |
| `src/app/t/[tenantSlug]/settings/users/location-assign-dialog.tsx` | Multi-select dialog for assigning locations to users |

### Modified Files — Query Layer
| File | Change |
|---|---|
| `src/core/db/stock-levels.ts` | Add `locationIds?: string[]` filter to `queryStockLevels` |
| `src/modules/inventory/queries/stock.ts` | Pass `locationIds` through to `queryStockLevels` |
| `src/modules/inventory/queries/locations.ts` | Add `locationScope` to `listLocations` — filter `locations.id` |
| `src/modules/purchase/queries/purchases.ts` | Add `locationScope` to `listPurchases` + `getPurchase` |
| `src/modules/sale/queries/sales.ts` | Add `locationScope` to `listSales` + `getSale` |
| `src/modules/transfer/queries/transfers.ts` | Add `locationScope` to `listTransfers` + `getTransfer` (OR on origin/dest) |
| `src/modules/adjustments/queries/adjustments.ts` | Add `locationScope` to `listAdjustments` + `getAdjustment` |
| `src/modules/stock-alerts/queries/stock-alerts.ts` | Filter stock alerts by scoped locations |
| `src/modules/stock-alerts/queries/alert-thresholds.ts` | Add `locationScope` to `listAlertThresholds` |
| `src/modules/shortage-tracking/queries/shortages.ts` | Add `locationScope` (OR on origin/dest like transfers) |
| `src/modules/analytics/queries/analytics.ts` | Thread `locationScope` through all 7 sub-functions |

### Modified Files — API Routes (GET handlers)
| File | Change |
|---|---|
| `src/app/api/v1/t/[tenantSlug]/purchases/route.ts` | Call `getUserLocationScope`, pass to `listPurchases` |
| `src/app/api/v1/t/[tenantSlug]/sales/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/transfers/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/adjustments/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/inventory/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/locations/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/stock-alerts/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/shortage-tracking/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/analytics/route.ts` | Same pattern |

### Modified Files — API Routes (POST/PATCH/GET-single handlers)
| File | Change |
|---|---|
| `src/app/api/v1/t/[tenantSlug]/purchases/route.ts` (POST) | `assertLocationAccess` before `createPurchase` |
| `src/app/api/v1/t/[tenantSlug]/purchases/[id]/route.ts` | Pass `locationScope` to `getPurchase`, guard PATCH |
| `src/app/api/v1/t/[tenantSlug]/sales/route.ts` (POST) | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/sales/[id]/route.ts` | Same pattern |
| `src/app/api/v1/t/[tenantSlug]/transfers/route.ts` (POST) | `assertTransferLocationAccess` on `originLocationId` |
| `src/app/api/v1/t/[tenantSlug]/transfers/[id]/route.ts` | Pass `locationScope` to `getTransfer` |
| `src/app/api/v1/t/[tenantSlug]/adjustments/route.ts` (POST) | `assertLocationAccess` before `createAdjustment` |
| `src/app/api/v1/t/[tenantSlug]/adjustments/[id]/route.ts` | Pass `locationScope` to `getAdjustment` |

### Modified Files — Frontend
| File | Change |
|---|---|
| `src/app/t/[tenantSlug]/settings/users/users-client.tsx` | Add "Manage Locations" action + location badge column |

## What gets scoped vs. what doesn't

| Scoped by location | NOT scoped (shared reference data) |
|---|---|
| Purchases, Sales, Transfers, Adjustments | Items, Units, Contacts, Custom Fields |
| Stock levels, Inventory | User Management (admin-only) |
| Stock Alerts, Shortage Tracking | Audit Log (admin-only) |
| Analytics/Dashboard KPIs | Settings (admin-only) |
| Locations list itself | Payments (no locationId column — defer) |

---

## Chunk 1: Core Helper + Stock Levels

### Task 1: Create `getUserLocationScope()` helper and guards

**Files:**
- Create: `src/core/db/location-scope.ts`

- [ ] **Step 1: Create the location-scope.ts file with all exports**

```typescript
// src/core/db/location-scope.ts
import { eq, and } from 'drizzle-orm';
import type { Database } from './drizzle';
import { userLocations } from './schema';
import type { Role } from '@/core/auth/types';
import { ApiError } from '@/core/api/error-handler';

/**
 * Location scope for a user.
 * - null = unrestricted (owner/admin) — no filtering applied
 * - string[] = list of allowed locationIds (may be empty = no access)
 */
export type LocationScope = string[] | null;

const UNRESTRICTED_ROLES: Role[] = ['owner', 'admin'];

/**
 * Queries user_locations once per request. Returns null for owner/admin
 * (unrestricted), or an array of assigned locationIds for other roles.
 * Empty array means no locations assigned = no data visible.
 */
export async function getUserLocationScope(
  db: Database,
  tenantId: string,
  userId: string,
  role: Role,
): Promise<LocationScope> {
  if (UNRESTRICTED_ROLES.includes(role)) return null;

  const rows = await db
    .select({ locationId: userLocations.locationId })
    .from(userLocations)
    .where(and(
      eq(userLocations.tenantId, tenantId),
      eq(userLocations.userId, userId),
    ));

  return rows.map((r) => r.locationId);
}

/**
 * Guard for single-location mutations (purchases, sales, adjustments).
 * Throws 403 if the locationId is not in the user's scope.
 */
export function assertLocationAccess(
  scope: LocationScope,
  locationId: string | null | undefined,
): void {
  if (scope === null) return; // unrestricted
  if (!locationId) return; // nullable field with no value — allow
  if (!scope.includes(locationId)) {
    throw new ApiError(403, 'Access denied: not assigned to this location', 'LOCATION_ACCESS_DENIED');
  }
}

/**
 * Guard for transfer mutations. Checks the origin location is in scope.
 * (Transfers are visible if user has either origin OR dest, but creating
 * requires origin access.)
 */
export function assertTransferLocationAccess(
  scope: LocationScope,
  originLocationId: string,
): void {
  if (scope === null) return;
  if (!scope.includes(originLocationId)) {
    throw new ApiError(403, 'Access denied: not assigned to origin location', 'LOCATION_ACCESS_DENIED');
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to location-scope.ts

- [ ] **Step 3: Commit**

```bash
git add src/core/db/location-scope.ts
git commit -m "feat(lbac): add getUserLocationScope helper and guard functions"
```

### Task 2: Add `locationIds` filter to `queryStockLevels`

**Files:**
- Modify: `src/core/db/stock-levels.ts`

- [ ] **Step 1: Extend the filters type and add the condition**

In `queryStockLevels` (line 22), add `locationIds` to the filters type:

```typescript
// Change the filters parameter (line 25-28) FROM:
filters?: {
  itemId?: string;
  locationId?: string;
},
// TO:
filters?: {
  itemId?: string;
  locationId?: string;
  locationIds?: string[];
},
```

After the existing `locationId` condition (line 36), add:

```typescript
if (filters?.locationIds && filters.locationIds.length > 0) {
  const placeholders = filters.locationIds.map(id => sql`${id}`);
  conditions.push(sql`location_id IN (${sql.join(placeholders, sql`, `)})`);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/core/db/stock-levels.ts
git commit -m "feat(lbac): add locationIds filter to queryStockLevels"
```

---

## Chunk 2: Query Function Modifications

All query functions follow the same pattern:
1. Import `LocationScope` type and `inArray` from drizzle
2. Add `locationScope?: LocationScope` to filters
3. Early-return empty results if scope is empty array
4. Add `inArray(table.locationId, scope)` condition if scope is non-null and non-empty
5. For `getX` single-record functions, check scope after fetch

### Task 3: Modify purchase queries

**Files:**
- Modify: `src/modules/purchase/queries/purchases.ts`

- [ ] **Step 1: Add locationScope to listPurchases**

Add import at top:
```typescript
import { eq, and, ilike, isNull, sql, inArray } from 'drizzle-orm';
import type { LocationScope } from '@/core/db/location-scope';
```

Change the `listPurchases` filters type (line 25-28) to add `locationScope`:
```typescript
filters?: {
  search?: string;
  status?: string;
  contactId?: string;
  locationScope?: LocationScope;
},
```

After the existing filters block (after line 44), add early return and condition:
```typescript
// Early return for empty scope (no locations assigned)
if (filters?.locationScope !== undefined && filters.locationScope !== null
    && filters.locationScope.length === 0) {
  return { data: [], total: 0 };
}

// ... existing conditions ...

// Location scope filter
if (filters?.locationScope && filters.locationScope.length > 0) {
  conditions.push(inArray(purchases.locationId, filters.locationScope));
}
```

- [ ] **Step 2: Add locationScope to getPurchase**

Change signature (line 65) to add `locationScope` parameter:
```typescript
export async function getPurchase(
  tenantId: string,
  id: string,
  locationScope?: LocationScope,
): Promise<PurchaseWithItems | null> {
```

After the `if (!result[0]) return null;` check (line 73), add:
```typescript
// Location scope check
if (locationScope !== undefined && locationScope !== null) {
  if (locationScope.length === 0) return null;
  if (result[0].locationId && !locationScope.includes(result[0].locationId)) {
    return null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/purchase/queries/purchases.ts
git commit -m "feat(lbac): add locationScope to purchase queries"
```

### Task 4: Modify sale queries

**Files:**
- Modify: `src/modules/sale/queries/sales.ts`

- [ ] **Step 1: Apply same pattern as purchases**

Same changes as Task 3:
- Add `inArray` to drizzle imports
- Add `import type { LocationScope } from '@/core/db/location-scope';`
- Add `locationScope?: LocationScope` to `listSales` filters
- Early return `{ data: [], total: 0 }` for empty scope
- Add `inArray(sales.locationId, filters.locationScope)` condition
- Add `locationScope` param to `getSale`, check after fetch

- [ ] **Step 2: Commit**

```bash
git add src/modules/sale/queries/sales.ts
git commit -m "feat(lbac): add locationScope to sale queries"
```

### Task 5: Modify transfer queries

**Files:**
- Modify: `src/modules/transfer/queries/transfers.ts`

- [ ] **Step 1: Add locationScope to listTransfers**

Add imports:
```typescript
import { eq, and, ilike, isNull, sql, inArray, or } from 'drizzle-orm';
import type { LocationScope } from '@/core/db/location-scope';
```

Add `locationScope?: LocationScope` to `listTransfers` filters (alongside existing `originLocationId`, `destLocationId`):
```typescript
filters?: {
  search?: string;
  status?: string;
  originLocationId?: string;
  destLocationId?: string;
  locationScope?: LocationScope;
},
```

Early return + OR condition (transfers are visible if user has EITHER location):
```typescript
if (filters?.locationScope !== undefined && filters.locationScope !== null
    && filters.locationScope.length === 0) {
  return { data: [], total: 0 };
}

// ... existing conditions ...

if (filters?.locationScope && filters.locationScope.length > 0) {
  conditions.push(
    or(
      inArray(transfers.originLocationId, filters.locationScope),
      inArray(transfers.destLocationId, filters.locationScope),
    )!,
  );
}
```

- [ ] **Step 2: Add locationScope to getTransfer**

Change signature to add `locationScope` param:
```typescript
export async function getTransfer(
  tenantId: string,
  id: string,
  locationScope?: LocationScope,
): Promise<TransferWithItems | null> {
```

After `if (!result[0]) return null;` add:
```typescript
if (locationScope !== undefined && locationScope !== null) {
  if (locationScope.length === 0) return null;
  const inOrigin = locationScope.includes(result[0].originLocationId);
  const inDest = locationScope.includes(result[0].destLocationId);
  if (!inOrigin && !inDest) return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/transfer/queries/transfers.ts
git commit -m "feat(lbac): add locationScope to transfer queries"
```

### Task 6: Modify adjustment queries

**Files:**
- Modify: `src/modules/adjustments/queries/adjustments.ts`

- [ ] **Step 1: Apply same pattern as purchases**

Note: adjustments already have a `locationId` filter field. Add `locationScope` alongside it:
```typescript
filters?: {
  search?: string;
  status?: string;
  locationId?: string;
  type?: string;
  locationScope?: LocationScope;
},
```

The `locationScope` filter is separate from the user-chosen `locationId` filter. Both can coexist:
- `locationId` = user explicitly filtering by one location
- `locationScope` = access control restriction

Add early return + `inArray(adjustments.locationId, filters.locationScope)`.
Add `locationScope` param to `getAdjustment` with scope check after fetch.

- [ ] **Step 2: Commit**

```bash
git add src/modules/adjustments/queries/adjustments.ts
git commit -m "feat(lbac): add locationScope to adjustment queries"
```

### Task 7: Modify locations and stock queries

**Files:**
- Modify: `src/modules/inventory/queries/locations.ts`
- Modify: `src/modules/inventory/queries/stock.ts`

- [ ] **Step 1: Add locationScope to listLocations**

Add `locationScope?: LocationScope` to filters. Filter on `locations.id` (not `locations.locationId`):
```typescript
filters?: {
  search?: string;
  type?: string;
  isActive?: boolean;
  locationScope?: LocationScope;
},
```

```typescript
if (filters?.locationScope !== undefined && filters.locationScope !== null
    && filters.locationScope.length === 0) {
  return { data: [], total: 0 };
}

// ... existing conditions ...

if (filters?.locationScope && filters.locationScope.length > 0) {
  conditions.push(inArray(locations.id, filters.locationScope));
}
```

- [ ] **Step 2: Add locationScope to getStockLevels**

`getStockLevels` is a thin wrapper around `queryStockLevels`. Add `locationScope`:
```typescript
import type { LocationScope } from '@/core/db/location-scope';

export async function getStockLevels(
  tenantId: string,
  filters?: {
    itemId?: string;
    locationId?: string;
    locationScope?: LocationScope;
  },
): Promise<StockLevel[]> {
  // Early return for empty scope
  if (filters?.locationScope !== undefined && filters.locationScope !== null
      && filters.locationScope.length === 0) {
    return [];
  }

  return queryStockLevels(db, tenantId, {
    itemId: filters?.itemId,
    locationId: filters?.locationId,
    ...(filters?.locationScope ? { locationIds: filters.locationScope } : {}),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/inventory/queries/locations.ts src/modules/inventory/queries/stock.ts
git commit -m "feat(lbac): add locationScope to locations and stock queries"
```

### Task 8: Modify stock alerts queries

**Files:**
- Modify: `src/modules/stock-alerts/queries/stock-alerts.ts`
- Modify: `src/modules/stock-alerts/queries/alert-thresholds.ts`

- [ ] **Step 1: Add locationScope to getStockAlerts**

Change signature:
```typescript
import type { LocationScope } from '@/core/db/location-scope';

export async function getStockAlerts(
  tenantId: string,
  locationScope?: LocationScope,
): Promise<StockAlert[]> {
```

Early return for empty scope:
```typescript
if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
  return [];
}
```

When fetching stock levels, pass locationIds:
```typescript
const stockLevels = await queryStockLevels(db, tenantId,
  locationScope ? { locationIds: locationScope } : undefined
);
```

When filtering thresholds, if locationScope is non-null, only include thresholds where `threshold.locationId` is in scope OR is null (global thresholds):
```typescript
// After fetching thresholds, filter by scope:
const scopedThresholds = locationScope
  ? thresholds.filter(t => !t.locationId || locationScope.includes(t.locationId))
  : thresholds;
```

Then use `scopedThresholds` instead of `thresholds` in the matching loop.

- [ ] **Step 2: Add locationScope to listAlertThresholds**

```typescript
import type { LocationScope } from '@/core/db/location-scope';

// Extend AlertThresholdFilters:
export interface AlertThresholdFilters {
  itemId?: string;
  locationId?: string;
  locationScope?: LocationScope;
}
```

Early return for empty scope + condition:
```typescript
if (filters?.locationScope !== undefined && filters.locationScope !== null
    && filters.locationScope.length === 0) {
  return { data: [], total: 0 };
}

// Include thresholds in scope OR global (null location) thresholds:
if (filters?.locationScope && filters.locationScope.length > 0) {
  conditions.push(
    or(
      inArray(alertThresholds.locationId, filters.locationScope),
      isNull(alertThresholds.locationId),
    )!,
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/stock-alerts/queries/stock-alerts.ts src/modules/stock-alerts/queries/alert-thresholds.ts
git commit -m "feat(lbac): add locationScope to stock alert queries"
```

### Task 9: Modify shortage tracking queries

**Files:**
- Modify: `src/modules/shortage-tracking/queries/shortages.ts`

- [ ] **Step 1: Add locationScope to listShortages**

Add imports and extend filters:
```typescript
import type { LocationScope } from '@/core/db/location-scope';
import { inArray, or } from 'drizzle-orm';

// Extend filters:
filters?: {
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  locationScope?: LocationScope;
},
```

Early return + OR condition (same as transfers — shortages come from transfers):
```typescript
if (filters?.locationScope !== undefined && filters.locationScope !== null
    && filters.locationScope.length === 0) {
  return { data: [], total: 0 };
}

// ... existing conditions ...

if (filters?.locationScope && filters.locationScope.length > 0) {
  conditions.push(
    or(
      inArray(transfers.originLocationId, filters.locationScope),
      inArray(transfers.destLocationId, filters.locationScope),
    )!,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/shortage-tracking/queries/shortages.ts
git commit -m "feat(lbac): add locationScope to shortage tracking queries"
```

### Task 10: Modify analytics queries

**Files:**
- Modify: `src/modules/analytics/queries/analytics.ts`

This is the most involved change — 7 sub-functions + orchestrator all need `locationScope`.

- [ ] **Step 1: Add imports and type**

At top of file, add:
```typescript
import type { LocationScope } from '@/core/db/location-scope';
```

- [ ] **Step 2: Modify getStockValue**

Change signature from `(tenantId: string)` to `(tenantId: string, locationScope?: LocationScope)`:

```typescript
export async function getStockValue(tenantId: string, locationScope?: LocationScope): Promise<StockValueResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { total: 0 };
  }
  const stockLevels = await queryStockLevels(db, tenantId,
    locationScope ? { locationIds: locationScope } : undefined
  );
  // ... rest unchanged (lines 76-107) ...
}
```

- [ ] **Step 3: Modify getItemsBelowReorder**

Same pattern — add `locationScope` param, early return, pass to `queryStockLevels`:
```typescript
export async function getItemsBelowReorder(tenantId: string, locationScope?: LocationScope): Promise<ItemsBelowReorderResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { count: 0 };
  }
  const stockLevels = await queryStockLevels(db, tenantId,
    locationScope ? { locationIds: locationScope } : undefined
  );
  // ... rest unchanged (lines 116-146) ...
}
```

- [ ] **Step 4: Modify getOpenOrdersCount**

Add `locationScope` param. Need to restructure the conditions arrays to add location filtering:

```typescript
export async function getOpenOrdersCount(tenantId: string, locationScope?: LocationScope): Promise<OpenOrdersCountResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { purchases: 0, sales: 0, total: 0 };
  }

  const purchaseConditions = [
    eq(purchases.tenantId, tenantId),
    isNull(purchases.deletedAt),
    inArray(purchases.status, ['draft', 'ordered']),
  ];
  if (locationScope) {
    purchaseConditions.push(inArray(purchases.locationId, locationScope));
  }

  const saleConditions = [
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['draft', 'confirmed']),
  ];
  if (locationScope) {
    saleConditions.push(inArray(sales.locationId, locationScope));
  }

  const [purchaseResult, salesResult] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(purchases).where(and(...purchaseConditions)),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(sales).where(and(...saleConditions)),
  ]);

  const purchasesCount = Number(purchaseResult[0]?.count ?? 0);
  const salesCount = Number(salesResult[0]?.count ?? 0);
  return { purchases: purchasesCount, sales: salesCount, total: purchasesCount + salesCount };
}
```

- [ ] **Step 5: Modify getInTransitCount**

```typescript
export async function getInTransitCount(tenantId: string, locationScope?: LocationScope): Promise<InTransitCountResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { count: 0 };
  }

  const conditions = [
    eq(transfers.tenantId, tenantId),
    isNull(transfers.deletedAt),
    inArray(transfers.status, ['dispatched', 'in_transit']),
  ];
  if (locationScope) {
    conditions.push(
      or(
        inArray(transfers.originLocationId, locationScope),
        inArray(transfers.destLocationId, locationScope),
      )!,
    );
  }

  const result = await db.select({ count: sql<number>`cast(count(*) as integer)` })
    .from(transfers).where(and(...conditions));
  return { count: Number(result[0]?.count ?? 0) };
}
```

- [ ] **Step 6: Modify getRevenue**

Add `locationScope` as third param. Add location condition to sale filters:
```typescript
export async function getRevenue(tenantId: string, period?: Period, locationScope?: LocationScope): Promise<RevenueResult> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return { total: 0 };
  }

  const saleDateConditions = [
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['confirmed', 'dispatched']),
  ];

  if (locationScope) {
    saleDateConditions.push(inArray(sales.locationId, locationScope));
  }

  // ... existing period conditions + query unchanged ...
}
```

- [ ] **Step 7: Modify getTopSellingItems**

Same as getRevenue — add `locationScope` param, add condition to `saleDateConditions`:
```typescript
export async function getTopSellingItems(
  tenantId: string,
  period?: Period,
  limit = 10,
  locationScope?: LocationScope,
): Promise<TopSellingItem[]> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return [];
  }

  const saleDateConditions = [
    eq(sales.tenantId, tenantId),
    isNull(sales.deletedAt),
    inArray(sales.status, ['confirmed', 'dispatched']),
  ];

  if (locationScope) {
    saleDateConditions.push(inArray(sales.locationId, locationScope));
  }

  // ... existing period conditions + query unchanged ...
}
```

- [ ] **Step 8: Modify getStockMovement**

Add `locationScope` param. Add location filter to both inbound (purchases) and outbound (sales) join conditions. The joins use `and()` inline, so add the condition there:

For inbound (purchases) join:
```typescript
// Add to the innerJoin conditions for purchases (around line 317):
...(locationScope ? [inArray(purchases.locationId, locationScope)] : []),
```

For outbound (sales) join:
```typescript
// Add to the innerJoin conditions for sales (around line 341):
...(locationScope ? [inArray(sales.locationId, locationScope)] : []),
```

Full signature:
```typescript
export async function getStockMovement(
  tenantId: string,
  period?: Period,
  locationScope?: LocationScope,
): Promise<StockMovementDay[]> {
  if (locationScope !== undefined && locationScope !== null && locationScope.length === 0) {
    return [];
  }
  // ... rest with locationScope conditions added to joins ...
}
```

- [ ] **Step 9: Update getDashboardAnalytics orchestrator**

Pass `locationScope` through to all 7 sub-functions:
```typescript
export async function getDashboardAnalytics(
  tenantId: string,
  period?: Period,
  locationScope?: LocationScope,
): Promise<DashboardAnalytics> {
  const [
    stockValue, itemsBelowReorder, openOrders,
    inTransitTransfers, revenue, topSellingItems, stockMovement,
  ] = await Promise.all([
    getStockValue(tenantId, locationScope),
    getItemsBelowReorder(tenantId, locationScope),
    getOpenOrdersCount(tenantId, locationScope),
    getInTransitCount(tenantId, locationScope),
    getRevenue(tenantId, period, locationScope),
    getTopSellingItems(tenantId, period, 10, locationScope),
    getStockMovement(tenantId, period, locationScope),
  ]);

  // ... rest unchanged ...
}
```

- [ ] **Step 10: Verify compilation**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 11: Commit**

```bash
git add src/modules/analytics/queries/analytics.ts
git commit -m "feat(lbac): add locationScope to all dashboard analytics queries"
```

---

## Chunk 3: API Route Integration

### Task 11: Wire location scope into GET list API routes

**Files:**
All 9 GET-list route files listed in the File Structure table above.

The pattern is identical for every route — add 2 lines:

```typescript
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

// Inside the GET handler, before the query call:
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
// Then pass locationScope in the filters object
```

- [ ] **Step 1: Wire purchases/route.ts GET**

```typescript
// src/app/api/v1/t/[tenantSlug]/purchases/route.ts
// Add imports at top:
import { getUserLocationScope } from '@/core/db/location-scope';
import { db } from '@/core/db/drizzle';

// In GET handler, after filters are constructed (line 17), add:
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);

// Change line 19 from:
const { data, total } = await listPurchases(ctx.tenantId, filters, pagination);
// To:
const { data, total } = await listPurchases(ctx.tenantId, { ...filters, locationScope }, pagination);
```

- [ ] **Step 2: Wire sales/route.ts GET**

Same pattern — add imports, `getUserLocationScope`, pass `{ ...filters, locationScope }` to `listSales`.

- [ ] **Step 3: Wire transfers/route.ts GET**

Same pattern — pass `{ ...filters, locationScope }` to `listTransfers`.

- [ ] **Step 4: Wire adjustments/route.ts GET**

Same pattern — pass `{ ...filters, locationScope }` to `listAdjustments`.

- [ ] **Step 5: Wire inventory/route.ts GET**

```typescript
// This route is different — no pagination, passes filters directly
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
const data = await getStockLevels(ctx.tenantId, { ...filters, locationScope });
```

- [ ] **Step 6: Wire locations/route.ts GET**

Same pattern — pass `{ ...filters, locationScope }` to `listLocations`.

- [ ] **Step 7: Wire analytics/route.ts GET**

```typescript
// Analytics passes period, not filters:
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
const data = await getDashboardAnalytics(ctx.tenantId, period, locationScope);
```

- [ ] **Step 8: Wire stock-alerts/route.ts GET**

```typescript
// Stock alerts takes no filters:
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
const data = await getStockAlerts(ctx.tenantId, locationScope);
```

- [ ] **Step 9: Wire shortage-tracking/route.ts GET**

Same pattern — pass `{ ...filters, locationScope }` to `listShortages`.

- [ ] **Step 10: Verify compilation**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 11: Commit**

```bash
git add src/app/api/v1/t/\[tenantSlug\]/purchases/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/sales/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/transfers/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/adjustments/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/inventory/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/locations/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/analytics/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/stock-alerts/route.ts \
        src/app/api/v1/t/\[tenantSlug\]/shortage-tracking/route.ts
git commit -m "feat(lbac): wire getUserLocationScope into all GET API routes"
```

### Task 12: Wire location guards into POST and [id] routes

**Files:**
- `src/app/api/v1/t/[tenantSlug]/purchases/route.ts` (POST)
- `src/app/api/v1/t/[tenantSlug]/purchases/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/v1/t/[tenantSlug]/sales/route.ts` (POST)
- `src/app/api/v1/t/[tenantSlug]/sales/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/v1/t/[tenantSlug]/transfers/route.ts` (POST)
- `src/app/api/v1/t/[tenantSlug]/transfers/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/v1/t/[tenantSlug]/adjustments/route.ts` (POST)
- `src/app/api/v1/t/[tenantSlug]/adjustments/[id]/route.ts` (GET, PATCH, DELETE)

- [ ] **Step 1: Guard purchases POST**

```typescript
// In POST handler of purchases/route.ts, after validation (line 42):
import { getUserLocationScope, assertLocationAccess } from '@/core/db/location-scope';

const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
assertLocationAccess(locationScope, parsed.data.locationId);
// Then proceed with createPurchase as before
```

- [ ] **Step 2: Guard purchases/[id] GET and PATCH**

```typescript
// In GET handler, after extracting ID:
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
const purchase = await getPurchase(ctx.tenantId, id, locationScope);
// getPurchase now returns null if out of scope

// In PATCH handler, after validation:
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
assertLocationAccess(locationScope, parsed.data.locationId); // check new locationId if changing it
// Also need to verify existing record is in scope:
const existing = await getPurchase(ctx.tenantId, id, locationScope);
if (!existing) throw new ApiError(404, 'Purchase not found');
```

- [ ] **Step 3: Guard sales POST and [id]**

Same pattern as purchases — `assertLocationAccess(scope, parsed.data.locationId)` and pass `locationScope` to `getSale`.

- [ ] **Step 4: Guard transfers POST and [id]**

POST: use `assertTransferLocationAccess(scope, parsed.data.originLocationId)`:
```typescript
const locationScope = await getUserLocationScope(db, ctx.tenantId, ctx.userId, ctx.role);
assertTransferLocationAccess(locationScope, parsed.data.originLocationId);
```

GET single: pass `locationScope` to `getTransfer(ctx.tenantId, id, locationScope)`.

- [ ] **Step 5: Guard adjustments POST and [id]**

Same pattern as purchases — `assertLocationAccess(scope, parsed.data.locationId)` and pass `locationScope` to `getAdjustment`.

- [ ] **Step 6: Verify compilation**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/app/api/v1/t/\[tenantSlug\]/purchases/ \
        src/app/api/v1/t/\[tenantSlug\]/sales/ \
        src/app/api/v1/t/\[tenantSlug\]/transfers/ \
        src/app/api/v1/t/\[tenantSlug\]/adjustments/
git commit -m "feat(lbac): add location guards to mutation API routes"
```

---

## Chunk 4: Frontend — Location Assignment UI

### Task 13: Build location assignment dialog

**Files:**
- Create: `src/app/t/[tenantSlug]/settings/users/location-assign-dialog.tsx`

- [ ] **Step 1: Create LocationAssignDialog component**

Build a dialog using shadcn/ui `Dialog` + `Checkbox` components:
- Props: `userId`, `tenantSlug`, `currentLocationIds`, `isOpen`, `onClose`, `onSaved`
- Fetch all locations from `GET /api/v1/t/{slug}/locations?limit=200` (admin sees all)
- Checkbox list with location names
- Pre-select currently assigned locations
- Save: `PUT /api/v1/t/{slug}/users/{userId}/locations` with `{ locationIds: [...] }`
- Toast on success/error

Key UI elements:
- Dialog title: "Assign Locations"
- Subtitle: "Select which locations this user can access"
- Checkbox list of locations with names
- "Save" CTA button (pill-shaped, orange, 48px height per design system)
- "Cancel" secondary button

- [ ] **Step 2: Commit**

```bash
git add src/app/t/\[tenantSlug\]/settings/users/location-assign-dialog.tsx
git commit -m "feat(lbac): create location assignment dialog component"
```

### Task 14: Integrate dialog into user management page

**Files:**
- Modify: `src/app/t/[tenantSlug]/settings/users/users-client.tsx`

- [ ] **Step 1: Add state and dialog trigger**

Add state for the dialog:
```typescript
const [locationDialogUser, setLocationDialogUser] = useState<UserData | null>(null);
```

Add "Manage Locations" dropdown menu item for non-owner/non-admin users in the actions dropdown:
```tsx
{!['owner', 'admin'].includes(user.role) && (
  <DropdownMenuItem onClick={() => setLocationDialogUser(user)}>
    Manage Locations
  </DropdownMenuItem>
)}
```

Render the dialog:
```tsx
{locationDialogUser && (
  <LocationAssignDialog
    userId={locationDialogUser.userId}
    tenantSlug={tenantSlug}
    isOpen={!!locationDialogUser}
    onClose={() => setLocationDialogUser(null)}
    onSaved={() => {
      setLocationDialogUser(null);
      fetchUsers(); // refresh list
    }}
  />
)}
```

- [ ] **Step 2: Add location count badge to user rows**

In the user list/table, for non-owner/non-admin users, show a small badge or text indicating the number of assigned locations. This requires the user list API to return location counts.

**Option A (simpler):** Show location count after role badge:
```tsx
{!['owner', 'admin'].includes(user.role) && (
  <span className="text-xs text-[var(--text-muted)]">
    {user.locationCount ?? 0} locations
  </span>
)}
```

This requires modifying `listUsers` in `src/modules/user-management/queries/users.ts` to include a location count (left join + count), or fetching it separately. **Keep it simple** — defer the count display to a follow-up if it adds complexity. The dialog itself is the critical feature.

- [ ] **Step 3: Commit**

```bash
git add src/app/t/\[tenantSlug\]/settings/users/users-client.tsx
git commit -m "feat(lbac): integrate location assignment dialog into user management"
```

---

## Chunk 5: Verification & Testing

### Task 15: Build verification and run existing tests

- [ ] **Step 1: Run TypeScript compilation check**

Run: `pnpm tsc --noEmit --pretty`
Expected: Zero errors

- [ ] **Step 2: Run existing test suite**

Run: `pnpm test`
Expected: All existing tests pass (no regressions)

- [ ] **Step 3: Run production build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Manual end-to-end verification**

Test matrix (using browser or Playwright):

1. **Admin sees everything:**
   - Login as admin → dashboard shows all data
   - List purchases/sales/transfers → sees all records
   - Locations dropdown → shows all locations

2. **Restricted user sees only assigned locations:**
   - As admin, assign manager to Warehouse A only
   - Login as that manager → dashboard shows only Warehouse A data
   - List purchases → only Warehouse A purchases visible
   - List transfers → only transfers involving Warehouse A visible
   - Locations dropdown → only shows Warehouse A

3. **Mutation guard works:**
   - As restricted manager, try creating purchase for Warehouse B → 403
   - As restricted manager, create purchase for Warehouse A → success

4. **Empty scope works:**
   - Create operator with NO location assignments
   - Login as operator → all lists return empty
   - Try creating any record → 403

5. **Transfer visibility (OR logic):**
   - Assign user to Warehouse A only
   - Transfer A→B → visible (user has origin)
   - Transfer B→A → visible (user has destination)
   - Transfer B→C → NOT visible

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat(lbac): location-based access control — complete implementation"
```

---

## Key Files Reference

| File | Purpose | Reuse |
|---|---|---|
| `src/core/db/schema/user-profiles.ts:18-25` | `userLocations` table definition | Query from — already exists |
| `src/core/auth/guards.ts` | `withTenantContext()` — provides `ctx.role`, `ctx.userId`, `ctx.tenantId` | Pattern to follow |
| `src/core/db/tenant-scope.ts` | `withTenantScope()` | Architectural pattern reference |
| `src/modules/user-management/queries/users.ts` | `updateUserLocations()` function | Already exists — no changes needed |
| `src/app/api/v1/t/[tenantSlug]/users/[userId]/locations/route.ts` | PUT endpoint for location assignment | Already exists — no changes needed |
| `src/core/db/stock-levels.ts` | Raw SQL `stock_levels` VIEW query | Modify to accept `locationIds` |
| `src/core/db/drizzle.ts` | `Database` type export | Import in new location-scope.ts |

## Out of Scope (defer to follow-up)

- **Payments LBAC**: No `locationId` column on payments table. Would require join to purchases/sales. Low priority.
- **Audit log filtering**: Admin-only feature — no location scoping needed.
- **JWT metadata**: Not storing location IDs in JWT. One indexed DB query per request is acceptable.
- **User list location count badge**: Nice-to-have — defer if adding count requires complex query changes.
