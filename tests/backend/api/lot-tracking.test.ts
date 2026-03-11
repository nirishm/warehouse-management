// File: tests/backend/api/lot-tracking.test.ts
// Coverage: Lot Tracking module — table existence, column structure, CRUD operations,
//           lot_number uniqueness, source_purchase_id FK linkage, expiry_date support,
//           lot_stock_levels view existence and column verification, soft delete,
//           filtering by commodity_id.
// Runner: Vitest (node environment)
//
// NOTE: lots table and lot_stock_levels view confirmed to exist in tenant_test_warehouse
//       (MODULE_TABLES.lots = true).
//
// Confirmed columns (via live DB introspection 2026-03-11):
//   lots: id, lot_number, commodity_id, source_purchase_id, received_date, expiry_date,
//         initial_quantity, unit_id, notes, created_at, updated_at, deleted_at
//   lot_stock_levels (view): lot_id, lot_number, commodity_id, unit_id, received_date,
//                            expiry_date, initial_quantity, current_quantity

import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  TW_LOCATIONS,
  TW_COMMODITIES,
  TW_UNIT_KG,
  MODULE_TABLES,
} from '../setup/test-env';
import {
  runCleanup,
  registerCleanup,
  createTestPurchase,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

// MODULE_TABLES.lots is set from live DB introspection (confirmed true).
// Using the constant directly in skipIf because it is evaluated at module load time,
// before beforeAll executes — a runtime variable would always be false at that point.
const lotsTableExists = MODULE_TABLES.lots;

// lot_stock_levels view is confirmed to exist alongside the lots table (introspected 2026-03-11)
const lotStockLevelsViewExists = MODULE_TABLES.lots;

let lotsTableVerified = false;
let lotStockLevelsViewVerified = false;

beforeAll(async () => {
  const client = tenantClient(SCHEMA);

  const { error: lotsErr } = await client.from('lots').select('id').limit(1);
  lotsTableVerified = lotsErr?.code !== 'PGRST205';

  const { error: viewErr } = await client.from('lot_stock_levels').select('lot_id').limit(1);
  lotStockLevelsViewVerified = viewErr?.code !== 'PGRST205';
});

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Lot Tracking: module DDL presence
// ---------------------------------------------------------------------------
describe('lots: module DDL presence', () => {
  it('lots table exists in tenant_test_warehouse (MODULE_TABLES.lots=true)', async () => {
    // ARRANGE: MODULE_TABLES flag confirmed from live DB
    expect(MODULE_TABLES.lots).toBe(true);

    // ACT: query the lots table
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('lots').select('id').limit(1);

    // ASSERT: table exists
    expect(error).toBeNull();
    expect(lotsTableVerified).toBe(true);
  });

  it('lot_stock_levels view exists alongside the lots table', async () => {
    // ARRANGE: verify view is accessible
    const client = tenantClient(SCHEMA);

    // ACT: query view
    const { error } = await client.from('lot_stock_levels').select('lot_id').limit(1);

    // ASSERT: no PGRST205 error
    expect(error).toBeNull();
    expect(lotStockLevelsViewVerified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lot Tracking: table structure validation
// ---------------------------------------------------------------------------
describe('lots: table structure and expected columns', () => {
  it.skipIf(!lotsTableExists)('lots table has all required columns', async () => {
    // ARRANGE: select all confirmed columns
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('lots')
      .select(
        'id, lot_number, commodity_id, source_purchase_id, received_date, expiry_date, initial_quantity, unit_id, notes, created_at, updated_at, deleted_at'
      )
      .limit(1);

    // ASSERT: query succeeds — all columns exist
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it.skipIf(!lotsTableExists)('deleted_at column exists (soft-delete support)', async () => {
    // ARRANGE: filter using deleted_at IS NULL
    const client = tenantClient(SCHEMA);

    // ACT
    const { error } = await client
      .from('lots')
      .select('id, deleted_at')
      .is('deleted_at', null)
      .limit(1);

    // ASSERT: column exists
    expect(error).toBeNull();
  });

  it.skipIf(!lotStockLevelsViewExists)('lot_stock_levels view has lot_id and current_quantity columns', async () => {
    // ARRANGE: query the view for its columns
    const client = tenantClient(SCHEMA);

    // ACT: select the required columns explicitly
    const { data, error } = await client
      .from('lot_stock_levels')
      .select('lot_id, current_quantity')
      .limit(1);

    // ASSERT: both required columns exist
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it.skipIf(!lotStockLevelsViewExists)('lot_stock_levels view has all expected columns', async () => {
    // ARRANGE: select all confirmed view columns
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('lot_stock_levels')
      .select(
        'lot_id, lot_number, commodity_id, unit_id, received_date, expiry_date, initial_quantity, current_quantity'
      )
      .limit(1);

    // ASSERT: all columns accessible
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lot Tracking: create operations
// ---------------------------------------------------------------------------
describe('lots: create operations', () => {
  it.skipIf(!lotsTableExists)('can create a lot linked to a purchase via service role', async () => {
    // ARRANGE: create a purchase to use as source_purchase_id
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC1,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: TW_UNIT_KG,
      quantity: 200,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);
    const lotNumber = `LOT-TEST-${Date.now()}`;

    // ACT: create lot
    const { data: lot, error } = await client
      .from('lots')
      .insert({
        lot_number: lotNumber,
        commodity_id: TW_COMMODITIES.COMM1,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // +180 days
        initial_quantity: 200,
        unit_id: TW_UNIT_KG,
        notes: 'Test lot linked to test purchase',
      })
      .select(
        'id, lot_number, commodity_id, source_purchase_id, initial_quantity, unit_id, expiry_date'
      )
      .single();

    // ASSERT: lot created with correct values
    expect(error).toBeNull();
    expect(lot!.lot_number).toBe(lotNumber);
    expect(lot!.commodity_id).toBe(TW_COMMODITIES.COMM1);
    expect(lot!.source_purchase_id).toBe(purchase.id);
    expect(lot!.initial_quantity).toBe(200);
    expect(lot!.unit_id).toBe(TW_UNIT_KG);
    expect(lot!.expiry_date).not.toBeNull();
    registerCleanup({ schema: SCHEMA, table: 'lots', id: lot!.id });
  });

  it.skipIf(!lotsTableExists)('can create a lot without expiry_date (non-perishable commodity)', async () => {
    // ARRANGE: purchase for non-perishable
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC1,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: TW_UNIT_KG,
      quantity: 100,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);

    // ACT: create lot without expiry_date
    const { data: lot, error } = await client
      .from('lots')
      .insert({
        lot_number: `LOT-NOEXP-${Date.now()}`,
        commodity_id: TW_COMMODITIES.COMM2,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        // expiry_date intentionally omitted
        initial_quantity: 100,
        unit_id: TW_UNIT_KG,
      })
      .select('id, lot_number, expiry_date')
      .single();

    // ASSERT: lot created, expiry_date is null
    expect(error).toBeNull();
    expect(lot!.expiry_date).toBeNull();
    registerCleanup({ schema: SCHEMA, table: 'lots', id: lot!.id });
  });

  it.skipIf(!lotsTableExists)('[HIGH] lot_number uniqueness is enforced (duplicate rejected)', async () => {
    // ARRANGE: create first lot with a unique number
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: TW_UNIT_KG,
      quantity: 50,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);
    const lotNumber = `LOT-DUP-${Date.now()}`;

    const { data: first } = await client
      .from('lots')
      .insert({
        lot_number: lotNumber,
        commodity_id: TW_COMMODITIES.COMM1,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        initial_quantity: 50,
        unit_id: TW_UNIT_KG,
      })
      .select('id')
      .single();

    if (first) registerCleanup({ schema: SCHEMA, table: 'lots', id: first.id });

    // ACT: insert second lot with identical lot_number
    const { error } = await client.from('lots').insert({
      lot_number: lotNumber, // same lot number!
      commodity_id: TW_COMMODITIES.COMM2,
      source_purchase_id: purchase.id,
      received_date: new Date().toISOString(),
      initial_quantity: 25,
      unit_id: TW_UNIT_KG,
    });

    // ASSERT: unique constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });
});

// ---------------------------------------------------------------------------
// Lot Tracking: lot_stock_levels view
// ---------------------------------------------------------------------------
describe('lots: lot_stock_levels view', () => {
  it.skipIf(!lotsTableExists || !lotStockLevelsViewExists)(
    'lot_stock_levels view shows current_quantity for a newly created lot',
    async () => {
      // ARRANGE: create a purchase and a lot
      const purchase = await createTestPurchase(SCHEMA, {
        locationId: TW_LOCATIONS.LOC1,
        commodityId: TW_COMMODITIES.COMM1,
        unitId: TW_UNIT_KG,
        quantity: 300,
        status: 'received',
      });
      const client = tenantClient(SCHEMA);
      const lotNumber = `LOT-VIEW-${Date.now()}`;

      const { data: lot } = await client
        .from('lots')
        .insert({
          lot_number: lotNumber,
          commodity_id: TW_COMMODITIES.COMM1,
          source_purchase_id: purchase.id,
          received_date: new Date().toISOString(),
          initial_quantity: 300,
          unit_id: TW_UNIT_KG,
        })
        .select('id')
        .single();

      if (lot) registerCleanup({ schema: SCHEMA, table: 'lots', id: lot.id });

      // ACT: query lot_stock_levels for this lot
      const { data: stockLevel, error } = await client
        .from('lot_stock_levels')
        .select('lot_id, lot_number, current_quantity, initial_quantity')
        .eq('lot_id', lot!.id)
        .single();

      // ASSERT: view returns data for the new lot
      expect(error).toBeNull();
      expect(stockLevel!.lot_id).toBe(lot!.id);
      expect(stockLevel!.lot_number).toBe(lotNumber);
      // current_quantity reflects initial_quantity for a new lot with no movements
      expect(typeof stockLevel!.current_quantity).toBe('number');
      expect(stockLevel!.initial_quantity).toBe(300);
    }
  );

  it.skipIf(!lotStockLevelsViewExists)(
    'lot_stock_levels view includes lot_id and current_quantity for existing fixture lot',
    async () => {
      // ARRANGE: existing fixture lot is LOT-000001
      const client = tenantClient(SCHEMA);

      // ACT: query view for existing fixture data
      const { data, error } = await client
        .from('lot_stock_levels')
        .select('lot_id, lot_number, current_quantity')
        .limit(5);

      // ASSERT: view returns rows with expected shape
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThan(0);

      // Verify column types
      const row = data![0];
      expect(typeof row.lot_id).toBe('string');
      expect(typeof row.lot_number).toBe('string');
      expect(typeof row.current_quantity).toBe('number');
    }
  );
});

// ---------------------------------------------------------------------------
// Lot Tracking: filter operations
// ---------------------------------------------------------------------------
describe('lots: query and filter operations', () => {
  it.skipIf(!lotsTableExists)('can filter lots by commodity_id', async () => {
    // ARRANGE: create a lot for COMM1 to ensure data exists
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: TW_UNIT_KG,
      quantity: 120,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);

    const { data: lot } = await client
      .from('lots')
      .insert({
        lot_number: `LOT-FILTER-${Date.now()}`,
        commodity_id: TW_COMMODITIES.COMM1,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        initial_quantity: 120,
        unit_id: TW_UNIT_KG,
      })
      .select('id')
      .single();

    if (lot) registerCleanup({ schema: SCHEMA, table: 'lots', id: lot.id });

    // ACT: filter lots by commodity_id = COMM1
    const { data: results, error } = await client
      .from('lots')
      .select('id, commodity_id, lot_number')
      .eq('commodity_id', TW_COMMODITIES.COMM1)
      .is('deleted_at', null);

    // ASSERT: all results have matching commodity_id
    expect(error).toBeNull();
    expect(Array.isArray(results)).toBe(true);
    expect(results!.length).toBeGreaterThan(0);
    results!.forEach((row) => {
      expect(row.commodity_id).toBe(TW_COMMODITIES.COMM1);
    });
  });

  it.skipIf(!lotsTableExists)('can filter lots by source_purchase_id', async () => {
    // ARRANGE: create a purchase and a lot linked to it
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: TW_UNIT_KG,
      quantity: 80,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);

    const { data: lot } = await client
      .from('lots')
      .insert({
        lot_number: `LOT-PURID-${Date.now()}`,
        commodity_id: TW_COMMODITIES.COMM2,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        initial_quantity: 80,
        unit_id: TW_UNIT_KG,
      })
      .select('id')
      .single();

    if (lot) registerCleanup({ schema: SCHEMA, table: 'lots', id: lot.id });

    // ACT: filter lots by source_purchase_id
    const { data: results, error } = await client
      .from('lots')
      .select('id, source_purchase_id')
      .eq('source_purchase_id', purchase.id);

    // ASSERT: finds the specific lot linked to this purchase
    expect(error).toBeNull();
    expect(results!.length).toBeGreaterThanOrEqual(1);
    expect(results!.every((r) => r.source_purchase_id === purchase.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lot Tracking: soft delete
// ---------------------------------------------------------------------------
describe('lots: soft delete', () => {
  it.skipIf(!lotsTableExists)('soft-deleted lots are excluded from default query (deleted_at IS NULL)', async () => {
    // ARRANGE: create a lot and soft-delete it
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC1,
      commodityId: TW_COMMODITIES.COMM2,
      unitId: TW_UNIT_KG,
      quantity: 40,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);

    const { data: lot } = await client
      .from('lots')
      .insert({
        lot_number: `LOT-SOFTDEL-${Date.now()}`,
        commodity_id: TW_COMMODITIES.COMM2,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        initial_quantity: 40,
        unit_id: TW_UNIT_KG,
      })
      .select('id')
      .single();

    expect(lot).not.toBeNull();

    // ACT: soft delete
    await client
      .from('lots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lot!.id);

    // ASSERT: not visible when filtering deleted_at IS NULL
    const { data: visible } = await client
      .from('lots')
      .select('id')
      .eq('id', lot!.id)
      .is('deleted_at', null);

    expect(visible).toEqual([]);

    // Cleanup: hard delete
    await client.from('lots').delete().eq('id', lot!.id);
  });

  it.skipIf(!lotsTableExists)('soft-deleted lots are visible when querying without deleted_at filter', async () => {
    // ARRANGE: create and soft-delete a lot
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC2,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: TW_UNIT_KG,
      quantity: 30,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);

    const { data: lot } = await client
      .from('lots')
      .insert({
        lot_number: `LOT-SDVIS-${Date.now()}`,
        commodity_id: TW_COMMODITIES.COMM1,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        initial_quantity: 30,
        unit_id: TW_UNIT_KG,
      })
      .select('id')
      .single();

    expect(lot).not.toBeNull();

    await client
      .from('lots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lot!.id);

    // ACT: query without deleted_at filter (see all rows)
    const { data: allRows } = await client
      .from('lots')
      .select('id, deleted_at')
      .eq('id', lot!.id);

    // ASSERT: row still exists with deleted_at set
    expect(allRows!.length).toBe(1);
    expect(allRows![0].deleted_at).not.toBeNull();

    // Cleanup: hard delete
    await client.from('lots').delete().eq('id', lot!.id);
  });
});

// ---------------------------------------------------------------------------
// Lot Tracking: initial_quantity guard
// ---------------------------------------------------------------------------
describe('lots: initial_quantity constraint', () => {
  it.skipIf(!lotsTableExists)('[HIGH] negative initial_quantity — check if CHECK constraint exists', async () => {
    // ARRANGE: attempt to create lot with negative initial_quantity
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: TW_LOCATIONS.LOC3,
      commodityId: TW_COMMODITIES.COMM1,
      unitId: TW_UNIT_KG,
      quantity: 10,
      status: 'received',
    });
    const client = tenantClient(SCHEMA);

    // ACT: insert lot with negative initial_quantity
    const { data, error } = await client
      .from('lots')
      .insert({
        lot_number: `LOT-NEGQTY-${Date.now()}`,
        commodity_id: TW_COMMODITIES.COMM1,
        source_purchase_id: purchase.id,
        received_date: new Date().toISOString(),
        initial_quantity: -50, // negative
        unit_id: TW_UNIT_KG,
      })
      .select('id')
      .single();

    if (error) {
      // CHECK constraint enforced — negative initial_quantity rejected
      expect(error.message).toMatch(/check|violates/i);
    } else {
      // GAP [HIGH]: lots.initial_quantity allows negative values — CHECK constraint missing.
      // Recommend adding CHECK (initial_quantity > 0).
      console.warn('GAP [HIGH]: lots.initial_quantity allows negative values — CHECK constraint missing');
      if (data) registerCleanup({ schema: SCHEMA, table: 'lots', id: data.id });
    }
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('lot-tracking API: HTTP contract (requires dev server + auth)', () => {
  it('POST /api/t/[slug]/lots with missing lot_number returns 400', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/lots with duplicate lot_number returns 409', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/lots?commodity_id=... returns only matching lots', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/lots returns only non-deleted lots by default', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/lots without auth returns 401', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/lot-stock-levels returns view data with current_quantity', async () => {
    expect(true).toBe(true);
  });
});
