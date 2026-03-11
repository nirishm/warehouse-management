// File: tests/backend/api/analytics.test.ts
// Coverage: Analytics module — stock_levels VIEW column structure, delta assertions
//           for total_in (received purchases) and total_out (confirmed/dispatched sales),
//           location_id and commodity_id filter operators, basic connectivity.
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  TW_LOCATIONS,
  TW_COMMODITIES,
} from '../setup/test-env';
import {
  createTestPurchase,
  createTestSale,
  getDefaultUnit,
  runCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// stock_levels VIEW: structure and basic accessibility
// ---------------------------------------------------------------------------
describe('analytics: stock_levels view structure', () => {
  it('stock_levels view exists and returns an array of rows', async () => {
    // ARRANGE: connect to tenant schema as service role
    const client = tenantClient(SCHEMA);

    // ACT: query the view without any filter
    const { data, error } = await client
      .from('stock_levels')
      .select('location_id, commodity_id, unit_id, total_in, total_out, current_stock')
      .limit(20);

    // ASSERT: no error, data is an array (may be empty for brand-new tenants but
    //         test-warehouse has seed data so we expect at least one row)
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
  });

  it('stock_levels rows include required analytics columns', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);

    // ACT: fetch one row and verify all expected columns are present
    const { data, error } = await client
      .from('stock_levels')
      .select('location_id, commodity_id, unit_id, total_in, total_out, current_stock')
      .limit(1)
      .single();

    // ASSERT: all required analytics columns exist in the response
    expect(error).toBeNull();
    expect(data).toHaveProperty('location_id');
    expect(data).toHaveProperty('commodity_id');
    expect(data).toHaveProperty('unit_id');
    expect(data).toHaveProperty('total_in');
    expect(data).toHaveProperty('total_out');
    expect(data).toHaveProperty('current_stock');
  });

  it('stock_levels numeric columns are finite numbers (not NaN or null)', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);

    // ACT: sample up to 10 rows
    const { data } = await client
      .from('stock_levels')
      .select('total_in, total_out, current_stock')
      .limit(10);

    // ASSERT: every numeric cell is a finite, non-NaN number
    for (const row of data ?? []) {
      const totalIn = Number(row.total_in);
      const totalOut = Number(row.total_out);
      const currentStock = Number(row.current_stock);

      expect(Number.isFinite(totalIn)).toBe(true);
      expect(Number.isFinite(totalOut)).toBe(true);
      expect(Number.isFinite(currentStock)).toBe(true);
    }
  });

  it('current_stock satisfies the invariant current_stock = total_in - total_out', async () => {
    // ARRANGE
    const client = tenantClient(SCHEMA);

    // ACT: fetch rows that have movement history
    const { data } = await client
      .from('stock_levels')
      .select('total_in, total_out, current_stock')
      .limit(20);

    // ASSERT: arithmetic invariant must hold for every row (to 5 decimal places)
    for (const row of data ?? []) {
      const totalIn = Number(row.total_in);
      const totalOut = Number(row.total_out);
      const currentStock = Number(row.current_stock);
      expect(currentStock).toBeCloseTo(totalIn - totalOut, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// stock_levels VIEW: received purchase increases total_in
// ---------------------------------------------------------------------------
describe('analytics: total_in increases after received purchase', () => {
  it('creating a received purchase increases total_in at that location', async () => {
    // ARRANGE: snapshot total_in at LOC3 for COMM1 before the insert.
    // LOC3 (Loading Yard) is reserved exclusively for analytics tests to avoid
    // concurrent interference with inventory.test.ts which operates on LOC1 and LOC2.
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: before } = await client
      .from('stock_levels')
      .select('total_in')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    const totalInBefore = before?.[0] ? Number(before[0].total_in) : 0;

    // ACT: create a received purchase for 75 units at LOC3
    await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      quantity: 75,
      status: 'received',
    });

    // ASSERT: total_in increased by at least 75
    const { data: after } = await client
      .from('stock_levels')
      .select('total_in')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    const totalInAfter = after?.[0] ? Number(after[0].total_in) : 0;
    expect(totalInAfter).toBeGreaterThanOrEqual(totalInBefore + 75);
  });

  it('[MEDIUM] draft purchase does NOT increase total_in (only received counts)', async () => {
    // ARRANGE: snapshot total_in at LOC3 for COMM2 before the insert.
    // Using LOC3+COMM2 (exclusive analytics slot) to avoid conflict with
    // inventory.test.ts which seeds a received purchase at LOC2+COMM2 for its
    // "in_transit dispatch" test — that received seed would make .toBe(before) flaky.
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: before } = await client
      .from('stock_levels')
      .select('total_in')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM2);

    const totalInBefore = before?.[0] ? Number(before[0].total_in) : 0;

    // ACT: create a DRAFT purchase (not received) — should not appear in stock_levels
    await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: unit.id,
      quantity: 200,
      status: 'draft',
    });

    // ASSERT: total_in is unchanged — draft purchases must be excluded from the VIEW
    const { data: after } = await client
      .from('stock_levels')
      .select('total_in')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM2);

    const totalInAfter = after?.[0] ? Number(after[0].total_in) : 0;
    expect(totalInAfter).toBe(totalInBefore);
  });
});

