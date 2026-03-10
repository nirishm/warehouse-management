# WareOS Codebase Simplification Plan

**Date**: 2026-03-08
**Status**: Planned
**Estimated reduction**: ~410 lines of duplicated/boilerplate code

---

## Context

The codebase is well-structured but has accumulated copy-paste duplication across modules that follow identical patterns (purchase, sale, dispatch), boilerplate-heavy API routes, and a few unnecessary abstractions.

---

## Implementation Steps (in order)

### Step 1: Permission Const Array (P6) — 15 min, Very Low Risk

**Problem**: `ALL_PERMISSIONS` in `guards.ts:47-54` is hardcoded and must stay in sync with the `Permission` type in `types.ts`.

**Solution**: Move to `src/core/auth/types.ts` as a const array, derive the type from it:

```typescript
// src/core/auth/types.ts
export const ALL_PERMISSIONS = [
  'canPurchase', 'canDispatch', 'canReceive', 'canSale',
  'canViewStock', 'canManageLocations', 'canManageCommodities',
  'canManageContacts', 'canViewAnalytics', 'canExportData',
  'canViewAuditLog', 'canManagePayments', 'canManageAlerts',
  'canGenerateDocuments', 'canManageLots', 'canManageReturns',
  'canImportData',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
```

**Files**:
- Edit: `src/core/auth/types.ts` — add const array, derive type
- Edit: `src/core/auth/guards.ts` — import `ALL_PERMISSIONS` instead of hardcoding

---

### Step 2: Remove Unused Dependencies (P7) — 5 min, Very Low Risk

**Problem**: `next-themes` and `tw-animate-css` are installed but unused.

**Solution**:
```bash
pnpm remove next-themes tw-animate-css
```

Then check `globals.css` — if `tw-animate-css` is referenced via `@import`, remove that import.

**Verify**: `pnpm build`

---

### Step 3: Audit Trail Helper (P4) — 30 min, Very Low Risk, ~120 lines saved

**Problem**: Fire-and-forget audit logging is copy-pasted across every mutation route (~20 files), each with a 7-line block.

**Solution**: Create `src/core/audit.ts`:

```typescript
import { createAuditEntry } from '@/modules/audit-trail/queries/audit';

export function logAudit(
  ctx: { schemaName: string; userId: string; userName: string },
  action: string,
  entityType: string,
  entityId: string,
  data?: unknown
) {
  createAuditEntry(ctx.schemaName, {
    user_id: ctx.userId,
    user_name: ctx.userName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_data: data as Record<string, unknown>,
  }).catch((e) => console.error('Audit log error:', e));
}
```

**Files**:
- Create: `src/core/audit.ts` (~15 lines)
- Update: All mutation API routes (~20 files) — replace 7-line block with 1-line `logAudit()` call

**Find all affected routes**:
```bash
grep -rl "createAuditEntry" src/app/api/
```

---

### Step 4: Extract Query Helpers (P2) — 30 min, Very Low Risk, ~30 lines saved

**Problem**: Location filter pattern repeated 10+ times:
```typescript
const ids = options?.allowedLocationIds;
if (ids !== null && ids !== undefined && ids.length > 0) {
  query = query.in('location_id', ids);
}
```

**Solution**: Create `src/core/db/query-helpers.ts`:

```typescript
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export function applyLocationFilter<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  locationIds?: string[] | null,
  column = 'location_id'
) {
  if (locationIds !== null && locationIds !== undefined && locationIds.length > 0) {
    return query.in(column, locationIds);
  }
  return query;
}

export function isNotFound(error: { code: string }): boolean {
  return error.code === 'PGRST116';
}
```

**Files**:
- Create: `src/core/db/query-helpers.ts` (~20 lines)
- Update: ~10 query files that use the location filter pattern

**Find affected files**:
```bash
grep -rl "allowedLocationIds" src/modules/
```

---

### Step 5: Landing Page CSS Variables (P9) — 15 min, Very Low Risk

**Problem**: `src/components/landing/landing.module.css` uses hardcoded `rgba(244,95,0,...)` instead of CSS variable `--accent-color`.

**Solution**: Replace hardcoded orange values with `var(--accent-color)` / `color-mix()` for alpha variants. Mac chrome dots (`#FF5F57`, `#FEBC2E`, `#28C840`) stay as-is — they're intentional design references.

**Files**:
- Edit: `src/components/landing/landing.module.css`

**Verify**: Take screenshot before/after

---

### Step 6: Entity Query Builder (P1) — 2 hrs, Low Risk, ~250 lines saved

**Problem**: `purchases.ts`, `sales.ts`, and `dispatches.ts` query files are 95% identical — same list/getById/create/cancel structure with only table names, FK names, and a few fields differing.

**Evidence**:
- `src/modules/purchase/queries/purchases.ts` (126 lines)
- `src/modules/sale/queries/sales.ts` (126 lines)
- `src/modules/dispatch/queries/dispatches.ts` (129 lines)

**Solution**: Create `src/core/db/entity-queries.ts`:

```typescript
interface EntityConfig<TCreate, TEntity> {
  table: string;
  itemsTable: string;
  itemForeignKey: string;       // e.g. 'purchase_id' | 'sale_id'
  sequenceId: string;           // e.g. 'purchase' | 'sale'
  numberField: string;          // e.g. 'purchase_number' | 'sale_number'
  timestampField: string;       // e.g. 'received_at' | 'sold_at'
  listSelect: string;
  detailSelect: string;
  mapHeaderInsert: (input: TCreate, number: string, userId: string) => Record<string, unknown>;
  mapItemInsert: (item: unknown, parentId: string) => Record<string, unknown>;
}

function createEntityQueries<TCreate, TEntity>(config: EntityConfig<TCreate, TEntity>) {
  return { list, getById, create, cancel };
}
```

Each module reduces to a ~25-line config + re-export.

**Note**: Dispatch has `origin_location_id`/`dest_location_id` instead of single `location_id`, and its location filter uses `.or()` instead of `.in()`. The config needs to support a custom `applyLocationFilter` override, or dispatch keeps its own `list` while using the shared `getById`/`create`/`cancel`.

**Files**:
- Create: `src/core/db/entity-queries.ts` (~80 lines)
- Simplify: `src/modules/purchase/queries/purchases.ts` → ~25 lines
- Simplify: `src/modules/sale/queries/sales.ts` → ~25 lines
- Simplify: `src/modules/dispatch/queries/dispatches.ts` → ~25 lines

**Verify**: Run existing tests + manually test CRUD on purchases, sales, dispatches

---

## What NOT to Simplify

| Item | Reason to keep |
|------|---------------|
| API route boilerplate | Explicit, debuggable, follows Next.js conventions |
| `createTenantClient` wrapper | Semantic alias — "tenant client" is clearer than "admin client with schema" |
| Module registration in `index.ts` | 15 imports is manageable |
| Middleware DB re-query in guards.ts | Defense-in-depth security |
| Soft-delete `.is('deleted_at', null)` | Too small to abstract; readable inline |

---

## Verification After Each Step

1. `pnpm build` — must compile cleanly
2. `pnpm test` — all unit tests pass
3. For Step 6: manually test CRUD on purchases, sales, dispatches via UI
4. For Step 5: screenshot before/after landing page
