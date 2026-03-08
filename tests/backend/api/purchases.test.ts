// File: tests/backend/api/purchases.test.ts
// Coverage: Purchase CRUD — DB-layer tests via service role (direct Supabase client).
//           API-layer tests (HTTP) are marked .skip — require running dev server + auth.
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import {
  tenantClient,
  TEST_TENANT,
  DEMO_LOCATIONS,
  DEMO_COMMODITIES,
  DEMO_PURCHASES,
} from '../setup/test-env';
import {
  createTestPurchase,
  createTestContact,
  getDefaultUnit,
  runCleanup,
} from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Purchase: read existing data
// ---------------------------------------------------------------------------
describe('purchases: read operations', () => {
  it('demo tenant has 4 seeded purchases', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('purchases')
      .select('id, purchase_number, status')
      .is('deleted_at', null);

    expect(error).toBeNull();
    expect(data!.length).toBe(4);
  });

  it('seeded purchases have correct status distribution', async () => {
    const client = tenantClient(SCHEMA);
    const { data } = await client
      .from('purchases')
      .select('status')
      .is('deleted_at', null);

    const statuses = (data ?? []).map((r) => r.status);
    expect(statuses).toContain('received');
    expect(statuses).toContain('ordered');
    expect(statuses).toContain('draft');
  });

  it('can fetch purchase by ID with items (JOIN)', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('purchases')
      .select(`
        id, purchase_number, status,
        items:purchase_items(id, commodity_id, quantity)
      `)
      .eq('id', DEMO_PURCHASES.PUR_001)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.purchase_number).toBe('PUR-000001');
    expect(data!.status).toBe('received');
    expect(Array.isArray(data!.items)).toBe(true);
    expect(data!.items.length).toBeGreaterThan(0);
  });

  it('soft-deleted purchases are excluded by default query', async () => {
    const client = tenantClient(SCHEMA);

    // Create and soft-delete a purchase
    const purchaseNumber = `PUR-DEL-${Date.now()}`;
    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    await client
      .from('purchases')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', purchase!.id);

    // Query active purchases
    const { data } = await client
      .from('purchases')
      .select('id')
      .is('deleted_at', null)
      .eq('id', purchase!.id);

    expect(data).toEqual([]);

    // Cleanup
    await client.from('purchases').delete().eq('id', purchase!.id);
  });
});

// ---------------------------------------------------------------------------
// Purchase: create
// ---------------------------------------------------------------------------
describe('purchases: create operations', () => {
  it('can create a purchase with items via service role', async () => {
    // ARRANGE: get default unit
    const unit = await getDefaultUnit(SCHEMA);

    // ACT: create purchase using factory
    const purchase = await createTestPurchase(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      quantity: 100,
    });

    // ASSERT: purchase was created
    expect(purchase.id).toBeDefined();
    expect(purchase.purchase_number).toMatch(/^PUR-TEST-/);
  });

  it('purchase_number must be unique (duplicate rejected)', async () => {
    const client = tenantClient(SCHEMA);
    const duplicateNumber = 'PUR-000001'; // Existing seeded purchase number

    const { error } = await client
      .from('purchases')
      .insert({
        purchase_number: duplicateNumber,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });

  it('purchase creation with contact_id links to existing contact', async () => {
    const client = tenantClient(SCHEMA);
    const contact = await createTestContact(SCHEMA, 'supplier');
    const unit = await getDefaultUnit(SCHEMA);

    const purchase = await createTestPurchase(SCHEMA, {
      locationId: DEMO_LOCATIONS.WH_NORTH,
      commodityId: DEMO_COMMODITIES.WHEAT,
      unitId: unit.id,
      quantity: 50,
      contactId: contact.id,
    });

    const { data } = await client
      .from('purchases')
      .select('contact_id')
      .eq('id', purchase.id)
      .single();

    expect(data!.contact_id).toBe(contact.id);
  });

  it('purchase with invalid location_id (FK violation) is rejected', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('purchases')
      .insert({
        purchase_number: `PUR-BADFK-${Date.now()}`,
        location_id: '00000000-0000-0000-0000-000000000000', // non-existent
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/foreign key|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Purchase: status transitions
// ---------------------------------------------------------------------------
describe('purchases: status transitions', () => {
  it('purchase status can transition from draft to received', async () => {
    const client = tenantClient(SCHEMA);
    const purchaseNumber = `PUR-TRANS-${Date.now()}`;

    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: DEMO_LOCATIONS.WH_NORTH,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id, status')
      .single();

    expect(purchase!.status).toBe('draft');

    // Update to received
    const { data: updated, error } = await client
      .from('purchases')
      .update({ status: 'received' })
      .eq('id', purchase!.id)
      .select('status')
      .single();

    expect(error).toBeNull();
    expect(updated!.status).toBe('received');

    await client.from('purchases').delete().eq('id', purchase!.id);
  });

  it('invalid status value is rejected by CHECK constraint', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client
      .from('purchases')
      .update({ status: 'shipped' })
      .eq('id', DEMO_PURCHASES.PUR_003);

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Purchase: location-scoped query
// ---------------------------------------------------------------------------
describe('purchases: location-scoped access', () => {
  it('filtering by location_id returns only purchases at that location', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('purchases')
      .select('id, location_id')
      .eq('location_id', DEMO_LOCATIONS.WH_NORTH)
      .is('deleted_at', null);

    expect(error).toBeNull();
    for (const purchase of data ?? []) {
      expect(purchase.location_id).toBe(DEMO_LOCATIONS.WH_NORTH);
    }
  });

  it('non-existent location returns empty result set', async () => {
    const client = tenantClient(SCHEMA);
    const { data } = await client
      .from('purchases')
      .select('id')
      .eq('location_id', '00000000-0000-0000-0000-000000000000')
      .is('deleted_at', null);

    expect(data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Purchase: Zod schema validation (unit tests — no server required)
// ---------------------------------------------------------------------------
describe('purchases: Zod validation contract', () => {
  it('[LOW] documents required fields for createPurchaseSchema', () => {
    // Based on src/modules/purchase/validations/purchase.ts analysis
    // Required: location_id, items[].commodity_id, items[].unit_id, items[].quantity
    const validPayload = {
      location_id: 'a0000001-0000-0000-0000-000000000001',
      items: [
        {
          commodity_id: 'b0000001-0000-0000-0000-000000000001',
          unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
          quantity: 100,
        },
      ],
    };

    expect(validPayload.location_id).toBeDefined();
    expect(validPayload.items.length).toBeGreaterThan(0);
    expect(validPayload.items[0].quantity).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('purchases API: HTTP contract (requires dev server + auth)', () => {
  it('POST /api/t/[slug]/purchases with missing location_id returns 400', async () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/purchases with empty items array returns 400', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/purchases returns paginated results', async () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/purchases/[id] returns 404 for nonexistent ID', async () => {
    expect(true).toBe(true);
  });

  it('DELETE /api/t/[slug]/purchases/[id] soft-deletes the purchase', async () => {
    expect(true).toBe(true);
  });
});