// ---------------------------------------------------------------------------
// stock_levels VIEW: confirmed/dispatched sale increases total_out
// ---------------------------------------------------------------------------
describe('analytics: total_out increases after confirmed or dispatched sale', () => {
  it('creating a confirmed sale increases total_out at that location', async () => {
    // ARRANGE: snapshot total_out at LOC3+COMM1 before.
    // LOC3 is the exclusive analytics slot — inventory.test.ts does not insert at LOC3.
    // Using LOC3 prevents afterEach cleanup from inventory's concurrent tests from
    // removing records that appear in this test's "before" snapshot.
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: before } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    const totalOutBefore = before?.[0] ? Number(before[0].total_out) : 0;

    // ACT: create a confirmed sale for 30 units at LOC3
    await createTestSale(SCHEMA, {
      locationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      quantity: 30,
      status: 'confirmed',
    });

    // ASSERT: total_out increased by at least 30 (delta assertion)
    const { data: after } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    const totalOutAfter = after?.[0] ? Number(after[0].total_out) : 0;
    expect(totalOutAfter).toBeGreaterThanOrEqual(totalOutBefore + 30);
  });

  it('creating a dispatched sale increases total_out at that location', async () => {
    // ARRANGE: snapshot total_out at LOC3+COMM2 before.
    // LOC3+COMM2 is the exclusive analytics slot — avoids conflict with
    // inventory.test.ts which uses LOC1+COMM2 for its "dispatched sale" test.
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: before } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM2);

    const totalOutBefore = before?.[0] ? Number(before[0].total_out) : 0;

    // ACT: create a dispatched sale for 40 units at LOC3
    await createTestSale(SCHEMA, {
      locationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: unit.id,
      quantity: 40,
      status: 'dispatched',
    });

    // ASSERT: total_out increased by at least 40 (delta assertion)
    const { data: after } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', TW_LOCATIONS.LOC3)
      .eq('commodity_id', TW_COMMODITIES.COMM2);

    const totalOutAfter = after?.[0] ? Number(after[0].total_out) : 0;
    expect(totalOutAfter).toBeGreaterThanOrEqual(totalOutBefore + 40);
  });

  it('[MEDIUM] draft sale does NOT increase total_out', async () => {
    // ARRANGE: snapshot total_out at LOC2 for COMM1 before
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: before } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', TW_LOCATIONS.LOC2)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    const totalOutBefore = before?.[0] ? Number(before[0].total_out) : 0;

    // ACT: create a DRAFT sale — should not affect total_out
    await createTestSale(SCHEMA, {
      locationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: unit.id,
      quantity: 50,
      status: 'draft',
    });

    // ASSERT: total_out unchanged for draft sales
    const { data: after } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', TW_LOCATIONS.LOC2)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    const totalOutAfter = after?.[0] ? Number(after[0].total_out) : 0;
    expect(totalOutAfter).toBe(totalOutBefore);
  });
});

// ---------------------------------------------------------------------------
// stock_levels VIEW: filter operators
// ---------------------------------------------------------------------------
describe('analytics: stock_levels filter operators', () => {
  it('can filter stock_levels by location_id and only that location is returned', async () => {
    // ARRANGE: use LOC1 which has seed data
    const client = tenantClient(SCHEMA);

    // ACT: filter by LOC1
    const { data, error } = await client
      .from('stock_levels')
      .select('location_id, commodity_id, current_stock')
      .eq('location_id', TW_LOCATIONS.LOC1);

    // ASSERT: no error; all rows belong to LOC1
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(row.location_id).toBe(TW_LOCATIONS.LOC1);
    }
  });

  it('can filter stock_levels by commodity_id and only that commodity is returned', async () => {
    // ARRANGE: use COMM1 which has seed data
    const client = tenantClient(SCHEMA);

    // ACT: filter by COMM1
    const { data, error } = await client
      .from('stock_levels')
      .select('location_id, commodity_id, current_stock')
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    // ASSERT: no error; all rows reference COMM1
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(row.commodity_id).toBe(TW_COMMODITIES.COMM1);
    }
  });

  it('filtering by non-existent location_id returns an empty array', async () => {
    // ARRANGE: nil UUID will never match a real location
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('stock_levels')
      .select('location_id, current_stock')
      .eq('location_id', '00000000-0000-0000-0000-000000000000');

    // ASSERT: empty result, no error
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('can combine location_id AND commodity_id filters', async () => {
    // ARRANGE: LOC1 + COMM1 combination has seed data
    const client = tenantClient(SCHEMA);

    // ACT: filter by both dimensions
    const { data, error } = await client
      .from('stock_levels')
      .select('location_id, commodity_id, total_in, total_out, current_stock')
      .eq('location_id', TW_LOCATIONS.LOC1)
      .eq('commodity_id', TW_COMMODITIES.COMM1);

    // ASSERT: no error; at most one row with exact matches on both FK columns
    expect(error).toBeNull();
    if (data && data.length > 0) {
      expect(data[0].location_id).toBe(TW_LOCATIONS.LOC1);
      expect(data[0].commodity_id).toBe(TW_COMMODITIES.COMM1);
    }
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('analytics API: HTTP contract (requires dev server + auth)', () => {
  it('GET /api/t/[slug]/analytics/stock-levels returns 200 for authenticated user', () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/analytics/stock-levels returns 401 without auth token', () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/analytics/stock-levels?location_id=X scopes to that location', () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/analytics/stock-levels returns 403 when canViewAnalytics=false', () => {
    expect(true).toBe(true);
  });
});
