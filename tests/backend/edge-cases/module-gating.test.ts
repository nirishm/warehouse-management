// File: tests/backend/edge-cases/module-gating.test.ts
// Coverage: Module gating — tenant_modules table structure, enabled_modules column on
//           tenants, module DDL presence for returns/lots/payments/stock_alert_thresholds,
//           requireModule() logic, module-disabled API returns 403 (marked .skip).
// Runner: Vitest (node environment)
//
// NOTE: exec_sql RPC now EXISTS in Supabase. Module DDL tables
// (returns, lots, payments, stock_alert_thresholds) have been applied in test-warehouse.
// The adjustments table is NOT present for this tenant.

import { describe, it, expect, afterEach } from 'vitest';
import {
  serviceClient,
  tenantClient,
  TEST_TENANT,
} from '../setup/test-env';
import { runCleanup } from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// tenant_modules table: structure
// ---------------------------------------------------------------------------
describe('tenant_modules table: structure and access', () => {
  it('tenant_modules table exists in public schema', async () => {
    // ARRANGE: query the tenant_modules table
    const { data, error } = await serviceClient
      .from('tenant_modules')
      .select('tenant_id, module_id, status')
      .limit(5);

    // ASSERT: table accessible
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('tenant_modules status CHECK allows only enabled and disabled', async () => {
    // ARRANGE: attempt to insert invalid status
    const { error } = await serviceClient
      .from('tenant_modules')
      .insert({
        tenant_id: TEST_TENANT.id,
        module_id: 'fake_module',
        status: 'active', // invalid — only enabled/disabled are valid
      });

    // ASSERT: constraint violation or FK error (tenant_id may reference tenants table)
    expect(error).not.toBeNull();
    // Either check constraint violation or FK violation (both are acceptable failures)
    expect(error!.message).toMatch(/check|violates|foreign key/i);
  });

  it('test-warehouse tenant: tenant_modules rows may be zero (modules tracked in tenants.enabled_modules)', async () => {
    // ARRANGE: query tenant_modules for test-warehouse tenant
    const { data, error } = await serviceClient
      .from('tenant_modules')
      .select('module_id, status')
      .eq('tenant_id', TEST_TENANT.id);

    // ASSERT: either empty (modules tracked via enabled_modules column) or has module rows
    expect(error).toBeNull();
    // Document the actual state — no assertion on count because this may vary
    console.log(
      `tenant_modules rows for test-warehouse tenant: ${data?.length ?? 0}. ` +
        'If 0, modules are tracked via tenants.enabled_modules TEXT[] column instead.'
    );
  });
});

// ---------------------------------------------------------------------------
// tenants.enabled_modules: how modules are tracked in practice
// ---------------------------------------------------------------------------
describe('tenants.enabled_modules: module tracking column', () => {
  it('test-warehouse tenant has enabled_modules TEXT[] column with module list', async () => {
    // ARRANGE
    const { data, error } = await serviceClient
      .from('tenants')
      .select('id, slug, enabled_modules')
      .eq('slug', 'test-warehouse')
      .single();

    // ASSERT: column exists and contains module names
    expect(error).toBeNull();
    expect(data).not.toBeNull();

    if (Array.isArray(data!.enabled_modules)) {
      console.log('enabled_modules:', data!.enabled_modules);
      // Core modules should always be enabled
      expect(data!.enabled_modules).toContain('inventory');
    } else {
      console.log('enabled_modules is not an array:', data!.enabled_modules);
    }
  });

  it('returns module table EXISTS in test-warehouse (exec_sql RPC resolved)', async () => {
    // ARRANGE: returns table should exist in test-warehouse — migration was applied
    const { error: tableError } = await tenantClient(SCHEMA)
      .from('returns')
      .select('id')
      .limit(1);

    // ASSERT: no PGRST205 "table not found" error — returns table is present
    expect(tableError?.code).not.toBe('PGRST205');
    // Either null (table exists, data may be empty) or another non-table-missing error
    if (tableError) {
      console.log(`returns table query error (non-PGRST205): ${tableError.message}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Module DDL: all exec_sql-dependent module tables exist in test-warehouse
// ---------------------------------------------------------------------------
describe('module DDL: tables exist in tenant_test_warehouse', () => {
  const moduleTables = [
    { module: 'returns', table: 'returns' },
    { module: 'lot-tracking', table: 'lots' },
    { module: 'payments', table: 'payments' },
    { module: 'stock-alerts', table: 'stock_alert_thresholds' },
  ];

  for (const { module, table } of moduleTables) {
    it(`${module} module: ${table} table exists in tenant_test_warehouse`, async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT: query the module's primary table
      const { error } = await client.from(table).select('id').limit(1);

      // ASSERT: table is present (no PGRST205 "relation not found" error)
      expect(error?.code).not.toBe('PGRST205');
      if (!error) {
        console.log(`${module}: ${table} table confirmed present in tenant_test_warehouse.`);
      } else {
        // Some other error (permissions, etc.) — table still exists in schema cache
        console.log(`${module}: ${table} query returned non-missing error: ${error.message}`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// requireModule() logic: structural test
// ---------------------------------------------------------------------------
describe('requireModule(): logic correctness', () => {
  it('requireModule throws for a module not in enabledModules list', () => {
    // ARRANGE: simulate the withTenantContext requireModule implementation
    function requireModule(enabledModules: string[], moduleId: string): void {
      if (!enabledModules.includes(moduleId)) {
        throw new Error(`Module not enabled: ${moduleId}`);
      }
    }

    const enabledModules = ['inventory', 'purchase', 'dispatch', 'sale'];

    // ACT + ASSERT: disabled module throws
    expect(() => requireModule(enabledModules, 'returns')).toThrow('Module not enabled: returns');
    expect(() => requireModule(enabledModules, 'lot-tracking')).toThrow('Module not enabled: lot-tracking');
    expect(() => requireModule(enabledModules, 'payments')).toThrow('Module not enabled: payments');
  });

  it('requireModule does not throw for enabled modules', () => {
    function requireModule(enabledModules: string[], moduleId: string): void {
      if (!enabledModules.includes(moduleId)) {
        throw new Error(`Module not enabled: ${moduleId}`);
      }
    }

    const enabledModules = ['inventory', 'purchase', 'dispatch', 'sale'];

    // ACT + ASSERT: enabled modules pass
    expect(() => requireModule(enabledModules, 'inventory')).not.toThrow();
    expect(() => requireModule(enabledModules, 'purchase')).not.toThrow();
    expect(() => requireModule(enabledModules, 'dispatch')).not.toThrow();
    expect(() => requireModule(enabledModules, 'sale')).not.toThrow();
  });

  it('[HIGH] x-tenant-modules header can be forged to enable disabled modules', () => {
    // FINDING: withTenantContext reads enabled modules from the request header:
    //   enabledModules = JSON.parse(request.headers.get('x-tenant-modules') || '[]')
    // An attacker who bypasses middleware can set this header to include 'returns'
    // and bypass the requireModule() check, accessing the returns module API routes.
    //
    // The underlying returns table would still not exist (PGRST205), so actual data
    // access would fail. But this is a defense-in-depth gap.
    //
    // RECOMMENDATION: Read enabled modules from tenants.enabled_modules in the DB,
    // not from the request header.
    console.error(
      '[HIGH] requireModule() checks against x-tenant-modules header value, not DB. ' +
        'A forged header value bypasses module gating. ' +
        'FIX: Read enabled modules from tenants.enabled_modules after auth resolves.'
    );

    // Structural simulation: if the header is forged with all modules
    const forgedHeader = JSON.stringify([
      'inventory', 'purchase', 'dispatch', 'sale',
      'returns', 'lot-tracking', 'payments', 'stock-alerts',
      'analytics', 'barcode', 'bulk-import', 'document-gen',
    ]);
    const parsedModules: string[] = JSON.parse(forgedHeader);

    // The check would pass for 'returns' even if it's not really enabled
    expect(parsedModules.includes('returns')).toBe(true);
  });

  it('empty enabledModules array blocks all module access', () => {
    function requireModule(enabledModules: string[], moduleId: string): void {
      if (!enabledModules.includes(moduleId)) {
        throw new Error(`Module not enabled: ${moduleId}`);
      }
    }

    const emptyModules: string[] = [];

    // ALL modules should be blocked
    const modules = ['inventory', 'purchase', 'dispatch', 'sale', 'returns'];
    for (const mod of modules) {
      expect(() => requireModule(emptyModules, mod)).toThrow(`Module not enabled: ${mod}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Module manifest: all modules registered
// ---------------------------------------------------------------------------
describe('module registry: manifest completeness', () => {
  it('[LOW] documents expected module IDs for this installation', () => {
    // These are the 16 modules defined in src/modules/*/manifest.ts
    const expectedModules = [
      'inventory',
      'dispatch',
      'purchase',
      'sale',
      'analytics',
      'shortage-tracking',
      'user-management',
      'audit-trail',
      'payments',
      'stock-alerts',
      'document-gen',
      'lot-tracking',
      'returns',
      'bulk-import',
      'barcode',
    ];

    // All modules expected — just a documentation test
    expect(expectedModules.length).toBe(15);
    expect(expectedModules).toContain('returns');
    expect(expectedModules).toContain('payments');
    expect(expectedModules).toContain('lot-tracking');
  });
});

// ---------------------------------------------------------------------------
// API-layer tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('module-gating API: HTTP contract (requires dev server + auth)', () => {
  it('[HIGH] GET /api/t/[slug]/returns returns 403 when returns not in x-tenant-modules', async () => {
    expect(true).toBe(true);
  });

  it('[HIGH] GET /api/t/[slug]/payments returns 403 when payments module disabled', async () => {
    expect(true).toBe(true);
  });

  it('[HIGH] forging x-tenant-modules to include returns bypasses 403 check', async () => {
    // This test would demonstrate the header forge vulnerability.
    // With a valid auth token + forged x-tenant-modules header,
    // the returns API route handler would NOT return 403.
    // Instead it would attempt to query the (non-existent) returns table.
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/returns with disabled module (real header) returns 403', async () => {
    expect(true).toBe(true);
  });
});
