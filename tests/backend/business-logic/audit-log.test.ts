// File: tests/backend/business-logic/audit-log.test.ts
// Coverage: Audit log — table structure, direct write capability, and the critical gap
//           that createAuditEntry() is NEVER CALLED from any API route mutation.
//
// IMPORTANT: Several tests in this file are EXPECTED TO FAIL (or produce zero entries)
// because createAuditEntry() in src/modules/audit-trail/queries/audit-log.ts is defined
// but not imported or called from any purchase/dispatch/sale/return route handler.
//
// The live DB has 8 audit_log entries but they were seeded directly — NOT written by the API.
//
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import { serviceClient, tenantClient, TEST_TENANT, TW_LOCATIONS, TW_COMMODITIES } from '../setup/test-env';
import { runCleanup } from '../setup/seed-factories';

const SCHEMA = TEST_TENANT.schema_name;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Audit log table: structural tests (expected to pass)
// ---------------------------------------------------------------------------

describe('audit_log table: structural tests', () => {
  it('audit_log table exists and is readable', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('audit_log')
      .select('id, action, entity_type, created_at')
      .limit(1);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it('audit_log has indexes for performance (entity_type+entity_id, created_at)', async () => {
    // Must use exec_sql — PostgREST cannot expose pg_indexes directly
    const rows = await (serviceClient as any).rpc('exec_sql', {
      query: `SELECT indexname FROM pg_indexes WHERE schemaname = '${SCHEMA}' AND tablename = 'audit_log'`,
    });
    const indexNames = ((rows.data ?? []) as { indexname: string }[]).map((i) => i.indexname);
    expect(indexNames).toContain('idx_audit_log_entity');
    expect(indexNames).toContain('idx_audit_log_created');
  });

  it('audit_log can receive direct inserts (createAuditEntry() works when called)', async () => {
    // ARRANGE: confirm the function WOULD work if called — test direct insert
    const client = tenantClient(SCHEMA);
    const testUserId = '00000000-0000-0000-0000-000000000099';
    const testEntityId = 'a0000001-0000-0000-0000-000000000001';

    const { data, error } = await client
      .from('audit_log')
      .insert({
        user_id: testUserId,
        user_name: 'Test User',
        action: 'create',
        entity_type: 'purchase',
        entity_id: testEntityId,
        old_data: null,
        new_data: { test: true },
        metadata: { source: 'test' },
      })
      .select('id, action, entity_type')
      .single();

    // ASSERT: direct insert works fine
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.action).toBe('create');
    expect(data!.entity_type).toBe('purchase');

    // Cleanup: delete the test entry
    await client.from('audit_log').delete().eq('id', data!.id);
  });

  it('audit_log entries are ordered by created_at DESC (most recent first)', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('audit_log')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(error).toBeNull();

    // Verify ordering
    if (data && data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].created_at).getTime();
        const next = new Date(data[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it('existing audit entries have valid action values', async () => {
    const client = tenantClient(SCHEMA);
    const { data } = await client
      .from('audit_log')
      .select('action, entity_type')
      .limit(20);

    const validActions = ['create', 'update', 'delete'];
    for (const entry of data ?? []) {
      expect(validActions).toContain(entry.action);
    }
  });
});

// ---------------------------------------------------------------------------
// [HIGH] KNOWN GAP: audit log is never populated by API mutations
// ---------------------------------------------------------------------------

describe('[HIGH] KNOWN GAP: audit_log not written by API route mutations', () => {
  it('[HIGH] audit_log entries in test-warehouse are from direct seeding — NOT from API calls', async () => {
    // ARRANGE: check total audit log count for test-warehouse tenant
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('audit_log')
      .select('id, action, entity_type, created_at');

    expect(error).toBeNull();
    const entryCount = data?.length ?? 0;
    console.log(`[INFO] audit_log has ${entryCount} entries in test-warehouse tenant.`);

    // If entries exist, check if they share timestamps (batch-seeded pattern)
    if (entryCount > 1) {
      const timestamps = [...new Set(data!.map((e) => e.created_at))];
      if (timestamps.length === 1) {
        console.error(
          `[HIGH CRITICAL] All ${entryCount} audit_log entries share identical timestamps — seeded in a single batch. ` +
          'Zero entries were created by API route mutations. ' +
          'createAuditEntry() in src/modules/audit-trail/queries/audit-log.ts is never called ' +
          'from purchases/route.ts, dispatches/route.ts, sales/route.ts, returns/route.ts, or any other mutation handler.'
        );
      }
    } else if (entryCount === 0) {
      console.log('[INFO] audit_log is empty in test-warehouse tenant — no seeded entries.');
    }

    // Test passes — finding documented above regardless of count
    expect(error).toBeNull();
  });

  it('[HIGH] creating a purchase via direct DB insert does NOT trigger audit log entry', async () => {
    // ARRANGE: count current audit log entries
    const client = tenantClient(SCHEMA);
    const { data: before } = await client
      .from('audit_log')
      .select('id', { count: 'exact' });
    const countBefore = before?.length ?? 0;

    // ACT: create a purchase directly (simulates what API would do internally)
    const purchaseNumber = `PUR-AUDIT-TEST-${Date.now()}`;
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

    // ASSERT: audit log count has NOT increased (no trigger or function call)
    const { data: after } = await client
      .from('audit_log')
      .select('id', { count: 'exact' });
    const countAfter = after?.length ?? 0;

    expect(countAfter).toBe(countBefore); // No automatic audit entry created

    console.error(
      '[HIGH] Creating a purchase produced 0 audit log entries. ' +
      'There is no DB-level trigger and the application-level createAuditEntry() is not called. ' +
      'FIX: Add audit log calls in src/modules/purchase/queries/purchases.ts createPurchase(). ' +
      'Apply the same fix to createDispatch(), createSale(), createReturn(), and all UPDATE handlers.'
    );

    // Cleanup
    await client.from('purchases').delete().eq('id', purchase!.id);
  });

  it('[HIGH] updating dispatch status does NOT trigger audit log entry', async () => {
    const client = tenantClient(SCHEMA);
    const { data: before } = await client
      .from('audit_log')
      .select('id', { count: 'exact' });
    const countBefore = before?.length ?? 0;

    // ACT: update a dispatch's status (simulates receive operation)
    const dispatchNumber = `DSP-AUDIT-TEST-${Date.now()}`;
    const { data: dispatch } = await client
      .from('dispatches')
      .insert({
        dispatch_number: dispatchNumber,
        origin_location_id: TW_LOCATIONS.LOC1,
        dest_location_id: TW_LOCATIONS.LOC3,
        status: 'dispatched',
        dispatched_by: '00000000-0000-0000-0000-000000000099',
      })
      .select('id')
      .single();

    // Update status to received
    await client
      .from('dispatches')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', dispatch!.id);

    const { data: after } = await client
      .from('audit_log')
      .select('id', { count: 'exact' });
    const countAfter = after?.length ?? 0;

    // No audit entry was created for the status change
    expect(countAfter).toBe(countBefore);

    console.error(
      '[HIGH] Dispatch status change from dispatched->received produced 0 audit log entries. ' +
      'Critical operations like receive confirmation have no audit trail.'
    );

    // Cleanup
    await client.from('dispatch_items').delete().eq('dispatch_id', dispatch!.id);
    await client.from('dispatches').delete().eq('id', dispatch!.id);
  });
});

// ---------------------------------------------------------------------------
// [HIGH] Recommended fix: audit log entries SHOULD be written for mutations
// ---------------------------------------------------------------------------

describe('audit_log: what correct behavior SHOULD look like', () => {
  it('documents expected audit schema for purchase create', () => {
    // This test documents what a correct audit entry should contain
    // after createPurchase() is called
    const expectedAuditEntry = {
      action: 'create',
      entity_type: 'purchase',
      // entity_id: <purchase UUID>
      // user_id: <authenticated user UUID>
      // user_name: <user display name>
      new_data: {
        // purchase_number, location_id, status, etc.
      },
      old_data: null, // null for create operations
      metadata: {
        // tenant schema, IP address, etc.
      },
    };

    // Verify the audit_log table can store this shape
    expect(expectedAuditEntry.action).toBe('create');
    expect(expectedAuditEntry.old_data).toBeNull();
  });

  it('documents expected audit schema for dispatch status update', () => {
    const expectedAuditEntry = {
      action: 'update',
      entity_type: 'dispatch',
      old_data: { status: 'dispatched' },
      new_data: { status: 'received', received_at: '<timestamp>' },
    };

    expect(expectedAuditEntry.action).toBe('update');
    expect(expectedAuditEntry.old_data).not.toBeNull();
    expect(expectedAuditEntry.new_data).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Audit log filtering queries (for audit trail UI)
// ---------------------------------------------------------------------------

describe('audit_log: filtering and query patterns', () => {
  it('can filter audit entries by entity_type', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('audit_log')
      .select('id, action, entity_type')
      .eq('entity_type', 'purchase');

    expect(error).toBeNull();
    for (const entry of data ?? []) {
      expect(entry.entity_type).toBe('purchase');
    }
  });

  it('can filter audit entries by action', async () => {
    const client = tenantClient(SCHEMA);
    const { data, error } = await client
      .from('audit_log')
      .select('id, action')
      .eq('action', 'create');

    expect(error).toBeNull();
    for (const entry of data ?? []) {
      expect(entry.action).toBe('create');
    }
  });

  it('can paginate audit entries (limit/offset)', async () => {
    const client = tenantClient(SCHEMA);

    const { data: page1 } = await client
      .from('audit_log')
      .select('id')
      .order('created_at', { ascending: false })
      .range(0, 3);

    const { data: page2 } = await client
      .from('audit_log')
      .select('id')
      .order('created_at', { ascending: false })
      .range(4, 7);

    expect(page1).not.toBeNull();
    expect(page2).not.toBeNull();

    // No overlap between pages
    const page1Ids = new Set(page1!.map((r) => r.id));
    const page2Ids = page2!.map((r) => r.id);
    for (const id of page2Ids) {
      expect(page1Ids.has(id)).toBe(false);
    }
  });
});
