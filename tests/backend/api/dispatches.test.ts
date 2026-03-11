// File: tests/backend/api/dispatches.test.ts
// Coverage: Dispatch CRUD, receive flow (status → received), shortage calculation,
//           location constraints, status transitions, generated columns
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  TW_LOCATIONS,
  TW_COMMODITIES,
} from '../setup/test-env';
import {
  createTestDispatch,
  createTestCommodity,
  createTestPurchase,
  getDefaultUnit,
  runCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Dispatch: read existing data
// ---------------------------------------------------------------------------
describe('dispatches: read operations', () => {
  it('test-warehouse has dispatches', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('dispatches')
      .select('id, dispatch_number, status');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  it('can fetch dispatch with items using JOIN', async () => {
    // ARRANGE: create a dispatch via factory
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 50,
      status: 'dispatched',
    });

    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('dispatches')
      .select(`
        id, dispatch_number, status,
        items:dispatch_items(
          id, commodity_id, sent_quantity, received_quantity, shortage, shortage_percent
        )
      `)
      .eq('id', dispatch.id)
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe('dispatched');
    expect(Array.isArray(data!.items)).toBe(true);
    expect(data!.items.length).toBeGreaterThan(0);
  });

  it('can filter dispatches by status', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('dispatches')
      .select('id, status')
      .eq('status', 'received');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2); // DSP-000001 and DSP-000005
    for (const d of data!) {
      expect(d.status).toBe('received');
    }
  });
});

