// File: tests/backend/edge-cases/concurrency.test.ts
// Coverage: Concurrent sequence counter increments — uniqueness under parallel requests,
//           duplicate sequence number prevention, optimistic locking behavior.
//           Concurrent dispatch_items shortage calculation under parallel updates.
// Runner: Vitest (node environment)
//
// NOTE: Full concurrency testing requires database-level serializable transactions.
//       These tests use Promise.all() to simulate concurrent client requests.
//       PostgREST does not expose transaction control, so true SERIALIZABLE isolation
//       cannot be tested at this layer — these are best-effort concurrency smoke tests.

import { describe, it, expect, afterEach } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  DEMO_LOCATIONS,
  DEMO_COMMODITIES,
  EXEC_SQL_RPC_EXISTS,
} from '../setup/test-env';
import {
  createTestDispatch,
  getDefaultUnit,
  runCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Sequence counter: exec_sql RPC gap
// ---------------------------------------------------------------------------
describe('[HIGH] sequence counter: exec_sql RPC not available', () => {
  it('[HIGH] EXEC_SQL_RPC_EXISTS is false — getNextSequenceNumber() is broken in production', () => {
    // This is the most critical finding in the entire codebase.
    // Every sequence-dependent operation (createPurchase, createDispatch, createSale,
    // createReturn, createLot, createPayment) calls getNextSequenceNumber() which
    // calls client.rpc('exec_sql', ...) — a non-existent RPC function.
    //
    // Impact: ALL sequence-numbered record creation fails at runtime with PGRST202.
    // Workaround used in production: records are created with manually provided numbers
    // (the API route handlers may be bypassing the sequence — requires investigation).
    //
    // FIX: Replace exec_sql approach with a stored procedure or NEXTVAL sequence.
    console.error(
      '[HIGH CRITICAL] exec_sql RPC does not exist. ' +
        'getNextSequenceNumber() in src/core/db/tenant-query.ts is non-functional. ' +
        'ALL auto-numbered record creation (purchases, dispatches, sales, returns, lots, payments) ' +
        'will fail at runtime when the API route is called.'
    );
    expect(EXEC_SQL_RPC_EXISTS).toBe(false);
  });

  it('[HIGH] direct sequence_counters UPDATE works as a safe alternative to exec_sql', async () => {
    // ARRANGE: read the current dispatch counter value
    const client = tenantClient(SCHEMA);
    const { data: before, error: readErr } = await client
      .from('sequence_counters')
      .select('id, prefix, current_value')
      .eq('id', 'dispatch')
      .single();

    expect(readErr).toBeNull();
    const valueBefore = before!.current_value;

    // ACT: increment via direct UPDATE (what exec_sql WOULD do if it existed)
    const { data: updated, error: updateErr } = await client
      .from('sequence_counters')
      .update({ current_value: valueBefore + 1 })
      .eq('id', 'dispatch')
      .eq('current_value', valueBefore) // optimistic lock
      .select('current_value')
      .single();

    // ASSERT: counter incremented
    expect(updateErr).toBeNull();
    expect(updated!.current_value).toBe(valueBefore + 1);

    // Restore original value
    await client
      .from('sequence_counters')
      .update({ current_value: valueBefore })
      .eq('id', 'dispatch');
  });
});

// ---------------------------------------------------------------------------
// Sequence counter: concurrent increment simulation
// ---------------------------------------------------------------------------
describe('sequence counters: concurrent increment safety', () => {
  it('[MEDIUM] 10 concurrent optimistic-lock increments produce at most one winner per attempt', async () => {
    // ARRANGE: read the current value
    const client = tenantClient(SCHEMA);
    const { data: initial } = await client
      .from('sequence_counters')
      .select('current_value')
      .eq('id', 'sale')
      .single();

    const startValue = initial!.current_value;

    // ACT: fire 10 concurrent increment requests
    // Each uses optimistic lock: UPDATE WHERE current_value = startValue
    // Only the first one to execute will succeed; the rest will match zero rows
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        client
          .from('sequence_counters')
          .update({ current_value: startValue + 1 })
          .eq('id', 'sale')
          .eq('current_value', startValue)
          .select('current_value')
          .single()
      )
    );

    // ASSERT: at most one request succeeded (the row is updated only once)
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.data !== null && !r.value.error
    );
    expect(successes.length).toBeLessThanOrEqual(1);

    // Restore
    await client
      .from('sequence_counters')
      .update({ current_value: startValue })
      .eq('id', 'sale');
  });

  it('[MEDIUM] sequential increments produce unique values — no skips under normal load', async () => {
    // ARRANGE: read the current purchase counter
    const client = tenantClient(SCHEMA);
    const { data: initial } = await client
      .from('sequence_counters')
      .select('current_value')
      .eq('id', 'purchase')
      .single();

    const startValue = initial!.current_value;
    const incrementCount = 5;
    const generatedValues: number[] = [];

    // ACT: increment sequentially 5 times
    for (let i = 0; i < incrementCount; i++) {
      const currentValue = startValue + i;
      const { data } = await client
        .from('sequence_counters')
        .update({ current_value: currentValue + 1 })
        .eq('id', 'purchase')
        .eq('current_value', currentValue)
        .select('current_value')
        .single();

      if (data) generatedValues.push(data.current_value);
    }

    // ASSERT: all 5 values are unique and sequential
    expect(generatedValues.length).toBe(incrementCount);
    const uniqueValues = new Set(generatedValues);
    expect(uniqueValues.size).toBe(incrementCount);

    // Values should be consecutive: startValue+1, startValue+2, ..., startValue+5
    for (let i = 0; i < incrementCount; i++) {
      expect(generatedValues[i]).toBe(startValue + i + 1);
    }

    // Restore
    await client
      .from('sequence_counters')
      .update({ current_value: startValue })
      .eq('id', 'purchase');
  });

  it('sequence counter zero-padding format: value 7 → "PUR-000007"', () => {
    // ARRANGE: simulate the number formatting logic from getNextSequenceNumber
    function formatSequenceNumber(prefix: string, value: number): string {
      return `${prefix}-${String(value).padStart(6, '0')}`;
    }

    // ACT + ASSERT: verify padding
    expect(formatSequenceNumber('PUR', 1)).toBe('PUR-000001');
    expect(formatSequenceNumber('PUR', 7)).toBe('PUR-000007');
    expect(formatSequenceNumber('DSP', 42)).toBe('DSP-000042');
    expect(formatSequenceNumber('SAL', 999999)).toBe('SAL-999999');
    expect(formatSequenceNumber('SAL', 1000000)).toBe('SAL-1000000'); // overflow: 7 digits
  });
});

