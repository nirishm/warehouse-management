// File: tests/backend/business-logic/soft-deletes.test.ts
// Coverage: Soft delete behavior — deleted_at column, filtered queries, unique constraint reuse,
//           FK cascade vs restrict behavior, query filter correctness
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import { tenantClient, TEST_TENANT, TW_LOCATIONS, TW_COMMODITIES, TW_UNIT_KG } from '../setup/test-env';
import { runCleanup, createTestLocation, createTestCommodity } from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Soft delete: records are excluded when querying with deleted_at IS NULL filter
// ---------------------------------------------------------------------------
describe('soft deletes: filtering behavior', () => {
  it('soft-deleted location is excluded from active query', async () => {
    // ARRANGE: create a location, then soft-delete it
    const client = tenantClient(SCHEMA);
    const loc = await createTestLocation(SCHEMA, { name: 'Temp Location', code: `TMP-${Date.now()}` });

    // ACT: soft delete by setting deleted_at
    const { error: updateErr } = await client
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', loc.id);

    expect(updateErr).toBeNull();

    // ASSERT: query with deleted_at IS NULL does NOT return the soft-deleted record
    const { data } = await client
      .from('locations')
      .select('id')
      .is('deleted_at', null)
      .eq('id', loc.id);

    expect(data).toEqual([]);
  });

  it('soft-deleted location IS returned when querying without deleted_at filter', async () => {
    // ARRANGE: create and soft-delete a location
    const client = tenantClient(SCHEMA);
    const loc = await createTestLocation(SCHEMA, { name: 'Soft Del Test', code: `SDT-${Date.now()}` });

    await client
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', loc.id);

    // ACT: query WITHOUT deleted_at filter
    const { data } = await client
      .from('locations')
      .select('id, deleted_at')
      .eq('id', loc.id);

    // ASSERT: record is still in table but has deleted_at set
    expect(data).not.toBeNull();
    expect(data!.length).toBe(1);
    expect(data![0].deleted_at).not.toBeNull();
  });

  it('soft-deleted commodity is excluded from active query', async () => {
    const client = tenantClient(SCHEMA);
    const commodity = await createTestCommodity(SCHEMA, { name: 'Temp Grain', code: `TGR-${Date.now()}` });

    await client
      .from('commodities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commodity.id);

    const { data } = await client
      .from('commodities')
      .select('id')
      .is('deleted_at', null)
      .eq('id', commodity.id);

    expect(data).toEqual([]);
  });

  it('soft-deleted purchase is excluded from active query', async () => {
    // ARRANGE: use an existing purchase from seed data and soft-delete a copy
    const client = tenantClient(SCHEMA);

    // Create a purchase directly with a unique number
    const purchaseNumber = `PUR-SOFT-${Date.now()}`;
    const { data: purchase, error: createErr } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: TW_LOCATIONS.LOC1,
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    expect(createErr).toBeNull();

    // ACT: soft delete
    await client
      .from('purchases')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', purchase!.id);

    // ASSERT: excluded from active query
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
// Soft delete: unique constraint reuse after soft delete
// ---------------------------------------------------------------------------
describe('soft deletes: unique constraint reuse', () => {
  it('location code can be reused after soft delete (partial unique WHERE deleted_at IS NULL)', async () => {
    // ARRANGE: create a location with a unique code, soft-delete it
    const client = tenantClient(SCHEMA);
    const uniqueCode = `REUSE-${Date.now()}`;

    const { data: loc1 } = await client
      .from('locations')
      .insert({ name: 'First Location', code: uniqueCode, type: 'warehouse' })
      .select('id')
      .single();

    // Soft-delete the first
    await client
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', loc1!.id);

    // ACT: create a second location with the same code (should succeed due to partial UNIQUE)
    const { data: loc2, error: createErr } = await client
      .from('locations')
      .insert({ name: 'Second Location', code: uniqueCode, type: 'warehouse' })
      .select('id')
      .single();

    // ASSERT: second insert succeeds because first is soft-deleted
    expect(createErr).toBeNull();
    expect(loc2).not.toBeNull();

    // Cleanup both
    await client.from('locations').delete().eq('id', loc1!.id);
    await client.from('locations').delete().eq('id', loc2!.id);
  });

  it('duplicate location code rejected when active record exists (partial unique still enforced)', async () => {
    // ARRANGE: fetch an active location code from this tenant dynamically
    const client = tenantClient(SCHEMA);
    const { data: existing } = await client
      .from('locations')
      .select('code')
      .is('deleted_at', null)
      .limit(1)
      .single();

    expect(existing).not.toBeNull();
    const existingCode = existing!.code;

    // ACT: try to create duplicate
    const { error } = await client
      .from('locations')
      .insert({ name: 'Duplicate Location', code: existingCode, type: 'warehouse' });

    // ASSERT: unique constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });

  it('commodity code can be reused after soft delete', async () => {
    const client = tenantClient(SCHEMA);
    const uniqueCode = `GCMD-${Date.now()}`;

    const { data: comm1 } = await client
      .from('commodities')
      .insert({ name: 'First Grain', code: uniqueCode })
      .select('id')
      .single();

    await client
      .from('commodities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', comm1!.id);

    const { data: comm2, error } = await client
      .from('commodities')
      .insert({ name: 'Second Grain', code: uniqueCode })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(comm2).not.toBeNull();

    // Cleanup
    await client.from('commodities').delete().eq('id', comm1!.id);
    await client.from('commodities').delete().eq('id', comm2!.id);
  });
});

// ---------------------------------------------------------------------------
// FK cascade: dispatch_items cascade delete when dispatch is deleted
// ---------------------------------------------------------------------------
describe('FK cascade: dispatch_items delete when dispatch deleted', () => {
  it('hard-deleting a dispatch cascades to dispatch_items (ON DELETE CASCADE)', async () => {
    // ARRANGE: create a dispatch with items
    const client = tenantClient(SCHEMA);
    const dispatchNumber = `DSP-CASCADE-${Date.now()}`;

    const { data: dispatch } = await client
      .from('dispatches')
      .insert({
        dispatch_number: dispatchNumber,
        origin_location_id: TW_LOCATIONS.LOC1,
        dest_location_id: TW_LOCATIONS.LOC3,
        status: 'draft',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    expect(dispatch).not.toBeNull();

    // Add a dispatch item
    const { data: item } = await client
      .from('dispatch_items')
      .insert({
        dispatch_id: dispatch!.id,
        commodity_id: TW_COMMODITIES.COMM1,
        unit_id: TW_UNIT_KG,
        sent_quantity: 10,
      })
      .select('id')
      .single();

    expect(item).not.toBeNull();

    // ACT: hard-delete the dispatch
    await client.from('dispatches').delete().eq('id', dispatch!.id);

    // ASSERT: dispatch_items are also deleted (ON DELETE CASCADE)
    const { data: items } = await client
      .from('dispatch_items')
      .select('id')
      .eq('dispatch_id', dispatch!.id);

    expect(items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FK cascade: purchase_items cascade delete when purchase is deleted
// ---------------------------------------------------------------------------
describe('FK cascade: purchase_items delete when purchase deleted', () => {
  it('hard-deleting a purchase cascades to purchase_items (ON DELETE CASCADE)', async () => {
    const client = tenantClient(SCHEMA);
    const purchaseNumber = `PUR-CASCADE-${Date.now()}`;

    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: TW_LOCATIONS.LOC1,
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    expect(purchase).not.toBeNull();

    const { data: item } = await client
      .from('purchase_items')
      .insert({
        purchase_id: purchase!.id,
        commodity_id: TW_COMMODITIES.COMM1,
        unit_id: TW_UNIT_KG,
        quantity: 100,
      })
      .select('id')
      .single();

    expect(item).not.toBeNull();

    await client.from('purchases').delete().eq('id', purchase!.id);

    const { data: items } = await client
      .from('purchase_items')
      .select('id')
      .eq('purchase_id', purchase!.id);

    expect(items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Soft delete does NOT cascade — items remain
// ---------------------------------------------------------------------------
describe('soft delete: does NOT cascade to line items', () => {
  it('soft-deleting a purchase does not delete purchase_items', async () => {
    const client = tenantClient(SCHEMA);
    const purchaseNumber = `PUR-SOFT-CASCADE-${Date.now()}`;

    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: TW_LOCATIONS.LOC1,
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    await client.from('purchase_items').insert({
      purchase_id: purchase!.id,
      commodity_id: TW_COMMODITIES.COMM1,
      unit_id: TW_UNIT_KG,
      quantity: 50,
    });

    // ACT: soft delete the purchase
    await client
      .from('purchases')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', purchase!.id);

    // ASSERT: purchase_items still exist
    const { data: items } = await client
      .from('purchase_items')
      .select('id')
      .eq('purchase_id', purchase!.id);

    expect(items!.length).toBeGreaterThan(0);

    // Cleanup: hard delete
    await client.from('purchases').delete().eq('id', purchase!.id);
  });
});

// ---------------------------------------------------------------------------
// Null guard: NOT NULL columns reject null values
// ---------------------------------------------------------------------------
describe('NOT NULL constraints: null guard checks', () => {
  it('location.name NOT NULL constraint rejects null', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('locations').insert({
      name: null,
      code: `NULL-TEST-${Date.now()}`,
      type: 'warehouse',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/null|violates/i);
  });

  it('dispatch.dispatch_number NOT NULL constraint rejects null', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('dispatches').insert({
      dispatch_number: null,
      origin_location_id: TW_LOCATIONS.LOC1,
      dest_location_id: TW_LOCATIONS.LOC3,
      status: 'draft',
      dispatched_by: '00000000-0000-0000-0000-000000000099',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/null|violates/i);
  });

  it('purchase.created_by NOT NULL constraint rejects null', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('purchases').insert({
      purchase_number: `PUR-NULL-${Date.now()}`,
      location_id: TW_LOCATIONS.LOC1,
      status: 'received',
      created_by: null,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/null|violates/i);
  });
});

// ---------------------------------------------------------------------------
// Check constraints: negative quantity rejection
// ---------------------------------------------------------------------------
describe('CHECK constraints: negative quantity rejection', () => {
  it('purchase_items.quantity must be > 0 (negative rejected)', async () => {
    // ARRANGE: create a valid purchase header first
    const client = tenantClient(SCHEMA);
    const purchaseNumber = `PUR-NEG-${Date.now()}`;

    const { data: purchase } = await client
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        location_id: TW_LOCATIONS.LOC1,
        status: 'received',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // ACT: try to insert negative quantity item
    const { error } = await client.from('purchase_items').insert({
      purchase_id: purchase!.id,
      commodity_id: TW_COMMODITIES.COMM1,
      unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
      quantity: -100,
    });

    // ASSERT: check constraint violation
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    // Cleanup
    await client.from('purchases').delete().eq('id', purchase!.id);
  });

  it('sale_items.quantity must be > 0 (zero rejected)', async () => {
    const client = tenantClient(SCHEMA);
    const saleNumber = `SAL-ZERO-${Date.now()}`;

    const { data: sale } = await client
      .from('sales')
      .insert({
        sale_number: saleNumber,
        location_id: TW_LOCATIONS.LOC1,
        status: 'draft',
        created_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    const { error } = await client.from('sale_items').insert({
      sale_id: sale!.id,
      commodity_id: TW_COMMODITIES.COMM1,
      unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
      quantity: 0,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    await client.from('sales').delete().eq('id', sale!.id);
  });

  it('dispatch_items.sent_quantity must be > 0', async () => {
    const client = tenantClient(SCHEMA);
    const dispatchNumber = `DSP-ZERO-${Date.now()}`;

    const { data: dispatch } = await client
      .from('dispatches')
      .insert({
        dispatch_number: dispatchNumber,
        origin_location_id: TW_LOCATIONS.LOC1,
        dest_location_id: TW_LOCATIONS.LOC3,
        status: 'draft',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    const { error } = await client.from('dispatch_items').insert({
      dispatch_id: dispatch!.id,
      commodity_id: TW_COMMODITIES.COMM1,
      unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
      sent_quantity: 0,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);

    await client.from('dispatches').delete().eq('id', dispatch!.id);
  });
});

// ---------------------------------------------------------------------------
// Updated_at trigger behavior
// ---------------------------------------------------------------------------
describe('updated_at trigger behavior', () => {
  it('updating a commodity increments updated_at', async () => {
    const client = tenantClient(SCHEMA);
    const code = `UPD-${Date.now()}`;

    const { data: commodity } = await client
      .from('commodities')
      .insert({ name: 'Trigger Test', code })
      .select('id, updated_at')
      .single();

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 100));

    await client.from('commodities').update({ name: 'Updated Grain' }).eq('id', commodity!.id);

    const { data: updated } = await client
      .from('commodities')
      .select('updated_at')
      .eq('id', commodity!.id)
      .single();

    const before = new Date(commodity!.updated_at).getTime();
    const after = new Date(updated!.updated_at).getTime();
    expect(after).toBeGreaterThan(before);

    await client.from('commodities').delete().eq('id', commodity!.id);
  });
});
