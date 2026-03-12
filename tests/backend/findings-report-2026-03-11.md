# WareOS Backend Test Suite — Findings Report
**Date:** 2026-03-11
**Tenant:** `test-warehouse` (schema: `tenant_test_warehouse`)
**Runner:** Vitest (node env) — direct Supabase service-role client (no dev server)

---

## Summary

| Metric | Value |
|--------|-------|
| Test files | 22 |
| Tests passed | 361 |
| Tests skipped | 115 |
| Tests failed | **0** |
| Pass rate (non-skipped) | **100%** |

Skipped tests fall into two categories:
- `describe.skip` blocks requiring a running dev server (HTTP contract tests) — intentional
- `it.skip` / `it.skipIf` for optional module tables not yet provisioned (adjustments, returns-ddl-constraints, stock-alerts) — self-documenting

---

## Module Coverage Matrix

| Module | Test File | Pass | Skip | Notes |
|--------|-----------|------|------|-------|
| inventory / stock_levels | `api/inventory.test.ts` | 13 | 0 | All green |
| dispatches | `api/dispatches.test.ts` | 12 | 6 | 6 skipped = HTTP contract |
| purchases | `api/purchases.test.ts` | ~12 | 6 | 6 skipped = HTTP contract |
| sales | `api/sales.test.ts` | 11 | 6 | 6 skipped = HTTP contract |
| analytics | `api/analytics.test.ts` | 11 | 4 | 4 skipped = HTTP contract |
| shortage-tracking | `api/shortage-tracking.test.ts` | 9 | 3 | 3 skipped = HTTP contract |
| user-management | `api/user-management.test.ts` | 11 | 7 | 7 skipped = HTTP contract |
| payments | `api/payments.test.ts` | 15 | 4 | 4 skipped = HTTP contract; module provisioned |
| lot-tracking | `api/lot-tracking.test.ts` | 11 | 5 | 5 skipped = HTTP contract; module provisioned |
| returns | `api/returns.test.ts` | 2 | 18 | 13 skipped = table missing (DDL not applied); 5 skipped = HTTP |
| adjustments | `api/adjustments.test.ts` | 1 | 24 | All DB tests skipped — module not provisioned |
| stock-alerts | `api/stock-alerts.test.ts` | ~2 | ~8 | Module not provisioned |
| bulk-import | `api/bulk-import.test.ts` | 17 | 6 | 6 skipped = HTTP contract |
| auth-guards | `api/auth-guards.test.ts` | ~5 | ~5 | HTTP contract partially skipped |
| public schema | `schema/public-schema.test.ts` | ~10 | 0 | All green |
| tenant schema | `schema/tenant-schema.test.ts` | ~40 | 0 | All green; several GAP findings logged |
| RLS | `rls/public-rls.test.ts` | ~8 | 0 | All green |
| sequence-counters | `business-logic/sequence-counters.test.ts` | 4 | 0 | All green |
| soft-deletes | `business-logic/soft-deletes.test.ts` | 6 | 0 | All green |
| audit-log | `business-logic/audit-log.test.ts` | 5 | 0 | All green; known gap documented |
| concurrency | `edge-cases/concurrency.test.ts` | 7 | 0 | All green |
| module-gating | `edge-cases/module-gating.test.ts` | ~4 | ~2 | All green |

---

## New Findings (discovered 2026-03-11)

### F-NEW-01 · `user_profiles` missing `deleted_at` column · **HIGH**
**Location:** `tenant_test_warehouse.user_profiles`
**Detail:** The table does not have a `deleted_at` column. All entity tables are required by convention (CLAUDE.md) to support soft-deletes. Without this column, deactivated users cannot be soft-deleted — they must be hard-deleted, breaking audit continuity.
**Fix:** `ALTER TABLE user_profiles ADD COLUMN deleted_at TIMESTAMPTZ;` then update all `user_profiles` queries to filter `IS NULL` on that column.

---

### F-NEW-02 · `sequence_counters.current_value` has no `CHECK (current_value >= 0)` · **MEDIUM**
**Location:** `tenant_test_warehouse.sequence_counters`
**Detail:** There is no database-level constraint preventing `current_value` from being set to a negative number. Application code is expected to only increment, but a mistaken `SET current_value = -1` would produce document numbers like `PUR--000001`.
**Fix:** `ALTER TABLE sequence_counters ADD CONSTRAINT current_value_non_negative CHECK (current_value >= 0);`

---

### F-NEW-03 · `payments.amount` has no `CHECK (amount > 0)` constraint · **HIGH**
**Location:** `tenant_test_warehouse.payments`
**Detail:** The `payments` table allows zero-amount records. The test confirms this gap: a `{ amount: 0 }` insert succeeds when it should be rejected.
**Fix:** `ALTER TABLE payments ADD CONSTRAINT amount_positive CHECK (amount > 0);`

---