// ---------------------------------------------------------------------------
// Dispatch: create
// ---------------------------------------------------------------------------
describe('dispatches: create operations', () => {
  it('can create a dispatch between two different locations', async () => {
    const unit = await getDefaultUnit(SCHEMA);

    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 50,
      status: 'draft',
    });

    expect(dispatch.id).toBeDefined();
    expect(dispatch.dispatch_number).toMatch(/^DSP-TEST-/);
  });

  it('dispatch_number must be unique (duplicate rejected)', async () => {
    // ARRANGE: create a dispatch first to have an existing number
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 10,
      status: 'draft',
    });

    // ACT: try to insert another with the same dispatch_number
    const { error } = await client
      .from('dispatches')
      .insert({
        dispatch_number: dispatch.dispatch_number, // duplicate!
        origin_location_id: TW_LOCATIONS.LOC1,
        dest_location_id: TW_LOCATIONS.LOC2,
        status: 'draft',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      });

    // ASSERT: unique constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });

  it('[HIGH] same-location dispatch is rejected by CHECK constraint', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('dispatches')
      .insert({
        dispatch_number: `DSP-SAME-${Date.now()}`,
        origin_location_id: TW_LOCATIONS.LOC1,
        dest_location_id: TW_LOCATIONS.LOC1, // same!
        status: 'draft',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Dispatch: status transitions
// ---------------------------------------------------------------------------
describe('dispatches: status transitions', () => {
  it('dispatch can transition from draft → dispatched', async () => {
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 25,
      status: 'draft',
    });

    const { data, error } = await client
      .from('dispatches')
      .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
      .eq('id', dispatch.id)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe('dispatched');
  });

  it('dispatch can transition from dispatched → in_transit', async () => {
    // ARRANGE: create a dispatched dispatch via factory
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 30,
      status: 'dispatched',
    });

    const { data, error } = await client
      .from('dispatches')
      .update({ status: 'in_transit' })
      .eq('id', dispatch.id)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe('in_transit');
  });

  it('invalid status transition is rejected by CHECK constraint', async () => {
    // ARRANGE: create a draft dispatch via factory
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 20,
      status: 'draft',
    });

    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('dispatches')
      .update({ status: 'completed' }) // invalid
      .eq('id', dispatch.id);

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Dispatch: receive flow
// ---------------------------------------------------------------------------
describe('dispatches: receive flow', () => {
  it('receiving a dispatch sets received_quantity and triggers shortage calculation', async () => {
    // ARRANGE: create a dispatch with known sent quantity
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 100,
      status: 'dispatched',
    });

    // Get the dispatch item ID
    const { data: items } = await client
      .from('dispatch_items')
      .select('id')
      .eq('dispatch_id', dispatch.id);

    const itemId = items![0].id;

    // ACT: update received_quantity (simulates receive operation)
    const { data: updatedItem, error } = await client
      .from('dispatch_items')
      .update({ received_quantity: 90 }) // 10 unit shortage
      .eq('id', itemId)
      .select('sent_quantity, received_quantity, shortage, shortage_percent')
      .single();

    // ASSERT: generated columns calculated correctly
    expect(error).toBeNull();
    expect(Number(updatedItem!.sent_quantity)).toBe(100);
    expect(Number(updatedItem!.received_quantity)).toBe(90);
    expect(Number(updatedItem!.shortage)).toBe(10);
    expect(Number(updatedItem!.shortage_percent)).toBe(10);
  });

  it('shortage is NULL when received_quantity is NULL', async () => {
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 50,
      status: 'dispatched',
    });

    const { data: items } = await client
      .from('dispatch_items')
      .select('shortage, shortage_percent')
      .eq('dispatch_id', dispatch.id);

    // Newly created item has no received_quantity — shortage should be NULL
    expect(items![0].shortage).toBeNull();
    expect(items![0].shortage_percent).toBeNull();
  });

  it('zero shortage when received equals sent', async () => {
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 100,
      status: 'dispatched',
    });

    const { data: items } = await client
      .from('dispatch_items')
      .select('id')
      .eq('dispatch_id', dispatch.id);

    const { data: updatedItem } = await client
      .from('dispatch_items')
      .update({ received_quantity: 100 }) // exact match — no shortage
      .eq('id', items![0].id)
      .select('shortage, shortage_percent')
      .single();

    expect(Number(updatedItem!.shortage)).toBe(0);
    expect(Number(updatedItem!.shortage_percent)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dispatch: stock_levels impact
// ---------------------------------------------------------------------------
describe('dispatches: impact on stock_levels view', () => {
  it('dispatches with status received appear in total_in at dest location', async () => {
    // ARRANGE: DSP-000001 is received — should contribute to dest location's total_in
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('stock_levels')
      .select('commodity_id, location_id, total_in, total_out, current_stock');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);

    // Verify the view computes non-zero stock from received dispatches
    const hasNonZeroIn = data!.some((r) => Number(r.total_in) > 0);
    expect(hasNonZeroIn).toBe(true);
  });

  it('in_transit dispatches appear in in_transit column but not total_in', async () => {
    // ARRANGE: the stock_levels VIEW only generates a row for a (location, commodity) pair
    // when at least one received purchase or confirmed/dispatched sale exists. Seed a minimal
    // received purchase at LOC2 to create the VIEW row, then create the in_transit dispatch.
    // Using an isolated commodity ensures zero interference from concurrent test workers.
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const isolatedCommodity = await createTestCommodity(SCHEMA, {
      name: `InTransit Commodity ${Date.now()}`,
      code: `ITC-${Date.now()}`,
    });

    // Seed: received purchase at LOC2 to establish VIEW row for the isolated commodity
    await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC2,
      commodityId: isolatedCommodity.id,
      unitId: unit.id,
      quantity: 5,
      status: 'received',
    });

    // ACT: create an in_transit dispatch from LOC1 to LOC2
    await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: isolatedCommodity.id,
      unitId: unit.id,
      sentQuantity: 40,
      status: 'in_transit',
    });

    // ASSERT: in_transit == 40; total_in == 5 (seed only — in_transit does NOT count toward total_in)
    const { data: after } = await client
      .from('stock_levels')
      .select('in_transit, total_in')
      .eq('location_id', TW_LOCATIONS.LOC2)
      .eq('commodity_id', isolatedCommodity.id);

    const inTransitAfter = after?.[0] ? Number(after[0].in_transit) : 0;
    const totalInAfter = after?.[0] ? Number(after[0].total_in) : 0;

    expect(inTransitAfter).toBe(40);
    expect(totalInAfter).toBe(5); // total_in unchanged by in_transit dispatch
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('dispatches API: HTTP contract (requires dev server + auth)', () => {
  it('POST /dispatches with same origin/dest returns 400', async () => {
    expect(true).toBe(true);
  });

  it('POST /dispatches/[id]/receive on non-dispatched status returns 409', async () => {
    expect(true).toBe(true);
  });

  it('GET /dispatches returns only dispatches accessible to user location', async () => {
    expect(true).toBe(true);
  });

  it('POST /dispatches/[id]/receive with missing items returns 400', async () => {
    expect(true).toBe(true);
  });
});
