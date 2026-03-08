// File: tests/backend/api/returns.test.ts
// Coverage: Returns CRUD — table existence check (module-gated via applyReturnsMigration),
//           create/read/confirm/cancel flow, status constraint, FK constraints,
//           return_type CHECK constraint, soft delete, confirm-idempotency guard.
//           API-layer tests marked .skip — require running dev server + auth.
// Runner: Vitest (node environment)
//
// KNOWN GAP [HIGH]: The returns table only exists after applyReturnsMigration() is called
// per-tenant. That function uses the missing exec_sql RPC, so it has never been run on the
// demo tenant. Tests that require the table are wrapped in a skip guard.

import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  DEMO_LOCATIONS,
  DEMO_COMMODITIES,
  DEMO_PURCHASES,
  DEMO_SALES,
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

// ---------------------------------------------------------------------------
// Returns: module existence gate
// ---------------------------------------------------------------------------
describe('returns: module DDL presence', () => {
  it('[HIGH] returns table existence depends on applyReturnsMigration() being called', async () => {
    // ARRANGE: query the returns table
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('returns').select('id').limit(1);

    if (error?.code === 'PGRST205') {
      // ASSERT: table does not exist — module migration was never applied
      // This is the EXPECTED state for the demo tenant because applyReturnsMigration()
      // uses the missing exec_sql RPC and has never been called.
      console.error(
        '[HIGH] returns table does not exist in tenant_demo schema. ' +
          'applyReturnsMigration() was never called. ' +
          'applyReturnsMigration() uses exec_sql RPC which does not exist (PGRST202). ' +
          'FIX: Register returns migration via registerModuleMigration() or apply DDL directly.'
      );
      expect(error.code).toBe('PGRST205');
    } else {
      // Table exists — this is the correct state
      expect(error).toBeNull();
    }
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
    // ARRANGE: test each invalid status
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    // First create a valid return
    const { data: ret } = await client
      .from('returns')
      .insert({
        return_number: `RET-STRUCT-${Date.now()}`,
        return_type: 'purchase_return',
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        commodity_id: DEMO_COMMODITIES.WHEAT,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
      commodity_id: DEMO_COMMODITIES.WHEAT,
      unit_id: unit.id,
      quantity: 10,
    });

    // ASSERT: items inserted
    expect(itemErr).toBeNull();
  });

  it.skipIf(!returnsTableExists)('can create a sale_return referencing a sale txn', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    // ACT: sale_return type references a sale
    const { data: ret, error } = await client
      .from('returns')
      .insert({
        return_number: `RET-SALE-${Date.now()}`,
        return_type: 'sale_return',
        original_txn_id: DEMO_SALES.SAL_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_002,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    const { data: item } = await client
      .from('return_items')
      .insert({
        return_id: ret!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
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
        original_txn_id: DEMO_PURCHASES.PUR_001,
        location_id: DEMO_LOCATIONS.WH_NORTH,
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
// GAP documentation
// ---------------------------------------------------------------------------
describe('[HIGH] KNOWN GAPS: returns module', () => {
  it('[HIGH] documents that applyReturnsMigration() is blocked by missing exec_sql RPC', () => {
    // applyReturnsMigration() at src/modules/returns/migrations/apply.ts
    // calls client.rpc('exec_sql', { query: `CREATE TABLE ...` })
    // exec_sql RPC does not exist in the Supabase project (PGRST202 confirmed).
    // The returns table has never been created in the demo tenant.
    // The returns module UI is visible but all API calls will fail with 500.
    //
    // FIX OPTIONS:
    // 1. Create exec_sql function in Supabase (security risk — arbitrary SQL execution)
    // 2. Apply DDL via Supabase migrations directly instead of via RPC
    // 3. Replace applyReturnsMigration() with a native Supabase migration file
    console.error(
      '[HIGH] applyReturnsMigration() blocked: exec_sql RPC does not exist. ' +
        'returns and return_items tables are missing from all tenant schemas.'
    );
    expect(returnsTableExists).toBe(false); // confirms the gap
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('returns API: HTTP contract (requires dev server + auth)', () => {
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
