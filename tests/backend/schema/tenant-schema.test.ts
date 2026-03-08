// File: tests/backend/schema/tenant-schema.test.ts
// Coverage: tenant_demo schema tables — columns, constraints, indexes, NO RLS
//           Validates the provisioned tenant schema against the template in 00002_tenant_template.sql
// Runner: Vitest (node environment)

import { describe, it, expect, beforeAll } from 'vitest';
import { serviceClient, tenantClient, TEST_TENANT } from '../setup/test-env';

const SCHEMA = TEST_TENANT.schema_name; // 'tenant_demo'

// ---------------------------------------------------------------------------
// Helper: query information_schema for a given tenant schema table
// ---------------------------------------------------------------------------
async function getTenantColumns(tableName: string) {
  const { data, error } = await serviceClient
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', SCHEMA)
    .eq('table_name', tableName);

  if (error) throw new Error(`getTenantColumns(${tableName}) failed: ${error.message}`);
  return data ?? [];
}

async function getTenantTableConstraints(tableName: string) {
  const { data, error } = await serviceClient
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_schema', SCHEMA)
    .eq('table_name', tableName);

  if (error) throw new Error(`getTenantTableConstraints(${tableName}) failed: ${error.message}`);
  return data ?? [];
}

async function getTenantIndexes(tableName: string) {
  const { data, error } = await serviceClient
    .from('pg_indexes')
    .select('indexname, indexdef')
    .eq('schemaname', SCHEMA)
    .eq('tablename', tableName);

  if (error) throw new Error(`getTenantIndexes(${tableName}) failed: ${error.message}`);
  return data ?? [];
}

async function getTenantRLS(tableName: string): Promise<boolean | null> {
  const { data, error } = await serviceClient
    .from('pg_tables')
    .select('rowsecurity')
    .eq('schemaname', SCHEMA)
    .eq('tablename', tableName)
    .single();

  if (error) return null;
  return data?.rowsecurity ?? null;
}

