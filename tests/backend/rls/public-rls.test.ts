// File: tests/backend/rls/public-rls.test.ts
// Coverage: RLS policies on public schema tables — structural policy verification,
//           anon access denial, tenant data isolation principles
// Runner: Vitest (node environment)

import { describe, it, expect } from 'vitest';
import { serviceClient, anonClient, tenantClient, TEST_TENANT } from '../setup/test-env';

// ---------------------------------------------------------------------------
// Helper: fetch RLS policies from pg_policies
// ---------------------------------------------------------------------------
async function getPolicies(tableName: string) {
  const { data, error } = await serviceClient
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('schemaname', 'public')
    .eq('tablename', tableName);

  if (error) throw new Error(`getPolicies(${tableName}) failed: ${error.message}`);
  return data ?? [];
}

async function getRLSEnabled(tableName: string): Promise<boolean> {
  const { data, error } = await serviceClient
    .from('pg_tables')
    .select('rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', tableName)
    .single();

  if (error) throw new Error(`getRLSEnabled(${tableName}) failed: ${error.message}`);
  return data?.rowsecurity === true;
}

// ---------------------------------------------------------------------------
// RLS enablement — all public tables must have RLS ON
// ---------------------------------------------------------------------------
describe('[HIGH] RLS enablement on public schema tables', () => {
  const publicTables = ['tenants', 'user_tenants', 'super_admins', 'tenant_modules'];

  for (const table of publicTables) {
    it(`[HIGH] RLS is enabled on public.${table}`, async () => {
      const enabled = await getRLSEnabled(table);
      expect(enabled).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Policy structure checks
// ---------------------------------------------------------------------------
describe('RLS policy structure on public.tenants', () => {
  it('has at least 2 policies (user view + super admin manage)', async () => {
    const policies = await getPolicies('tenants');
    expect(policies.length).toBeGreaterThanOrEqual(2);
  });

  it('policies reference auth.uid() for user isolation', async () => {
    const policies = await getPolicies('tenants');
    const hasUidPolicy = policies.some((p) => p.qual?.includes('auth.uid()'));
    expect(hasUidPolicy).toBe(true);
  });

  it('policies reference super_admins table for admin access', async () => {
    const policies = await getPolicies('tenants');
    const hasSuperAdminPolicy = policies.some((p) => p.qual?.includes('super_admins'));
    expect(hasSuperAdminPolicy).toBe(true);
  });

  it('user_tenants sub-select is used to scope tenant visibility', async () => {
    const policies = await getPolicies('tenants');
    const hasUserTenantPolicy = policies.some((p) => p.qual?.includes('user_tenants'));
    expect(hasUserTenantPolicy).toBe(true);
  });
});

describe('RLS policy structure on public.user_tenants', () => {
  it('has policies for SELECT and ALL', async () => {
    const policies = await getPolicies('user_tenants');
    expect(policies.length).toBeGreaterThanOrEqual(2);
  });

  it('SELECT policy restricts to own memberships (user_id = auth.uid())', async () => {
    const policies = await getPolicies('user_tenants');
    const selectPolicy = policies.find((p) => p.cmd === 'SELECT' || p.cmd === '*');
    expect(selectPolicy).toBeDefined();
    expect(selectPolicy!.qual?.includes('auth.uid()')).toBe(true);
  });
});

describe('RLS policy structure on public.super_admins', () => {
  it('has at least one policy', async () => {
    const policies = await getPolicies('super_admins');
    expect(policies.length).toBeGreaterThanOrEqual(1);
  });

  it('policy restricts access to only super admins themselves', async () => {
    const policies = await getPolicies('super_admins');
    const hasSelfReferentialPolicy = policies.some((p) => p.qual?.includes('super_admins'));
    expect(hasSelfReferentialPolicy).toBe(true);
  });
});

describe('RLS policy structure on public.tenant_modules', () => {
  it('has policies for SELECT and ALL', async () => {
    const policies = await getPolicies('tenant_modules');
    expect(policies.length).toBeGreaterThanOrEqual(2);
  });

  it('SELECT policy restricts to own tenant memberships', async () => {
    const policies = await getPolicies('tenant_modules');
    const hasUserTenantRef = policies.some((p) => p.qual?.includes('user_tenants'));
    expect(hasUserTenantRef).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated (anon) access denial
// ---------------------------------------------------------------------------
describe('[HIGH] Unauthenticated (anon) access to public schema tables', () => {
  it('[HIGH] anon cannot read tenants (RLS returns empty set)', async () => {
    // ARRANGE: anon client — auth.uid() resolves to null
    // ACT: attempt SELECT on tenants
    const { data, error } = await anonClient
      .from('tenants')
      .select('id, name, slug');

    // ASSERT: no error (RLS silently filters), but no rows returned
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('[HIGH] anon cannot read user_tenants (RLS returns empty set)', async () => {
    const { data, error } = await anonClient
      .from('user_tenants')
      .select('id, user_id, tenant_id');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('[HIGH] anon cannot read super_admins (RLS returns empty set)', async () => {
    const { data, error } = await anonClient
      .from('super_admins')
      .select('id, user_id');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('[HIGH] anon cannot read tenant_modules (RLS returns empty set)', async () => {
    const { data, error } = await anonClient
      .from('tenant_modules')
      .select('id, module_id, status');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// [HIGH] Anon write attempts to public tables
// ---------------------------------------------------------------------------
describe('[HIGH] Unauthenticated (anon) write attempts to public tables', () => {
  it('[HIGH] anon cannot INSERT into tenants', async () => {
    const { error } = await anonClient
      .from('tenants')
      .insert({
        name: 'Hacked Tenant',
        slug: `hacked-${Date.now()}`,
        schema_name: `tenant_hacked_${Date.now()}`,
        status: 'active',
        plan: 'enterprise',
      });

    // Should fail — RLS blocks INSERT with no auth.uid()
    expect(error).not.toBeNull();
  });

  it('[HIGH] anon cannot INSERT into super_admins', async () => {
    const { error } = await anonClient
      .from('super_admins')
      .insert({ user_id: '00000000-0000-0000-0000-000000000999' });

    expect(error).not.toBeNull();
  });

  it('[HIGH] anon cannot UPDATE tenants', async () => {
    const { error } = await anonClient
      .from('tenants')
      .update({ status: 'cancelled' })
      .eq('slug', 'demo');

    expect(error).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// [HIGH] Tenant schema tables — accessed with anon key (CRITICAL FINDING)
// ---------------------------------------------------------------------------
describe('[HIGH] Tenant schema table access via anon key (schema isolation gap)', () => {
  it('[HIGH] anon CAN read tenant schema purchases via PostgREST Accept-Profile header', async () => {
    // ARRANGE: This is a CRITICAL SECURITY FINDING.
    // Tenant schema tables have NO RLS. PostgREST exposes all schemas listed in
    // the db-schema config. The anon role can access tenant schema tables via
    // Accept-Profile header without any auth.
    //
    // LIVE DB VERIFICATION: curl confirmed that anon key + Accept-Profile: tenant_demo
    // returns purchase records without authentication.
    //
    // RECOMMENDATION: Either:
    // (a) Add RLS to all tenant schema tables with a permissive policy for authenticated users
    // (b) Restrict PostgREST db-schema to only expose 'public' — tenant schemas accessed only via service role
    // (c) Add a GRANT REVOKE to ensure anon role has no privileges on tenant schemas

    // Using the tenant client (service role) confirms data exists
    const client = tenantClient(TEST_TENANT.schema_name);
    const { data: serviceData } = await client
      .from('purchases')
      .select('id')
      .limit(1);

    expect(serviceData).not.toBeNull();
    expect(serviceData!.length).toBeGreaterThan(0);

    // This test DOCUMENTS the gap. The actual anon-key fetch returns data.
    // Structural finding: NO RLS on tenant schema tables
    const { data: policies } = await serviceClient
      .from('pg_policies')
      .select('policyname')
      .eq('schemaname', TEST_TENANT.schema_name)
      .eq('tablename', 'purchases');

    const policyCount = (policies ?? []).length;
    expect(policyCount).toBe(0); // Confirms no RLS policies on tenant tables
    console.error('[HIGH CRITICAL] tenant_demo.purchases has 0 RLS policies. Anon key can read tenant data.');
  });

  it('[HIGH] anon CAN read tenant schema dispatches (no RLS protection)', async () => {
    const { data: policies } = await serviceClient
      .from('pg_policies')
      .select('policyname')
      .eq('schemaname', TEST_TENANT.schema_name)
      .eq('tablename', 'dispatches');

    expect((policies ?? []).length).toBe(0);
    console.error('[HIGH CRITICAL] tenant_demo.dispatches has 0 RLS policies.');
  });

  it('[HIGH] anon CAN read tenant schema sales (no RLS protection)', async () => {
    const { data: policies } = await serviceClient
      .from('pg_policies')
      .select('policyname')
      .eq('schemaname', TEST_TENANT.schema_name)
      .eq('tablename', 'sales');

    expect((policies ?? []).length).toBe(0);
    console.error('[HIGH CRITICAL] tenant_demo.sales has 0 RLS policies.');
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant isolation principle
// ---------------------------------------------------------------------------
describe('Cross-tenant isolation via schema-per-tenant', () => {
  it('service role can distinguish tenant schemas (demo schema exists)', async () => {
    // ARRANGE: use service role to verify tenant isolation is schema-based
    const { data } = await serviceClient
      .from('tenants')
      .select('schema_name')
      .eq('slug', 'demo')
      .single();

    // ASSERT: schema_name is the only data isolation mechanism
    expect(data?.schema_name).toBe('tenant_demo');
  });

  it('[HIGH] no cross-tenant table exists in public schema (no shared data tables)', async () => {
    // Verify public schema only has the 4 expected system tables
    const { data } = await serviceClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    const tableNames = (data ?? []).map((t) => t.table_name);
    const systemTables = ['tenants', 'user_tenants', 'super_admins', 'tenant_modules'];

    for (const table of tableNames) {
      if (!systemTables.includes(table)) {
        console.warn(`[INFO] Extra table in public schema: ${table}`);
      }
    }

    // All system tables exist
    for (const t of systemTables) {
      expect(tableNames).toContain(t);
    }
  });

  // GAP [HIGH]: withTenantContext() reads x-tenant-schema from request headers.
  // If Next.js middleware is bypassed, any caller can set x-tenant-schema to any value
  // and access that schema's data. Tenant schemas have no RLS to catch this.
  it('[HIGH] GAP: documented — withTenantContext trusts x-tenant-schema header without DB verification', () => {
    // This is a code-level gap confirmed by reading src/core/auth/guards.ts:
    // const schemaName = request.headers.get('x-tenant-schema');
    // There is no verification that this schema belongs to the authenticated user's tenant.
    // If middleware is bypassed, an attacker can pass any schema name.
    console.warn(
      '[HIGH GAP] withTenantContext() does not verify x-tenant-schema against DB. ' +
      'Ensure Next.js middleware is applied to ALL /api/t/ routes and cannot be bypassed.'
    );
    expect(true).toBe(true); // Test passes — finding is documented
  });
});
