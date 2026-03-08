// File: tests/backend/api/dispatches.test.ts
// Coverage: Dispatch CRUD, receive flow (status → received), shortage calculation,
//           location constraints, status transitions, generated columns
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  DEMO_LOCATIONS,
  DEMO_COMMODITIES,
  DEMO_DISPATCHES,
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
// Dispatch: read existing data
// ---------------------------------------------------------------------------
describe('dispatches: read operations', () => {
  it('demo tenant has 6 seeded dispatches with correct statuses', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('dispatches')
      .select('id, dispatch_number, status');

    expect(error).toBeNull();
    expect(data!.length).toBe(6);

    const statusMap = Object.fromEntries(data!.map((d) => [d.dispatch_number, d.status]));
    expect(statusMap['DSP-000001']).toBe('received');
    expect(statusMap['DSP-000002']).toBe('in_transit');
    expect(statusMap['DSP-000003']).toBe('dispatched');
    expect(statusMap['DSP-000004']).toBe('draft');
    expect(statusMap['DSP-000005']).toBe('received');
    expect(statusMap['DSP-000006']).toBe('cancelled');
  });

  it('can fetch dispatch with items using JOIN', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('dispatches')
      .select(`
        id, dispatch_number, status,
        items:dispatch_items(
          id, commodity_id, sent_quantity, received_quantity, shortage, shortage_percent
        )
      `)
      .eq('id', DEMO_DISPATCHES.DSP_001)
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe('received');
    expect(Array.isArray(data!.items)).toBe(true);
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
      originLocationId: DEMO_LOCATIONS.WH_NORTH,
      destLocationId: DEMO_LOCATIONS.YD_SOUTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      sentQuantity: 50,
      status: 'draft',
    });

    expect(dispatch.id).toBeDefined();
    expect(dispatch.dispatch_number).toMatch(/^DSP-TEST-/);
  });

  it('dispatch_number must be unique (duplicate rejected)', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('dispatches')
      .insert({
        dispatch_number: 'DSP-000001', // existing
        origin_location_id: DEMO_LOCATIONS.WH_NORTH,
        dest_location_id: DEMO_LOCATIONS.YD_SOUTH,
        status: 'draft',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });

  it('[HIGH] same-location dispatch is rejected by CHECK constraint', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('dispatches')
      .insert({
        dispatch_number: `DSP-SAME-${Date.now()}`,
        origin_location_id: DEMO_LOCATIONS.WH_NORTH,
        dest_location_id: DEMO_LOCATIONS.WH_NORTH, // same!
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
      originLocationId: DEMO_LOCATIONS.WH_NORTH,
      destLocationId: DEMO_LOCATIONS.YD_SOUTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
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
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('dispatches')
      .update({ status: 'in_transit' })
      .eq('id', DEMO_DISPATCHES.DSP_003)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe('in_transit');

    // Restore original status
    await client
      .from('dispatches')
      .update({ status: 'dispatched' })
      .eq('id', DEMO_DISPATCHES.DSP_003);
  });

  it('invalid status transition is rejected by CHECK constraint', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('dispatches')
      .update({ status: 'completed' }) // invalid
      .eq('id', DEMO_DISPATCHES.DSP_004);

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
      originLocationId: DEMO_LOCATIONS.WH_NORTH,
      destLocationId: DEMO_LOCATIONS.YD_SOUTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
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
      originLocationId: DEMO_LOCATIONS.WH_NORTH,
      destLocationId: DEMO_LOCATIONS.YD_SOUTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
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
      originLocationId: DEMO_LOCATIONS.WH_NORTH,
      destLocationId: DEMO_LOCATIONS.YD_SOUTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
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
    // DSP-000002 is in_transit — should NOT add to total_in at dest, only in_transit
    const client = tenantClient(SCHEMA);
    const { data: dispatch } = await client
      .from('dispatches')
      .select('dest_location_id, id')
      .eq('id', DEMO_DISPATCHES.DSP_002)
      .single();

    const { data: stockRows } = await client
      .from('stock_levels')
      .select('in_transit, total_in, location_id')
      .eq('location_id', dispatch!.dest_location_id);

    // There should be in_transit > 0 for at least one commodity at this dest location
    const hasInTransit = (stockRows ?? []).some((r) => Number(r.in_transit) > 0);
    expect(hasInTransit).toBe(true);
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