async function getTenantPolicies(tableName: string) {
  const { data, error } = await serviceClient
    .from('pg_policies')
    .select('policyname')
    .eq('schemaname', SCHEMA)
    .eq('tablename', tableName);

  if (error) throw new Error(`getTenantPolicies(${tableName}) failed: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Verify schema exists
// ---------------------------------------------------------------------------
describe('tenant_demo schema existence', () => {
  it('tenant_demo schema exists in pg_namespace', async () => {
    const { data, error } = await serviceClient
      .from('pg_namespace')
      .select('nspname')
      .eq('nspname', SCHEMA)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.nspname).toBe(SCHEMA);
  });
});

// ---------------------------------------------------------------------------
// locations table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.locations`, () => {
  it('has required columns', async () => {
    const cols = await getTenantColumns('locations');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('code');
    expect(names).toContain('type');
    expect(names).toContain('is_active');
    expect(names).toContain('custom_fields');
    expect(names).toContain('deleted_at');
    expect(names).toContain('created_at');
    expect(names).toContain('updated_at');
  });

  it('name and code columns are NOT NULL', async () => {
    const cols = await getTenantColumns('locations');
    const name = cols.find((c) => c.column_name === 'name');
    const code = cols.find((c) => c.column_name === 'code');
    expect(name!.is_nullable).toBe('NO');
    expect(code!.is_nullable).toBe('NO');
  });

  it('deleted_at is nullable (soft delete column)', async () => {
    const cols = await getTenantColumns('locations');
    const deletedAt = cols.find((c) => c.column_name === 'deleted_at');
    expect(deletedAt).toBeDefined();
    expect(deletedAt!.is_nullable).toBe('YES');
  });

  it('type column has CHECK constraint with valid values', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('locations').insert({
      name: 'Bad Location',
      code: `BAD-${Date.now()}`,
      type: 'invalid_type',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it('[MEDIUM] partial UNIQUE constraint on code WHERE deleted_at IS NULL exists', async () => {
    // Verify by attempting duplicate code insert (should fail while no deleted_at)
    const client = tenantClient(SCHEMA);
    const uniqueCode = `WH-NORTH`; // Known existing code in demo tenant

    const { error } = await client.from('locations').insert({
      name: 'Duplicate Warehouse North',
      code: uniqueCode,
      type: 'warehouse',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });

  it('[HIGH] NO RLS on locations table (tenant schema isolation via schema-per-tenant only)', async () => {
    const rlsEnabled = await getTenantRLS('locations');
    // Tenant tables intentionally have NO RLS — isolation is schema-per-tenant
    // This is documented as an architectural risk, not a misconfiguration
    if (rlsEnabled !== null) {
      expect(rlsEnabled).toBe(false);
    }
    const policies = await getTenantPolicies('locations');
    expect(policies.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// commodities table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.commodities`, () => {
  it('has required columns with soft delete', async () => {
    const cols = await getTenantColumns('commodities');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('code');
    expect(names).toContain('is_active');
    expect(names).toContain('custom_fields');
    expect(names).toContain('deleted_at');
  });

  it('[MEDIUM] partial UNIQUE constraint on code WHERE deleted_at IS NULL', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('commodities').insert({
      name: 'Duplicate Wheat',
      code: 'WHT', // existing code in demo tenant
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/unique|duplicate/i);
  });
});

// ---------------------------------------------------------------------------
// dispatches table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.dispatches`, () => {
  it('has required columns', async () => {
    const cols = await getTenantColumns('dispatches');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('dispatch_number');
    expect(names).toContain('origin_location_id');
    expect(names).toContain('dest_location_id');
    expect(names).toContain('status');
    expect(names).toContain('dispatched_by');
    expect(names).toContain('custom_fields');
    expect(names).toContain('deleted_at');
  });

  it('dispatch_number is UNIQUE', async () => {
    const constraints = await getTenantTableConstraints('dispatches');
    const uniqueConstraints = constraints.filter((c) => c.constraint_type === 'UNIQUE');
    expect(uniqueConstraints.length).toBeGreaterThanOrEqual(1);
  });

  it('status column CHECK constraint covers valid values', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('dispatches').insert({
      dispatch_number: `DSP-BAD-${Date.now()}`,
      origin_location_id: 'a0000001-0000-0000-0000-000000000001',
      dest_location_id: 'a0000001-0000-0000-0000-000000000002',
      status: 'shipped', // invalid status
      dispatched_by: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it('CHECK constraint prevents same origin and destination', async () => {
    const client = tenantClient(SCHEMA);
    const sameLocId = 'a0000001-0000-0000-0000-000000000001';
    const { error } = await client.from('dispatches').insert({
      dispatch_number: `DSP-SAME-${Date.now()}`,
      origin_location_id: sameLocId,
      dest_location_id: sameLocId,
      status: 'draft',
      dispatched_by: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it('idx_dispatches_status index exists', async () => {
    const indexes = await getTenantIndexes('dispatches');
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain('idx_dispatches_status');
  });

  it('idx_dispatches_origin and idx_dispatches_dest indexes exist', async () => {
    const indexes = await getTenantIndexes('dispatches');
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain('idx_dispatches_origin');
    expect(names).toContain('idx_dispatches_dest');
  });
});

// ---------------------------------------------------------------------------
// dispatch_items table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.dispatch_items`, () => {
  it('has required columns including generated shortage columns', async () => {
    const cols = await getTenantColumns('dispatch_items');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('dispatch_id');
    expect(names).toContain('commodity_id');
    expect(names).toContain('unit_id');
    expect(names).toContain('sent_quantity');
    expect(names).toContain('received_quantity');
    expect(names).toContain('shortage');
    expect(names).toContain('shortage_percent');
  });

  it('sent_quantity has CHECK constraint (> 0)', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('dispatch_items').insert({
      dispatch_id: 'f0000001-0000-0000-0000-000000000004', // draft dispatch
      commodity_id: 'b0000001-0000-0000-0000-000000000001',
      unit_id: 'c2f3fdc1-ebc2-4b48-b08f-185b189a469d',
      sent_quantity: -10, // negative — should fail
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it('[MEDIUM] idx_dispatch_items_dispatch index exists', async () => {
    const indexes = await getTenantIndexes('dispatch_items');
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain('idx_dispatch_items_dispatch');
  });

  // GAP [MEDIUM]: No index on dispatch_items.commodity_id
  // Queries joining dispatch_items to commodities will do sequential scans as data grows
  it('[MEDIUM] GAP: no index on dispatch_items.commodity_id (known missing index)', async () => {
    const indexes = await getTenantIndexes('dispatch_items');
    const names = indexes.map((i) => i.indexname);
    const hasCommodityIndex = names.some((n) => n.includes('commodity'));
    // This assertion documents the gap — expected to be false
    if (!hasCommodityIndex) {
      console.warn('[MEDIUM GAP] dispatch_items.commodity_id has no index. Consider adding idx_dispatch_items_commodity.');
    }
    expect(hasCommodityIndex).toBe(false); // Documents the known gap
  });
});

// ---------------------------------------------------------------------------
// purchases table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.purchases`, () => {
  it('has required columns with soft delete', async () => {
    const cols = await getTenantColumns('purchases');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('purchase_number');
    expect(names).toContain('contact_id');
    expect(names).toContain('location_id');
    expect(names).toContain('status');
    expect(names).toContain('created_by');
    expect(names).toContain('custom_fields');
    expect(names).toContain('deleted_at');
  });

  it('purchase_number is UNIQUE', async () => {
    const constraints = await getTenantTableConstraints('purchases');
    const uniqueConstraints = constraints.filter((c) => c.constraint_type === 'UNIQUE');
    expect(uniqueConstraints.length).toBeGreaterThanOrEqual(1);
  });

  it('status CHECK constraint covers (draft|ordered|received|cancelled)', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('purchases').insert({
      purchase_number: `PUR-BAD-${Date.now()}`,
      location_id: 'a0000001-0000-0000-0000-000000000001',
      status: 'pending', // invalid status
      created_by: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it('[MEDIUM] GAP: no index on purchases.status WHERE deleted_at IS NULL', async () => {
    const indexes = await getTenantIndexes('purchases');
    const names = indexes.map((i) => i.indexname);
    const hasStatusIndex = names.some((n) => n.includes('status'));
    if (!hasStatusIndex) {
      console.warn('[MEDIUM GAP] purchases table lacks status index. Add idx_purchases_status WHERE deleted_at IS NULL.');
    }
    expect(hasStatusIndex).toBe(false); // Documents the known gap
  });

  it('idx_purchases_location index exists', async () => {
    const indexes = await getTenantIndexes('purchases');
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain('idx_purchases_location');
  });
});

// ---------------------------------------------------------------------------
// sales table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.sales`, () => {
  it('has required columns with soft delete', async () => {
    const cols = await getTenantColumns('sales');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('sale_number');
    expect(names).toContain('location_id');
    expect(names).toContain('status');
    expect(names).toContain('created_by');
    expect(names).toContain('deleted_at');
  });

  it('[MEDIUM] GAP: no index on sales.status WHERE deleted_at IS NULL', async () => {
    const indexes = await getTenantIndexes('sales');
    const names = indexes.map((i) => i.indexname);
    const hasStatusIndex = names.some((n) => n.includes('status'));
    if (!hasStatusIndex) {
      console.warn('[MEDIUM GAP] sales table lacks status index. Add idx_sales_status WHERE deleted_at IS NULL.');
    }
    expect(hasStatusIndex).toBe(false); // Documents the known gap
  });
});

// ---------------------------------------------------------------------------
// contacts table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.contacts`, () => {
  it('has required columns with soft delete', async () => {
    const cols = await getTenantColumns('contacts');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('type');
    expect(names).toContain('is_active');
    expect(names).toContain('deleted_at');
  });

  it('type CHECK constraint covers (supplier|customer|both)', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('contacts').insert({
      name: 'Bad Contact',
      type: 'vendor', // invalid type
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });

  it('[MEDIUM] GAP: no partial UNIQUE on contacts.code WHERE deleted_at IS NULL', async () => {
    // contacts table has no code column at all — different from locations/commodities
    // This means there is no deduplication mechanism for contacts
    const cols = await getTenantColumns('contacts');
    const names = cols.map((c) => c.column_name);
    const hasCodeCol = names.includes('code');
    if (!hasCodeCol) {
      console.warn('[LOW GAP] contacts table has no code column. Unlike locations/commodities, contacts have no dedup key.');
    }
    expect(hasCodeCol).toBe(false); // Expected — contacts have no code column
  });
});

// ---------------------------------------------------------------------------
// sequence_counters table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.sequence_counters`, () => {
  it('table exists with correct columns', async () => {
    const cols = await getTenantColumns('sequence_counters');
    const names = cols.map((c) => c.column_name);
    expect(names).toContain('id');
    expect(names).toContain('prefix');
    expect(names).toContain('current_value');
  });

  it('has seeded rows for dispatch, purchase, sale, payment, lot, return', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('sequence_counters')
      .select('id, prefix, current_value');

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    const ids = data!.map((r) => r.id);
    expect(ids).toContain('dispatch');
    expect(ids).toContain('purchase');
    expect(ids).toContain('sale');
    expect(ids).toContain('payment');
    expect(ids).toContain('lot');
    expect(ids).toContain('return');
  });

  it('sequence prefixes match expected values', async () => {
    const client = tenantClient(SCHEMA);
    const { data } = await client
      .from('sequence_counters')
      .select('id, prefix');

    const prefixMap = Object.fromEntries((data ?? []).map((r) => [r.id, r.prefix]));
    expect(prefixMap['dispatch']).toBe('DSP');
    expect(prefixMap['purchase']).toBe('PUR');
    expect(prefixMap['sale']).toBe('SAL');
    expect(prefixMap['payment']).toBe('PAY');
    expect(prefixMap['lot']).toBe('LOT');
    expect(prefixMap['return']).toBe('RET');
  });

  it('current values reflect actual usage (dispatch has 6 entries)', async () => {
    const client = tenantClient(SCHEMA);
    const { data } = await client
      .from('sequence_counters')
      .select('id, current_value')
      .eq('id', 'dispatch')
      .single();

    expect(data).not.toBeNull();
    // Live data: dispatch counter is at 6
    expect(Number(data!.current_value)).toBeGreaterThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// audit_log table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.audit_log`, () => {
  it('table exists with required columns', async () => {
    const cols = await getTenantColumns('audit_log');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('user_id');
    expect(names).toContain('user_name');
    expect(names).toContain('action');
    expect(names).toContain('entity_type');
    expect(names).toContain('entity_id');
    expect(names).toContain('old_data');
    expect(names).toContain('new_data');
    expect(names).toContain('metadata');
    expect(names).toContain('created_at');
  });

  it('action and entity_type columns are NOT NULL', async () => {
    const cols = await getTenantColumns('audit_log');
    const action = cols.find((c) => c.column_name === 'action');
    const entityType = cols.find((c) => c.column_name === 'entity_type');
    expect(action!.is_nullable).toBe('NO');
    expect(entityType!.is_nullable).toBe('NO');
  });

  it('idx_audit_log_entity and idx_audit_log_created indexes exist', async () => {
    const indexes = await getTenantIndexes('audit_log');
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain('idx_audit_log_entity');
    expect(names).toContain('idx_audit_log_created');
  });
});

// ---------------------------------------------------------------------------
// user_profiles table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.user_profiles`, () => {
  it('has required columns with permissions JSONB', async () => {
    const cols = await getTenantColumns('user_profiles');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('user_id');
    expect(names).toContain('display_name');
    expect(names).toContain('permissions');
    expect(names).toContain('is_active');
  });

  it('user_id has UNIQUE constraint', async () => {
    const constraints = await getTenantTableConstraints('user_profiles');
    const uniqueConstraints = constraints.filter((c) => c.constraint_type === 'UNIQUE');
    expect(uniqueConstraints.length).toBeGreaterThanOrEqual(1);
  });

  it('permissions column defaults to JSONB object with canViewStock: false', async () => {
    const cols = await getTenantColumns('user_profiles');
    const permsCol = cols.find((c) => c.column_name === 'permissions');
    expect(permsCol).toBeDefined();
    expect(permsCol!.column_default).toContain('canViewStock');
  });
});

// ---------------------------------------------------------------------------
// custom_field_definitions table
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.custom_field_definitions`, () => {
  it('has required columns', async () => {
    const cols = await getTenantColumns('custom_field_definitions');
    const names = cols.map((c) => c.column_name);

    expect(names).toContain('id');
    expect(names).toContain('entity_type');
    expect(names).toContain('field_key');
    expect(names).toContain('field_label');
    expect(names).toContain('field_type');
    expect(names).toContain('is_required');
    expect(names).toContain('is_active');
  });

  it('UNIQUE constraint on (entity_type, field_key)', async () => {
    const constraints = await getTenantTableConstraints('custom_field_definitions');
    const uniqueConstraints = constraints.filter((c) => c.constraint_type === 'UNIQUE');
    expect(uniqueConstraints.length).toBeGreaterThanOrEqual(1);
  });

  it('entity_type CHECK constraint covers valid entity types', async () => {
    const client = tenantClient(SCHEMA);
    const { error } = await client.from('custom_field_definitions').insert({
      entity_type: 'invoice', // invalid
      field_key: 'test_field',
      field_label: 'Test',
      field_type: 'text',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|violates/i);
  });
});

// ---------------------------------------------------------------------------
// stock_levels view
// ---------------------------------------------------------------------------
describe(`${SCHEMA}.stock_levels view`, () => {
  it('view exists and returns data', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('stock_levels')
      .select('commodity_id, location_id, unit_id, total_in, total_out, current_stock, in_transit')
      .limit(10);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('current_stock = total_in - total_out', async () => {
    const client = tenantClient(SCHEMA);
    const { data } = await client
      .from('stock_levels')
      .select('total_in, total_out, current_stock')
      .limit(10);

    for (const row of data ?? []) {
      const expected = Number(row.total_in) - Number(row.total_out);
      expect(Number(row.current_stock)).toBe(expected);
    }
  });
});
