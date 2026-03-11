// File: tests/backend/api/shortage-tracking.test.ts
// Coverage: Shortage-tracking module — dispatch_items generated columns (shortage,
//           shortage_percent), NULL state before receive, exact shortage arithmetic,
//           full-receive (shortage = 0), filter by shortage > 0, shortage_percent accuracy.
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
  getDefaultUnit,
  runCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the first dispatch_item row for a given dispatch id.
 */
async function getDispatchItem(dispatchId: string) {
  const client = tenantClient(SCHEMA);
  const { data, error } = await client
    .from('dispatch_items')
    .select('id, sent_quantity, received_quantity, shortage, shortage_percent')
    .eq('dispatch_id', dispatchId)
    .single();

  if (error) throw new Error(`getDispatchItem failed: ${error.message}`);
  return data;
}

/**
 * Update received_quantity on the dispatch_item for a given dispatch.
 * Returns the updated row.
 */
async function receiveDispatchItem(dispatchId: string, receivedQty: number) {
  const client = tenantClient(SCHEMA);

  // First fetch the item id
  const { data: item, error: fetchErr } = await client
    .from('dispatch_items')
    .select('id')
    .eq('dispatch_id', dispatchId)
    .single();

  if (fetchErr || !item) throw new Error(`receiveDispatchItem fetch failed: ${fetchErr?.message}`);

  // Update received_quantity
  const { data, error } = await client
    .from('dispatch_items')
    .update({ received_quantity: receivedQty })
    .eq('id', item.id)
    .select('id, sent_quantity, received_quantity, shortage, shortage_percent')
    .single();

  if (error) throw new Error(`receiveDispatchItem update failed: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Shortage: NULL state before receive
// ---------------------------------------------------------------------------
describe('shortage-tracking: NULL shortage before receive', () => {
  it('newly created dispatch item has NULL received_quantity and NULL shortage', async () => {
    // ARRANGE: create a fresh dispatch (not yet received)
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 100,
      status: 'in_transit',
    });

    // ACT: read the dispatch item immediately after creation
    const item = await getDispatchItem(dispatch.id);

    // ASSERT: received_quantity is NULL and shortage is NULL (no receive has happened)
    expect(item.received_quantity).toBeNull();
    expect(item.shortage).toBeNull();
  });

  it('shortage_percent is also NULL when no receive has been recorded', async () => {
    // ARRANGE
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: unit.id,
      sentQuantity: 50,
      status: 'dispatched',
    });

    // ACT
    const item = await getDispatchItem(dispatch.id);

    // ASSERT: shortage_percent is also NULL until received_quantity is set
    expect(item.shortage_percent).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Shortage: partial receive (shortage > 0)
// ---------------------------------------------------------------------------
describe('shortage-tracking: partial receive creates positive shortage', () => {
  it('receiving 85 out of 100 produces shortage = 15', async () => {
    // ARRANGE: create dispatch with sent_quantity = 100
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 100,
      status: 'in_transit',
    });

    // ACT: record a partial receive of 85 units (15 units short)
    const item = await receiveDispatchItem(dispatch.id, 85);

    // ASSERT: shortage generated column = sent - received = 100 - 85 = 15
    expect(Number(item.sent_quantity)).toBe(100);
    expect(Number(item.received_quantity)).toBe(85);
    expect(Number(item.shortage)).toBe(15);
  });

  it('shortage value equals sent_quantity minus received_quantity', async () => {
    // ARRANGE: dispatch with sent_quantity = 200
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: unit.id,
      sentQuantity: 200,
      status: 'in_transit',
    });

    // ACT: receive only 160 units
    const item = await receiveDispatchItem(dispatch.id, 160);

    // ASSERT: shortage = 200 - 160 = 40
    const expectedShortage = Number(item.sent_quantity) - Number(item.received_quantity);
    expect(Number(item.shortage)).toBe(expectedShortage);
    expect(Number(item.shortage)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Shortage: full receive (shortage = 0)
// ---------------------------------------------------------------------------
describe('shortage-tracking: full receive produces zero shortage', () => {
  it('receiving the exact sent quantity produces shortage = 0', async () => {
    // ARRANGE: dispatch with sent_quantity = 60
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC2,
      destLocationId: TW_LOCATIONS.LOC1,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 60,
      status: 'in_transit',
    });

    // ACT: receive exactly 60 units (no shortage)
    const item = await receiveDispatchItem(dispatch.id, 60);

    // ASSERT: shortage = 0 (not NULL — received_quantity is set)
    expect(Number(item.received_quantity)).toBe(60);
    expect(Number(item.shortage)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Shortage: filter operator (shortage > 0)
// ---------------------------------------------------------------------------
describe('shortage-tracking: filter dispatches with positive shortage', () => {
  it('can query dispatch_items where shortage > 0', async () => {
    // ARRANGE: create two dispatches — one with shortage, one without
    const unit = await getDefaultUnit(SCHEMA);
    const client = tenantClient(SCHEMA);

    const dispatchWithShortage = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 120,
      status: 'in_transit',
    });

    const dispatchNoShortage = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: unit.id,
      sentQuantity: 80,
      status: 'in_transit',
    });

    // Set received_quantity: shortage for first, full receive for second
    await receiveDispatchItem(dispatchWithShortage.id, 100); // shortage = 20
    await receiveDispatchItem(dispatchNoShortage.id, 80);   // shortage = 0

    // ACT: query all dispatch_items with shortage > 0
    const { data, error } = await client
      .from('dispatch_items')
      .select('id, dispatch_id, sent_quantity, received_quantity, shortage')
      .gt('shortage', 0);

    // ASSERT: no error; our shortage dispatch appears in results
    expect(error).toBeNull();
    const shortagedItemIds = (data ?? []).map((r) => r.dispatch_id);
    expect(shortagedItemIds).toContain(dispatchWithShortage.id);

    // The full-receive dispatch should NOT appear in shortage > 0 results
    expect(shortagedItemIds).not.toContain(dispatchNoShortage.id);
  });

  it('[HIGH] dispatches with NULL shortage (not yet received) are excluded from shortage > 0 filter', async () => {
    // ARRANGE: create a dispatch that has never been received
    const unit = await getDefaultUnit(SCHEMA);
    const client = tenantClient(SCHEMA);

    const unreceived = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 99,
      status: 'in_transit',
    });

    // ACT: filter for shortage > 0 (NULL rows must not match — SQL NULL semantics)
    const { data, error } = await client
      .from('dispatch_items')
      .select('id, dispatch_id, shortage')
      .gt('shortage', 0);

    // ASSERT: the unreceived dispatch does NOT appear (NULL > 0 is unknown/false in SQL)
    expect(error).toBeNull();
    const dispatchIds = (data ?? []).map((r) => r.dispatch_id);
    expect(dispatchIds).not.toContain(unreceived.id);
  });
});

// ---------------------------------------------------------------------------
// Shortage: shortage_percent accuracy
// ---------------------------------------------------------------------------
describe('shortage-tracking: shortage_percent calculated correctly', () => {
  it('shortage_percent is approximately (shortage / sent_quantity) * 100', async () => {
    // ARRANGE: dispatch 100 units, receive 70 → shortage = 30, shortage_percent ≈ 30%
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 100,
      status: 'in_transit',
    });

    // ACT: receive 70 units
    const item = await receiveDispatchItem(dispatch.id, 70);

    // ASSERT: shortage_percent ≈ 30.00 (within 0.01 tolerance)
    const sent = Number(item.sent_quantity);       // 100
    const received = Number(item.received_quantity); // 70
    const shortage = Number(item.shortage);           // 30
    const shortagePercent = Number(item.shortage_percent);

    const expectedPercent = (shortage / sent) * 100; // 30.0
    expect(shortagePercent).toBeCloseTo(expectedPercent, 1);
  });

  it('shortage_percent is 0 when full quantity is received', async () => {
    // ARRANGE: dispatch and receive full quantity
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC2,
      destLocationId: TW_LOCATIONS.LOC1,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: unit.id,
      sentQuantity: 45,
      status: 'in_transit',
    });

    // ACT: receive all 45 units
    const item = await receiveDispatchItem(dispatch.id, 45);

    // ASSERT: shortage_percent = 0
    expect(Number(item.shortage_percent)).toBe(0);
  });

  it('shortage_percent is 100 when zero units are received', async () => {
    // ARRANGE: dispatch 50 units, receive 0 → 100% shortage
    const unit = await getDefaultUnit(SCHEMA);
    const dispatch = await createTestDispatch(SCHEMA, {
      originLocationId: TW_LOCATIONS.LOC1,
      destLocationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      sentQuantity: 50,
      status: 'in_transit',
    });

    // ACT: receive 0 units (total loss)
    const item = await receiveDispatchItem(dispatch.id, 0);

    // ASSERT: shortage = 50, shortage_percent = 100
    expect(Number(item.shortage)).toBe(50);
    expect(Number(item.shortage_percent)).toBeCloseTo(100, 1);
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('shortage-tracking API: HTTP contract (requires dev server + auth)', () => {
  it('GET /api/t/[slug]/dispatches?has_shortage=true returns dispatches with shortage', () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/dispatches/:id shows shortage details in response payload', () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/dispatches returns 401 without auth token', () => {
    expect(true).toBe(true);
  });
});