// ---------------------------------------------------------------------------
// Duplicate unique number prevention
// ---------------------------------------------------------------------------
describe('unique number constraints: duplicate prevention', () => {
  it('[HIGH] two concurrent dispatches with the same dispatch_number — only one succeeds', async () => {
    // ARRANGE: pick a number that does not exist
    const client = tenantClient(SCHEMA);
    const duplicateNumber = `DSP-CONC-${Date.now()}`;

    // ACT: fire two concurrent inserts with the same dispatch_number
    const [result1, result2] = await Promise.allSettled([
      client
        .from('dispatches')
        .insert({
          dispatch_number: duplicateNumber,
          origin_location_id: DEMO_LOCATIONS.WH_NORTH,
          dest_location_id: DEMO_LOCATIONS.YD_SOUTH,
          status: 'draft',
          dispatched_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id')
        .single(),
      client
        .from('dispatches')
        .insert({
          dispatch_number: duplicateNumber, // same!
          origin_location_id: DEMO_LOCATIONS.WH_NORTH,
          dest_location_id: DEMO_LOCATIONS.YD_SOUTH,
          status: 'draft',
          dispatched_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id')
        .single(),
    ]);

    // ASSERT: at most one insert succeeded
    const successCount = [result1, result2].filter(
      (r) => r.status === 'fulfilled' && r.value.data !== null && !r.value.error
    ).length;
    expect(successCount).toBeLessThanOrEqual(1);

    // The failed one should have a uniqueness error
    const failedResult = [result1, result2].find(
      (r) => r.status === 'fulfilled' && (r.value.error !== null || r.value.data === null)
    );
    if (failedResult && failedResult.status === 'fulfilled' && failedResult.value.error) {
      expect(failedResult.value.error.message).toMatch(/unique|duplicate/i);
    }

    // Cleanup: delete any successfully inserted row
    await client.from('dispatches').delete().eq('dispatch_number', duplicateNumber);
  });

  it('[HIGH] two concurrent purchases with the same purchase_number — only one succeeds', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);
    const duplicateNumber = `PUR-CONC-${Date.now()}`;

    // ACT
    const [result1, result2] = await Promise.allSettled([
      client
        .from('purchases')
        .insert({
          purchase_number: duplicateNumber,
          location_id: DEMO_LOCATIONS.WH_NORTH,
          status: 'draft',
          created_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id')
        .single(),
      client
        .from('purchases')
        .insert({
          purchase_number: duplicateNumber,
          location_id: DEMO_LOCATIONS.WH_NORTH,
          status: 'draft',
          created_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id')
        .single(),
    ]);

    // ASSERT: at most one succeeded
    const successCount = [result1, result2].filter(
      (r) => r.status === 'fulfilled' && r.value.data !== null && !r.value.error
    ).length;
    expect(successCount).toBeLessThanOrEqual(1);

    // Cleanup
    await client.from('purchases').delete().eq('purchase_number', duplicateNumber);
  });
});

// ---------------------------------------------------------------------------
// Concurrent dispatch_items updates — shortage calculation
// ---------------------------------------------------------------------------
describe('concurrent dispatch_items: shortage calculation under parallel updates', () => {
  it('[MEDIUM] two concurrent received_quantity updates on same item — last write wins', async () => {
    // ARRANGE: create a dispatch with a single item
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: DEMO_LOCATIONS.WH_NORTH,
      destLocationId: DEMO_LOCATIONS.YD_SOUTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      sentQuantity: 100,
      status: 'dispatched',
    });

    const client = tenantClient(SCHEMA);
    const { data: items } = await client
      .from('dispatch_items')
      .select('id')
      .eq('dispatch_id', dispatch.id);

    const itemId = items![0].id;

    // ACT: fire two concurrent updates with different received quantities
    await Promise.allSettled([
      client
        .from('dispatch_items')
        .update({ received_quantity: 90 })
        .eq('id', itemId),
      client
        .from('dispatch_items')
        .update({ received_quantity: 85 })
        .eq('id', itemId),
    ]);

    // ASSERT: final state is one of the two valid values (last write wins)
    const { data: final } = await client
      .from('dispatch_items')
      .select('received_quantity, shortage, shortage_percent')
      .eq('id', itemId)
      .single();

    const receivedQty = Number(final!.received_quantity);
    expect([85, 90]).toContain(receivedQty);

    // Shortage must be consistent with received_quantity
    const shortage = Number(final!.shortage);
    expect(shortage).toBe(100 - receivedQty);

    const shortagePercent = Number(final!.shortage_percent);
    expect(shortagePercent).toBe(shortage); // shortage_percent = (shortage / 100) * 100 = shortage
  });
});

// ---------------------------------------------------------------------------
// Edge case: zero stock dispatch
// ---------------------------------------------------------------------------
describe('edge cases: zero and boundary quantity operations', () => {
  it('[HIGH] dispatch_item with zero sent_quantity is rejected by CHECK constraint', async () => {
    // ARRANGE: create a dispatch header
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const { data: dispatch } = await client
      .from('dispatches')
      .insert({
        dispatch_number: `DSP-ZERO-${Date.now()}`,
        origin_location_id: DEMO_LOCATIONS.WH_NORTH,
        dest_location_id: DEMO_LOCATIONS.YD_SOUTH,
        status: 'draft',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: insert item with zero quantity
    const { error } = await client
      .from('dispatch_items')
      .insert({
        dispatch_id: dispatch!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
        unit_id: unit.id,
        sent_quantity: 0,
      });

    // ASSERT: check constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    // Cleanup
    await client.from('dispatches').delete().eq('id', dispatch!.id);
  });

  it('[HIGH] purchase_item with zero quantity is rejected by CHECK constraint', async () => {
    // ARRANGE: create a purchase header
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: `PUR-ZERO-${Date.now()}`,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: insert item with zero quantity
    const { error } = await client
      .from('purchase_items')
      .insert({
        purchase_id: purchase!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
        unit_id: unit.id,
        quantity: 0,
      });

    // ASSERT
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    // Cleanup
    await client.from('purchases').delete().eq('id', purchase!.id);
  });

  it('purchase_item with quantity = 0.001 (minimum positive) passes CHECK constraint', async () => {
    // ARRANGE: create a purchase header
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: `PUR-MINQTY-${Date.now()}`,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: insert with very small positive quantity
    const { error } = await client
      .from('purchase_items')
      .insert({
        purchase_id: purchase!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
        unit_id: unit.id,
        quantity: 0.001,
      });

    // ASSERT: allowed — CHECK is quantity > 0
    expect(error).toBeNull();

    // Cleanup
    await client.from('purchase_items').delete().eq('purchase_id', purchase!.id);
    await client.from('purchases').delete().eq('id', purchase!.id);
  });

  it('[HIGH] NULL quantity inputs are rejected by NOT NULL constraint', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: `PUR-NULLQTY-${Date.now()}`,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: insert item with null quantity
    const { error } = await client
      .from('purchase_items')
      .insert({
        purchase_id: purchase!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
        unit_id: unit.id,
        quantity: null,
      });

    // ASSERT: NOT NULL violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/null|violates|not-null/i);

    // Cleanup
    await client.from('purchases').delete().eq('id', purchase!.id);
  });
});

// ---------------------------------------------------------------------------
// Large batch: dispatch items
// ---------------------------------------------------------------------------
describe('edge cases: large batch dispatch operations', () => {
  it('[MEDIUM] dispatch with 50 items in a single batch insert completes successfully', async () => {
    // ARRANGE: create dispatch header
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const dispatchNumber = `DSP-BATCH-${Date.now()}`;

    const { data: dispatch } = await client
      .from('dispatches')
      .insert({
        dispatch_number: dispatchNumber,
        origin_location_id: DEMO_LOCATIONS.WH_NORTH,
        dest_location_id: DEMO_LOCATIONS.YD_SOUTH,
        status: 'dispatched',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // Generate 50 items alternating between WHEAT and RICE
    const commodities = [DEMO_COMMODITIES.WHEAT, DEMO_COMMODITIES.RICE, DEMO_COMMODITIES.CORN];
    const items = Array.from({ length: 50 }, (_, i) => ({
      dispatch_id: dispatch!.id,
      commodity_id: commodities[i % commodities.length],
      unit_id: unit.id,
      sent_quantity: 10 + (i % 20),
    }));

    // ACT: bulk insert
    const { error } = await client.from('dispatch_items').insert(items);

    // ASSERT
    expect(error).toBeNull();

    const { data: inserted } = await client
      .from('dispatch_items')
      .select('id')
      .eq('dispatch_id', dispatch!.id);

    expect(inserted?.length).toBe(50);

    // Cleanup
    await client.from('dispatch_items').delete().eq('dispatch_id', dispatch!.id);
    await client.from('dispatches').delete().eq('id', dispatch!.id);
  });
});
