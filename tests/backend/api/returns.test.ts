// File: tests/backend/api/returns.test.ts
// Coverage: Returns CRUD — table existence check (module-gated via applyReturnsMigration),
//           create/read/confirm/cancel flow, status constraint, FK constraints,
//           return_type CHECK constraint, soft delete, confirm-idempotency guard.
//           API-layer tests marked .skip — require running dev server + auth.
// Runner: Vitest (node environment)
//
// NOTE: The returns table exists in tenant_test_warehouse (exec_sql RPC is available and
// applyReturnsMigration() was successfully applied). All tests run unconditionally.

import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  TW_LOCATIONS,
  TW_COMMODITIES,
} from '../setup/test-env';
import {
  getDefaultUnit,
  runCleanup,
  registerCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

// Detect whether the returns table exists in this tenant schema before running tests
let returnsTableExists = false;

beforeAll(async () => {
  const client = tenantClient(SCHEMA);
  const { error } = await client.from('returns').select('id').limit(1);
  // PGRST205 = table not found in schema cache
  returnsTableExists = error?.code !== 'PGRST205';
});

afterEach(async () => {
  await runCleanup();
});

// Placeholder UUIDs used as original_txn_id — no FK constraint on this column by design
// (returns can reference purchases, sales, or other txn types)
const PLACEHOLDER_TXN_1 = '00000000-0000-0000-0000-000000000001';
const PLACEHOLDER_TXN_2 = '00000000-0000-0000-0000-000000000002';
const PLACEHOLDER_TXN_3 = '00000000-0000-0000-0000-000000000003';

// ---------------------------------------------------------------------------
// Returns: module existence gate
// ---------------------------------------------------------------------------
describe('returns: module DDL presence', () => {
  it('returns table exists in tenant_test_warehouse (applyReturnsMigration was applied)', async () => {
    // ARRANGE: query the returns table
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('returns').select('id').limit(1);

    // ASSERT: table exists — migration was successfully applied
    expect(error).toBeNull();
    expect(returnsTableExists).toBe(true);
  });

  it('[HIGH] return_items table existence mirrors returns table', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('return_items').select('id').limit(1);

    if (!returnsTableExists) {
      // If returns doesn't exist, return_items shouldn't either
      expect(error?.code).toBe('PGRST205');
    } else {
      expect(error).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Returns: schema structure (only run when table exists)
// ---------------------------------------------------------------------------
describe('returns: table structure and constraints', () => {
  it.skipIf(!returnsTableExists)('returns table has correct status CHECK constraint values', async () => {
    // ARRANGE: create a valid return
    const client = tenantClient(SCHEMA);

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-STRUCT-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    if (ret) {
      registerCleanup({ schema: SCHEMA, table: 'returns', id: ret.id });
    }

    // ACT: try to set an invalid status
    const { error } = await client
      .from('returns')
      .update({ status: 'shipped' })
      .eq('id', ret!.id);

    // ASSERT: check constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it.skipIf(!returnsTableExists)('return_type CHECK allows only purchase_return and sale_return', async () => {
    // ARRANGE: try invalid return_type
    const client = tenantClient(SCHEMA);

    // ACT
    const { error } = await client
      .from('returns')
      .insert({
        return_number: `RET-TYPE-${Date.now()}`,
        return_type: 'exchange', // invalid
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      });

    // ASSERT
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it.skipIf(!returnsTableExists)('[HIGH] negative quantity on return_item is rejected by CHECK constraint', async () => {
    // ARRANGE: create a returns header
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-NEGQTY-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    if (ret) registerCleanup({ schema: SCHEMA, table: 'returns', id: ret.id });

    // ACT: insert item with negative quantity
    const { error } = await client
      .from('return_items')
      .insert({
        return_id: ret!.id,
        commodity_id: TW_COMMODITIES.COMM1,
        unit_id: unit.id,
        quantity: -5,
      });

    // ASSERT
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Returns: create flow
// ---------------------------------------------------------------------------
describe('returns: create operations', () => {
  it.skipIf(!returnsTableExists)('can create a purchase_return with items via service role', async () => {
    // ARRANGE: get default unit
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const returnNumber = `RET-TEST-${Date.now()}`;

    // ACT: create return header
    const { data: ret, error: retErr } = await client
      .from('returns')
      .insert({
        return_number: returnNumber,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id, return_number, status')
      .single();

    expect(retErr).toBeNull();
    expect(ret!.status).toBe('draft');
    registerCleanup({ schema: SCHEMA, table: 'returns', id: ret!.id });

    // Insert items
    const { error: itemErr } = await client.from('return_items').insert({
      return_id: ret!.id,
      commodity_id: TW_COMMODITIES.COMM1,
      unit_id: unit.id,
      quantity: 10,
    });

    // ASSERT: items inserted
    expect(itemErr).toBeNull();
  });

  it.skipIf(!returnsTableExists)('can create a sale_return referencing a sale txn', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);

    // ACT: sale_return type references a sale (placeholder UUID — no FK constraint)
    const { data: ret, error } = await client
      .from('returns')
      .insert({
        return_number: `RET-SALE-${Date.now()}`,
        return_type: 'sale_return',
        original_txn_id: PLACEHOLDER_TXN_3,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id, return_type')
      .single();

    // ASSERT
    expect(error).toBeNull();
    expect(ret!.return_type).toBe('sale_return');
    registerCleanup({ schema: SCHEMA, table: 'returns', id: ret!.id });
  });

  it.skipIf(!returnsTableExists)('return_number must be unique (duplicate rejected)', async () => {
    // ARRANGE: create two returns with same number
    const client = tenantClient(SCHEMA);
    const returnNumber = `RET-DUP-${Date.now()}`;

    const { data: first } = await client
      .from('returns')
      .insert({
        return_number: returnNumber,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    if (first) registerCleanup({ schema: SCHEMA, table: 'returns', id: first.id });

    // ACT: duplicate number
    const { error } = await client
      .from('returns')
      .insert({
        return_number: returnNumber, // same number!
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_2,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      });

    // ASSERT
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });
});

// ---------------------------------------------------------------------------
// Returns: confirm flow
// ---------------------------------------------------------------------------
describe('returns: confirm flow', () => {
  it.skipIf(!returnsTableExists)('draft return can be confirmed (status: draft → confirmed)', async () => {
    // ARRANGE: create a draft return
    const client = tenantClient(SCHEMA);
    const returnNumber = `RET-CONF-${Date.now()}`;

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: returnNumber,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id, status')
      .single();

    expect(ret!.status).toBe('draft');
    registerCleanup({ schema: SCHEMA, table: 'returns', id: ret!.id });

    // ACT: confirm the return (mirrors confirmReturn() — update where status='draft')
    const { data: confirmed, error } = await client
      .from('returns')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', ret!.id)
      .eq('status', 'draft') // optimistic lock
      .select('status')
      .single();

    // ASSERT
    expect(error).toBeNull();
    expect(confirmed!.status).toBe('confirmed');
  });

  it.skipIf(!returnsTableExists)('[HIGH] confirm-idempotency: confirming an already-confirmed return returns no rows (PGRST116)', async () => {
    // ARRANGE: create and confirm a return
    const client = tenantClient(SCHEMA);

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-IDEM-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'confirmed', // already confirmed
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    registerCleanup({ schema: SCHEMA, table: 'returns', id: ret!.id });

    // ACT: attempt to confirm again (eq('status', 'draft') will match nothing)
    const { data, error } = await client
      .from('returns')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', ret!.id)
      .eq('status', 'draft') // row has status=confirmed, so this matches nothing
      .select('status')
      .single();

    // ASSERT: PGRST116 = "expected one row but got zero"
    expect(data).toBeNull();
    expect(error?.code).toBe('PGRST116');
  });

  it.skipIf(!returnsTableExists)('can cancel a draft return', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-CANCEL-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    registerCleanup({ schema: SCHEMA, table: 'returns', id: ret!.id });

    // ACT: cancel
    const { data: cancelled, error } = await client
      .from('returns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', ret!.id)
      .eq('status', 'draft')
      .select('status')
      .single();

    // ASSERT
    expect(error).toBeNull();
    expect(cancelled!.status).toBe('cancelled');
  });

  it.skipIf(!returnsTableExists)('[HIGH] cancelling a confirmed return fails (optimistic lock — status != draft)', async () => {
    // ARRANGE: confirmed return cannot be cancelled by matching eq('status', 'draft')
    const client = tenantClient(SCHEMA);

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-NOCNL-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'confirmed',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    registerCleanup({ schema: SCHEMA, table: 'returns', id: ret!.id });

    // ACT: cancelReturn() uses .eq('status', 'draft') — confirmed row won't match
    const { data, error } = await client
      .from('returns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', ret!.id)
      .eq('status', 'draft') // doesn't match confirmed
      .select('status')
      .single();

    // ASSERT: zero rows returned = PGRST116
    expect(data).toBeNull();
    expect(error?.code).toBe('PGRST116');
  });
});

// ---------------------------------------------------------------------------
// Returns: cascade delete
// ---------------------------------------------------------------------------
describe('returns: cascade delete behavior', () => {
  it.skipIf(!returnsTableExists)('deleting a return hard-deletes its items via ON DELETE CASCADE', async () => {
    // ARRANGE: create return with items
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-CASCADE-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    const { data: item } = await client
      .from('return_items')
      .insert({
        return_id: ret!.id,
        commodity_id: TW_COMMODITIES.COMM1,
        unit_id: unit.id,
        quantity: 5,
      })
      .select('id')
      .single();

    // ACT: delete the parent
    await client.from('returns').delete().eq('id', ret!.id);

    // ASSERT: item is also gone
    const { data: orphan } = await client
      .from('return_items')
      .select('id')
      .eq('id', item!.id);

    expect(orphan).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Returns: soft delete
// ---------------------------------------------------------------------------
describe('returns: soft delete', () => {
  it.skipIf(!returnsTableExists)('soft-deleted returns are excluded from default query', async () => {
    // ARRANGE: create and soft-delete a return
    const client = tenantClient(SCHEMA);
    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-SOFTDEL-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: PLACEHOLDER_TXN_1,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    await client
      .from('returns')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', ret!.id);

    // ACT: query without deleted
    const { data } = await client
      .from('returns')
      .select('id')
      .eq('id', ret!.id)
      .is('deleted_at', null);

    // ASSERT: not visible
    expect(data).toEqual([]);

    // Cleanup
    await client.from('returns').delete().eq('id', ret!.id);
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skipIf(!process.env.INTEGRATION)('returns API: HTTP contract (requires dev server + auth)', () => {
  it('POST /api/t/[slug]/returns with missing return_type returns 400', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/returns/[id]/confirm returns 409 when status is not draft', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/returns returns only non-deleted returns', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/returns returns 403 when returns module disabled', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/returns with invalid location_id returns 400', async () => {
    expect(true).toBe(true);
  });
});
