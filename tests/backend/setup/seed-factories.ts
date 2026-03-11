// File: tests/backend/setup/seed-factories.ts
// Purpose: Reusable factories for creating and tearing down test data
// Runner: Vitest (node environment)
// Strategy: Insert with deterministic test UUIDs; hard-delete in afterEach via cleanup registry

import { serviceClient, tenantClient, TEST_TENANT } from './test-env';

// ---------------------------------------------------------------------------
// Cleanup registry — collect IDs inserted during a test, delete them after
// ---------------------------------------------------------------------------
export interface CleanupTask {
  schema: string;
  table: string;
  id: string;
  column?: string; // defaults to 'id'
}

const cleanupRegistry: CleanupTask[] = [];

export function registerCleanup(task: CleanupTask) {
  cleanupRegistry.push(task);
}

export async function runCleanup() {
  // Run in reverse insertion order to respect FK constraints
  const tasks = [...cleanupRegistry].reverse();
  cleanupRegistry.length = 0;

  for (const task of tasks) {
    const col = task.column ?? 'id';
    const client = tenantClient(task.schema);
    await client.from(task.table).delete().eq(col, task.id);
  }
}

// ---------------------------------------------------------------------------
// Tenant factory — finds the demo tenant, validates it exists
// ---------------------------------------------------------------------------
export async function getTestTenant() {
  const { data, error } = await serviceClient
    .from('tenants')
    .select('id, name, slug, schema_name, status, plan, enabled_modules')
    .eq('slug', 'test-warehouse')
    .single();

  if (error || !data) {
    throw new Error(
      `Test tenant 'test-warehouse' not found. Ensure the test-warehouse tenant is provisioned before running tests. Error: ${error?.message}`
    );
  }
  return data;
}

// ---------------------------------------------------------------------------
// Location factory
// ---------------------------------------------------------------------------
export interface LocationInput {
  name: string;
  code: string;
  type?: 'warehouse' | 'store' | 'yard' | 'external';
}

export async function createTestLocation(
  schemaName: string,
  input: LocationInput
): Promise<{ id: string; code: string }> {
  const client = tenantClient(schemaName);
  const { data, error } = await client
    .from('locations')
    .insert({
      name: input.name,
      code: input.code,
      type: input.type ?? 'warehouse',
      is_active: true,
    })
    .select('id, code')
    .single();

  if (error) throw new Error(`createTestLocation failed: ${error.message}`);
  registerCleanup({ schema: schemaName, table: 'locations', id: data.id });
  return data;
}

// ---------------------------------------------------------------------------
// Commodity factory
// ---------------------------------------------------------------------------
export interface CommodityInput {
  name: string;
  code: string;
}

export async function createTestCommodity(
  schemaName: string,
  input: CommodityInput
): Promise<{ id: string; code: string }> {
  const client = tenantClient(schemaName);
  const { data, error } = await client
    .from('commodities')
    .insert({ name: input.name, code: input.code, is_active: true })
    .select('id, code')
    .single();

  if (error) throw new Error(`createTestCommodity failed: ${error.message}`);
  registerCleanup({ schema: schemaName, table: 'commodities', id: data.id });
  return data;
}

// ---------------------------------------------------------------------------
// Unit helper — fetch the default kg unit (always present from seed)
// ---------------------------------------------------------------------------
export async function getDefaultUnit(schemaName: string): Promise<{ id: string }> {
  const client = tenantClient(schemaName);
  const { data, error } = await client
    .from('units')
    .select('id')
    .eq('is_default', true)
    .single();

  if (error || !data) throw new Error(`getDefaultUnit failed: ${error?.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Contact (supplier/customer) factory
// ---------------------------------------------------------------------------
export async function createTestContact(
  schemaName: string,
  type: 'supplier' | 'customer' | 'both' = 'supplier'
): Promise<{ id: string }> {
  const client = tenantClient(schemaName);
  const { data, error } = await client
    .from('contacts')
    .insert({ name: `Test Contact ${Date.now()}`, type, is_active: true })
    .select('id')
    .single();

  if (error) throw new Error(`createTestContact failed: ${error.message}`);
  registerCleanup({ schema: schemaName, table: 'contacts', id: data.id });
  return data;
}

// ---------------------------------------------------------------------------
// Purchase factory
// ---------------------------------------------------------------------------
export interface PurchaseInput {
  locationId: string;
  commodityId: string;
  unitId: string;
  quantity: number;
  contactId?: string;
  status?: 'draft' | 'ordered' | 'received' | 'cancelled';
}

export async function createTestPurchase(
  schemaName: string,
  input: PurchaseInput,
  userId = '00000000-0000-0000-0000-000000000099'
): Promise<{ id: string; purchase_number: string }> {
  const client = tenantClient(schemaName);
  const purchaseNumber = `PUR-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: purchase, error: pErr } = await client
    .from('purchases')
    .insert({
      purchase_number: purchaseNumber,
      location_id: input.locationId,
      contact_id: input.contactId ?? null,
      status: input.status ?? 'received',
      created_by: userId,
    })
    .select('id, purchase_number')
    .single();

  if (pErr) throw new Error(`createTestPurchase header failed: ${pErr.message}`);

  const { error: itemErr } = await client.from('purchase_items').insert({
    purchase_id: purchase.id,
    commodity_id: input.commodityId,
    unit_id: input.unitId,
    quantity: input.quantity,
  });

  if (itemErr) {
    // Clean up the header if items failed
    await client.from('purchases').delete().eq('id', purchase.id);
    throw new Error(`createTestPurchase items failed: ${itemErr.message}`);
  }

  registerCleanup({ schema: schemaName, table: 'purchases', id: purchase.id });
  return purchase;
}

