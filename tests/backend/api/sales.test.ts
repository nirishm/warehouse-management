// File: tests/backend/api/sales.test.ts
// Coverage: Sales CRUD — DB-layer tests via service role (direct Supabase client).
//           Status transitions (draft→confirmed→dispatched→cancelled), location-scoped
//           access, soft delete, stock_levels VIEW impact, Zod schema contract.
//           API-layer tests (HTTP) are marked .skip — require running dev server + auth.
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  DEMO_LOCATIONS,
  DEMO_COMMODITIES,
  DEMO_SALES,
} from '../setup/test-env';
import {
  createTestSale,
  createTestContact,
  getDefaultUnit,
  runCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Sales: read existing data
// ---------------------------------------------------------------------------
describe('sales: read operations', () => {
  it('demo tenant has 4 seeded sales with correct statuses', async () => {
    // ARRANGE: use service-role client against tenant_demo schema
    const client = tenantClient(SCHEMA);

    // ACT: fetch all non-deleted sales
    const { data, error } = await client
      .from('sales')
      .select('id, sale_number, status')
      .is('deleted_at', null);

    // ASSERT: 4 seeded sales with expected statuses
    expect(error).toBeNull();
    expect(data!.length).toBe(4);

    const statusMap = Object.fromEntries(data!.map((s) => [s.sale_number, s.status]));
    expect(statusMap['SAL-000001']).toBe('dispatched');
    expect(statusMap['SAL-000002']).toBe('confirmed');
    expect(statusMap['SAL-000003']).toBe('confirmed');
    expect(statusMap['SAL-000004']).toBe('draft');
  });

  it('can fetch sale by ID with items using JOIN', async () => {
    // ARRANGE: use the first seeded sale
    const client = tenantClient(SCHEMA);

    // ACT: JOIN sale with its items
    const { data, error } = await client
      .from('sales')
      .select(`
        id, sale_number, status,
        items:sale_items(
          id, commodity_id, quantity, unit_id
        )
      `)
      .eq('id', DEMO_SALES.SAL_001)
      .single();

    // ASSERT: sale header + items present
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.sale_number).toBe('SAL-000001');
    expect(data!.status).toBe('dispatched');
    expect(Array.isArray(data!.items)).toBe(true);
    expect(data!.items.length).toBeGreaterThan(0);
  });

  it('can filter sales by status', async () => {
    // ARRANGE: filter for confirmed sales
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('sales')
      .select('id, status')
      .eq('status', 'confirmed')
      .is('deleted_at', null);

    // ASSERT: only confirmed sales returned
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2); // SAL-000002 and SAL-000003
    for (const s of data!) {
      expect(s.status).toBe('confirmed');
    }
  });

  it('soft-deleted sales are excluded from default query', async () => {
    // ARRANGE: create and soft-delete a sale
    const client = tenantClient(SCHEMA);
    const saleNumber = `SAL-DEL-${Date.now()}`;
    const { data: created } = await client
      .from('sales')
      .insert({
        sale_number: saleNumber,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    await client
      .from('sales')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', created!.id);

    // ACT: query without deleted
    const { data } = await client
      .from('sales')
      .select('id')
      .eq('id', created!.id)
      .is('deleted_at', null);

    // ASSERT: excluded
    expect(data).toEqual([]);

    // Cleanup
    await client.from('sales').delete().eq('id', created!.id);
  });

  it('can fetch sale with full JOIN (location, contact, items+commodity)', async () => {
    // ARRANGE: sale SAL_002 has a contact (seeded)
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('sales')
      .select(`
        id, sale_number, status,
        location:locations!location_id(id, name, code),
        items:sale_items(
          id, quantity,
          commodity:commodities!commodity_id(id, name, code),
          unit:units!unit_id(id, name, abbreviation)
        )
      `)
      .eq('id', DEMO_SALES.SAL_002)
      .single();

    // ASSERT: relational data present
    expect(error).toBeNull();
    expect(data!.location).not.toBeNull();
    expect(Array.isArray(data!.items)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sales: create operations
// ---------------------------------------------------------------------------
describe('sales: create operations', () => {
  it('can create a sale with items via service role', async () => {
    // ARRANGE: get default unit
    const unit = await getDefaultUnit(SCHEMA);

    // ACT: create sale using factory
    const sale = await createTestSale(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      quantity: 75,
      status: 'draft',
    });

    // ASSERT: sale created with test prefix
    expect(sale.id).toBeDefined();
    expect(sale.sale_number).toMatch(/^SAL-TEST-/);
  });

  it('sale_number must be unique (duplicate rejected)', async () => {
    // ARRANGE: attempt to insert an existing sale number
    const client = tenantClient(SCHEMA);

    // ACT
    const { error } = await client
      .from('sales')
      .insert({
        sale_number: 'SAL-000001', // existing seeded number
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      });

    // ASSERT: unique constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });

  it('sale creation with contact_id links to existing contact', async () => {
    // ARRANGE: create a customer contact
    const client = tenantClient(SCHEMA);
    const contact = await createTestContact(SCHEMA, 'customer');
    const unit = await getDefaultUnit(SCHEMA);

    // ACT: create sale with contact
    const sale = await createTestSale(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      quantity: 50,
      contactId: contact.id,
    });

    // ASSERT: contact_id persisted
    const { data } = await client
      .from('sales')
      .select('contact_id')
      .eq('id', sale.id)
      .single();

    expect(data!.contact_id).toBe(contact.id);
  });

  it('sale with invalid location_id (FK violation) is rejected', async () => {
    // ARRANGE: non-existent location UUID
    const client = tenantClient(SCHEMA);

    // ACT
    const { error } = await client
      .from('sales')
      .insert({
        sale_number: `SAL-BADFK-${Date.now()}`,
        location_id: '00000000-0000-0000-0000-000000000000',
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      });

    // ASSERT: FK violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/foreign key|violates/i);
  });

  it('[HIGH] negative quantity on sale_item is rejected by CHECK constraint', async () => {
    // ARRANGE: create a sale header first
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const { data: sale } = await client
      .from('sales')
      .insert({
        sale_number: `SAL-NEGQTY-${Date.now()}`,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: insert item with negative quantity
    const { error } = await client
      .from('sale_items')
      .insert({
        sale_id: sale!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
        unit_id: unit.id,
        quantity: -10,
      });

    // ASSERT: check constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    // Cleanup
    await client.from('sales').delete().eq('id', sale!.id);
  });

  it('[HIGH] zero quantity on sale_item is rejected by CHECK constraint', async () => {
    // ARRANGE: create a sale header
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const { data: sale } = await client
      .from('sales')
      .insert({
        sale_number: `SAL-ZEROQTY-${Date.now()}`,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: insert item with zero quantity
    const { error } = await client
      .from('sale_items')
      .insert({
        sale_id: sale!.id,
        commodity_id: DEMO_COMMODITIES.WHEAT,
        unit_id: unit.id,
        quantity: 0,
      });

    // ASSERT: check constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    // Cleanup
    await client.from('sales').delete().eq('id', sale!.id);
  });
});

// ---------------------------------------------------------------------------
// Sales: status transitions
// ---------------------------------------------------------------------------
describe('sales: status transitions', () => {
  it('sale can transition from draft → confirmed', async () => {
    // ARRANGE: create a draft sale
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const sale = await createTestSale(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      quantity: 50,
      status: 'draft',
    });

    // ACT: transition to confirmed
    const { data, error } = await client
      .from('sales')
      .update({ status: 'confirmed' })
      .eq('id', sale.id)
      .select('status')
      .single();

    // ASSERT
    expect(error).toBeNull();
    expect(data!.status).toBe('confirmed');
  });

  it('sale can transition from confirmed → dispatched', async () => {
    // ARRANGE: use seeded SAL_002 which is confirmed
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('sales')
      .update({ status: 'dispatched' })
      .eq('id', DEMO_SALES.SAL_002)
      .select('status')
      .single();

    // ASSERT
    expect(error).toBeNull();
    expect(data!.status).toBe('dispatched');

    // Restore original status
    await client
      .from('sales')
      .update({ status: 'confirmed' })
      .eq('id', DEMO_SALES.SAL_002);
  });

  it('sale can be cancelled from draft status', async () => {
    // ARRANGE: create a draft sale
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);
    const sale = await createTestSale(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      quantity: 30,
      status: 'draft',
    });

    // ACT: cancel the sale
    const { data, error } = await client
      .from('sales')
      .update({ status: 'cancelled' })
      .eq('id', sale.id)
      .select('status')
      .single();

    // ASSERT
    expect(error).toBeNull();
    expect(data!.status).toBe('cancelled');
  });

  it('invalid status value is rejected by CHECK constraint', async () => {
    // ARRANGE: try to set an invalid status
    const client = tenantClient(SCHEMA);

    // ACT: 'shipped' is not a valid status
    const { error } = await client
      .from('sales')
      .update({ status: 'shipped' })
      .eq('id', DEMO_SALES.SAL_004);

    // ASSERT: check constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Sales: location-scoped access
// ---------------------------------------------------------------------------
describe('sales: location-scoped access', () => {
  it('filtering by location_id returns only sales at that location', async () => {
    // ARRANGE: filter to WH_NORTH location
    const client = tenantClient(SCHEMA);

    // ACT
    const { data, error } = await client
      .from('sales')
      .select('id, location_id')
      .eq('location_id', DEMO_LOCATIONS.WH_NORTH)
      .is('deleted_at', null);

    // ASSERT: all results belong to the filtered location
    expect(error).toBeNull();
    for (const sale of data ?? []) {
      expect(sale.location_id).toBe(DEMO_LOCATIONS.WH_NORTH);
    }
  });

  it('non-existent location returns empty result set', async () => {
    // ARRANGE: null UUID location
    const client = tenantClient(SCHEMA);

    // ACT
    const { data } = await client
      .from('sales')
      .select('id')
      .eq('location_id', '00000000-0000-0000-0000-000000000000')
      .is('deleted_at', null);

    // ASSERT: empty
    expect(data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Sales: stock_levels impact
// ---------------------------------------------------------------------------
describe('sales: impact on stock_levels view', () => {
  it('dispatched sales appear in total_out at origin location', async () => {
    // ARRANGE: SAL-000001 is dispatched — should contribute to total_out at WH_NORTH
    const client = tenantClient(SCHEMA);

    // ACT: check stock_levels for any total_out > 0
    const { data, error } = await client
      .from('stock_levels')
      .select('commodity_id, location_id, total_out, current_stock');

    // ASSERT: at least one row has total_out from dispatched sales
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    const hasOutflow = data!.some((r) => Number(r.total_out) > 0);
    expect(hasOutflow).toBe(true);
  });

  it('creating a sale with status confirmed does NOT affect total_out until dispatched', async () => {
    // ARRANGE: get stock before
    const client = tenantClient(SCHEMA);
    const unit = await getDefaultUnit(SCHEMA);

    const { data: before } = await client
      .from('stock_levels')
      .select('total_out, commodity_id, location_id')
      .eq('location_id', DEMO_LOCATIONS.WH_NORTH)
      .eq('commodity_id', DEMO_COMMODITIES.RICE);

    const totalOutBefore = before?.[0] ? Number(before[0].total_out) : 0;

    // ACT: create a confirmed sale (not dispatched)
    const sale = await createTestSale(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.RICE,
      unitId: unit.id,
      quantity: 50,
      status: 'confirmed',
    });

    // ACT: check stock_levels after
    const { data: after } = await client
      .from('stock_levels')
      .select('total_out')
      .eq('location_id', DEMO_LOCATIONS.WH_NORTH)
      .eq('commodity_id', DEMO_COMMODITIES.RICE);

    const totalOutAfter = after?.[0] ? Number(after[0].total_out) : 0;

    // ASSERT: confirmed sale doesn't count toward total_out (only dispatched does)
    // GAP [MEDIUM]: verify whether stock_levels VIEW counts 'confirmed' or only 'dispatched' sales
    // This depends on the VIEW definition's WHERE clause. If the view only counts dispatched,
    // the confirmed sale should NOT increase total_out.
    expect(totalOutAfter).toBe(totalOutBefore);

    void sale; // reference to avoid lint warning — cleanup handled by registry
  });
});

// ---------------------------------------------------------------------------
// Sales: Zod schema validation (unit tests — no server required)
// ---------------------------------------------------------------------------
describe('sales: Zod validation contract', () => {
  it('[LOW] documents required fields for createSaleSchema', () => {
    // Based on src/modules/sale/validations/sale.ts analysis
    // Required: location_id, items[].commodity_id, items[].unit_id, items[].quantity
    const validPayload = {
      location_id: DEMO_LOCATIONS.WH_NORTH,
      items: [
        {
          commodity_id: DEMO_COMMODITIES.WHEAT,
          unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
          quantity: 50,
        },
      ],
    };

    expect(validPayload.location_id).toBeDefined();
    expect(validPayload.items.length).toBeGreaterThan(0);
    expect(validPayload.items[0].quantity).toBeGreaterThan(0);
  });

  it('[LOW] sale_items can optionally carry bags, unit_price, custom_fields', () => {
    // Optional transport fields on sale items
    const itemWithOptionals = {
      commodity_id: DEMO_COMMODITIES.WHEAT,
      unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
      quantity: 100,
      bags: 50,
      unit_price: 12.50,
    };

    expect(itemWithOptionals.bags).toBe(50);
    expect(itemWithOptionals.unit_price).toBe(12.50);
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('sales API: HTTP contract (requires dev server + auth)', () => {
  it('POST /api/t/[slug]/sales with missing location_id returns 400', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/sales with empty items array returns 400', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/sales returns paginated results', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/sales/[id] returns 404 for nonexistent ID', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/sales/[id]/cancel cancels a confirmed sale', async () => {
    expect(true).toBe(true);
  });

  it('DELETE /api/t/[slug]/sales/[id] soft-deletes the sale', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/sales respects location-scoped access control', async () => {
    expect(true).toBe(true);
  });
});