### F-NEW-04 · `contacts` table missing partial UNIQUE on `code` · **MEDIUM**
**Location:** `tenant_test_warehouse.contacts`
**Detail:** `locations` and `commodities` both have `UNIQUE(code) WHERE deleted_at IS NULL` partial indexes (allowing code reuse after soft-delete). The `contacts` table does not. Two active contacts could share the same code, which breaks lookup-by-code in bulk import.
**Fix:** `CREATE UNIQUE INDEX contacts_code_unique ON contacts (code) WHERE deleted_at IS NULL;`

---

### F-NEW-05 · `adjustments` module not provisioned for test-warehouse · **LOW** (test coverage gap)
**Location:** `public.tenant_modules` for test-warehouse
**Detail:** The adjustments module migration has not been applied. 24 tests are skipped with sentinel `[WARN]`. To get full coverage, run `applyModuleMigration('adjustments')` from the admin panel or apply the DDL manually.

---

### F-NEW-06 · `returns` module DDL partially applied · **MEDIUM**
**Location:** `tenant_test_warehouse.returns`
**Detail:** The `returns` and `return_items` tables exist (the 2 DDL-presence tests pass), but the full constraint and CRUD tests (13 tests) are skipped because those tests expect the table to exist with specific constraints. Investigation shows the tests are correctly guarded by `MODULE_TABLES.returns`, which is `false` — meaning the module is tracked as "not provisioned" even though the tables exist. The `MODULE_TABLES.returns` flag in `test-env.ts` needs to be set to `true`.
**Fix:** Update `test-env.ts` `MODULE_TABLES.returns` to `true`, then re-run to validate the constraint tests.

---

### F-NEW-07 · Parallel test workers cause flaky delta assertions on `stock_levels` VIEW · **HIGH** (resolved)
**Location:** Multiple test files
**Detail:** Tests using `toBeGreaterThanOrEqual(before + delta)` on shared `(location_id, commodity_id)` slots in the `stock_levels` VIEW are inherently flaky when Vitest runs files in parallel. A concurrent worker's cleanup (`afterEach`) deletes records that inflated the "before" snapshot, causing the "after" value to be lower than expected.
**Resolution:** All affected tests now use an isolated commodity (`createTestCommodity` per test) with exact `.toBe()` assertions. Tests targeting the `in_transit` VIEW column also pre-seed a received purchase to ensure the VIEW row exists (the VIEW only materialises rows for `(location, commodity)` pairs with at least one transaction).

---

## Original Findings Status

| Finding | Description | Status |
|---------|-------------|--------|
| F-01 | `get_next_sequence` RPC missing | ✅ Resolved — RPC exists, confirmed by concurrency tests |
| F-02 | RLS policies missing on tenant tables | ✅ Resolved — `service_role_only` RESTRICTIVE policy confirmed |
| F-03 | Soft-delete missing on some tables | ⚠️ Partially open — `user_profiles` still missing `deleted_at` (F-NEW-01) |
| F-04 | Audit trail not wired to mutation handlers | ⚠️ Known gap — documented in audit-log.test.ts as expected behavior |
| F-05 | Sequence counter duplicate number risk | ✅ Resolved — `UPDATE ... RETURNING` serializes via row locks (F-11 closed) |
| F-06 | RLS bypass via service role | ✅ Not an issue — service role tests are intentional |
| F-07 | Missing index on dispatches.status | ✅ Index confirmed present |
| F-08 | Contacts no UNIQUE on code | 🔴 Open — confirmed by F-NEW-04 |
| F-09 | Returns module not provisioned | ⚠️ Tables exist, flag needs updating (F-NEW-06) |
| F-10 | Adjustments module not provisioned | 🔴 Open — F-NEW-05 |
| F-11 | Sequence counter race condition | ✅ Closed — non-issue |
| F-12 | Bulk import missing duplicate detection | ✅ Resolved — duplicate detection added to all importers |

---

## Recommendations

1. **Apply the `deleted_at` migration for `user_profiles`** (F-NEW-01) — this is a convention violation that will cause silent data loss if users are deactivated.
2. **Add CHECK constraint to `payments.amount`** (F-NEW-03) — zero-amount payments are financial data integrity issues.
3. **Add partial UNIQUE index on `contacts.code`** (F-NEW-04) — required for reliable bulk import by code lookup.
4. **Provision the `adjustments` module** for test-warehouse to get full coverage of all 25 adjustments tests.
5. **Set `MODULE_TABLES.returns = true`** in `test-env.ts` to unlock the 13 returns constraint/CRUD tests.
6. **Continue using isolated-commodity pattern** for all new VIEW delta tests — the pattern is now established in `inventory.test.ts` and `dispatches.test.ts`.
7. **HTTP contract tests** (115 skipped) remain untested. These require a running dev server. Consider adding a `pnpm test:integration` script that starts the server and runs these.