// ---------------------------------------------------------------------------
// Dispatch factory
// ---------------------------------------------------------------------------
export interface DispatchInput {
  originLocationId: string;
  destLocationId: string;
  commodityId: string;
  unitId: string;
  sentQuantity: number;
  status?: 'draft' | 'dispatched' | 'in_transit' | 'received' | 'cancelled';
}

export async function createTestDispatch(
  schemaName: string,
  input: DispatchInput,
  userId = '00000000-0000-0000-0000-000000000099'
): Promise<{ id: string; dispatch_number: string }> {
  const client = tenantClient(schemaName);
  const dispatchNumber = `DSP-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: dispatch, error: dErr } = await client
    .from('dispatches')
    .insert({
      dispatch_number: dispatchNumber,
      origin_location_id: input.originLocationId,
      dest_location_id: input.destLocationId,
      status: input.status ?? 'dispatched',
      dispatched_by: userId,
    })
    .select('id, dispatch_number')
    .single();

  if (dErr) throw new Error(`createTestDispatch header failed: ${dErr.message}`);

  const { error: itemErr } = await client.from('dispatch_items').insert({
    dispatch_id: dispatch.id,
    commodity_id: input.commodityId,
    unit_id: input.unitId,
    sent_quantity: input.sentQuantity,
  });

  if (itemErr) {
    await client.from('dispatches').delete().eq('id', dispatch.id);
    throw new Error(`createTestDispatch items failed: ${itemErr.message}`);
  }

  registerCleanup({ schema: schemaName, table: 'dispatches', id: dispatch.id });
  return dispatch;
}

// ---------------------------------------------------------------------------
// Sale factory
// ---------------------------------------------------------------------------
export interface SaleInput {
  locationId: string;
  commodityId: string;
  unitId: string;
  quantity: number;
  contactId?: string;
  status?: 'draft' | 'confirmed' | 'dispatched' | 'cancelled';
}

export async function createTestSale(
  schemaName: string,
  input: SaleInput,
  userId = '00000000-0000-0000-0000-000000000099'
): Promise<{ id: string; sale_number: string }> {
  const client = tenantClient(schemaName);
  const saleNumber = `SAL-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: sale, error: sErr } = await client
    .from('sales')
    .insert({
      sale_number: saleNumber,
      location_id: input.locationId,
      contact_id: input.contactId ?? null,
      status: input.status ?? 'confirmed',
      created_by: userId,
    })
    .select('id, sale_number')
    .single();

  if (sErr) throw new Error(`createTestSale header failed: ${sErr.message}`);

  const { error: itemErr } = await client.from('sale_items').insert({
    sale_id: sale.id,
    commodity_id: input.commodityId,
    unit_id: input.unitId,
    quantity: input.quantity,
  });

  if (itemErr) {
    await client.from('sales').delete().eq('id', sale.id);
    throw new Error(`createTestSale items failed: ${itemErr.message}`);
  }

  registerCleanup({ schema: schemaName, table: 'sales', id: sale.id });
  return sale;
}

// ---------------------------------------------------------------------------
// Tenant module helper
// ---------------------------------------------------------------------------
export async function setTenantModule(
  tenantId: string,
  moduleId: string,
  status: 'enabled' | 'disabled'
) {
  const { error } = await serviceClient
    .from('tenant_modules')
    .upsert({ tenant_id: tenantId, module_id: moduleId, status }, { onConflict: 'tenant_id,module_id' });

  if (error) throw new Error(`setTenantModule failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Re-export TEST_TENANT for convenience
// ---------------------------------------------------------------------------
export { TEST_TENANT };
