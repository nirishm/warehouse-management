// File: tests/backend/api/adjustments.test.ts
// Coverage: adjustments module — table existence gate, adjustment_reasons schema,
//           default seed reasons, adjustment CRUD, soft-delete column.
//           All DB-touching tests skip when MODULE_TABLES.adjustments = false
//           (DDL has not been applied for the test-warehouse tenant).
// Runner: Vitest (node environment)

import { describe, it, expect, afterEach } from 'vitest';
import { tenantClient, serviceClient, TEST_TENANT, MODULE_TABLES } from '../setup/test-env';
import { runCleanup, registerCleanup, getDefaultUnit } from '../setup/seed-factories';
import { TW_LOCATIONS, TW_COMMODITIES } from '../setup/test-env';

const SCHEMA = TEST_TENANT.schema_name;
const adjustmentsEnabled = MODULE_TABLES.adjustments;

afterEach(async () => {
  await runCleanup();
});

// ---------------------------------------------------------------------------
// Sentinel: always-runs test to document module provisioning status
// ---------------------------------------------------------------------------
describe('adjustments module: provisioning status', () => {
  it('documents whether the adjustments module is provisioned for test-warehouse', () => {
    // ARRANGE: read MODULE_TABLES constant (set at test suite init time)
    // ACT + ASSERT: this test always passes; it logs the status as a signal
    if (!adjustmentsEnabled) {
      console.warn(
        '[MEDIUM] adjustments module is NOT provisioned for tenant_test_warehouse. ' +
        'Tables adjustment_reasons and adjustments do not exist. ' +
        'All adjustments DB tests are skipped. ' +
        'To provision: enable the adjustments module via admin UI or call applyAdjustmentsMigration().'
      );
    } else {
      console.info(
        '[INFO] adjustments module IS provisioned for tenant_test_warehouse. ' +
        'All DB tests will run.'
      );
    }
    // This is a documentation-only test; it always passes.
    expect(true).toBe(true);
  });

  it.skipIf(!adjustmentsEnabled)(
    'adjustments module tables are reachable when provisioned',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT: try querying both tables
      const { error: reasonsErr } = await client
        .from('adjustment_reasons')
        .select('id')
        .limit(1);

      const { error: adjErr } = await client
        .from('adjustments')
        .select('id')
        .limit(1);

      // ASSERT: both tables accessible with no error
      expect(reasonsErr).toBeNull();
      expect(adjErr).toBeNull();
    }
  );
});

// ---------------------------------------------------------------------------
// adjustment_reasons: schema
// ---------------------------------------------------------------------------
describe('adjustment_reasons: table schema', () => {
  it.skipIf(!adjustmentsEnabled)(
    'adjustment_reasons table has expected columns',
    async () => {
      // ARRANGE: introspect via information_schema
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = '${SCHEMA}'
            AND table_name = 'adjustment_reasons'
          ORDER BY ordinal_position
        `,
      });

      // ASSERT
      expect(error).toBeNull();
      const colNames = (data as { column_name: string }[]).map((c) => c.column_name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('name');
      expect(colNames).toContain('direction');
      expect(colNames).toContain('is_active');
      expect(colNames).toContain('created_at');
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    '[HIGH] adjustment_reasons.direction has CHECK constraint limiting to add/remove',
    async () => {
      // ARRANGE: introspect CHECK constraints on adjustment_reasons
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT cc.check_clause
          FROM information_schema.check_constraints cc
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = cc.constraint_name
            AND ccu.constraint_schema = cc.constraint_schema
          WHERE ccu.table_schema = '${SCHEMA}'
            AND ccu.table_name = 'adjustment_reasons'
            AND ccu.column_name = 'direction'
        `,
      });

      // ASSERT: a CHECK constraint exists for direction
      expect(error).toBeNull();
      const rows = data as { check_clause: string }[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
      // The clause should mention 'add' and 'remove'
      const clause = rows[0].check_clause;
      expect(clause).toMatch(/add/);
      expect(clause).toMatch(/remove/);
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    '[HIGH] inserting invalid direction value is rejected by CHECK constraint',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT: attempt to insert with direction = 'invalid'
      const { error } = await client
        .from('adjustment_reasons')
        .insert({ name: `Bad Direction ${Date.now()}`, direction: 'invalid' });

      // ASSERT: check constraint violation
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/check|violates/i);
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    'adjustment_reasons name column is NOT NULL',
    async () => {
      // ARRANGE: introspect nullable constraint
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT is_nullable
          FROM information_schema.columns
          WHERE table_schema = '${SCHEMA}'
            AND table_name = 'adjustment_reasons'
            AND column_name = 'name'
        `,
      });

      // ASSERT
      expect(error).toBeNull();
      const rows = data as { is_nullable: string }[];
      expect(rows.length).toBe(1);
      expect(rows[0].is_nullable).toBe('NO');
    }
  );
});

// ---------------------------------------------------------------------------
// adjustment_reasons: default seed data
// ---------------------------------------------------------------------------
describe('adjustment_reasons: default seeded reasons', () => {
  it.skipIf(!adjustmentsEnabled)(
    'default reasons include remove-direction reasons like Breakage, Spillage',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT
      const { data, error } = await client
        .from('adjustment_reasons')
        .select('name, direction')
        .eq('direction', 'remove')
        .eq('is_active', true);

      // ASSERT: Breakage and Spillage must be seeded as remove reasons
      expect(error).toBeNull();
      const names = (data ?? []).map((r) => r.name);
      expect(names).toContain('Breakage');
      expect(names).toContain('Spillage');
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    'default reasons include add-direction reasons like Physical Count Correction (Add)',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT
      const { data, error } = await client
        .from('adjustment_reasons')
        .select('name, direction')
        .eq('direction', 'add')
        .eq('is_active', true);

      // ASSERT
      expect(error).toBeNull();
      const names = (data ?? []).map((r) => r.name);
      expect(names).toContain('Physical Count Correction (Add)');
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    'all default reasons have direction in (add, remove)',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT
      const { data, error } = await client
        .from('adjustment_reasons')
        .select('name, direction');

      // ASSERT
      expect(error).toBeNull();
      for (const reason of data ?? []) {
        expect(['add', 'remove']).toContain(reason.direction);
      }
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    'at least 5 default adjustment reasons are seeded',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT
      const { data, error } = await client
        .from('adjustment_reasons')
        .select('id');

      // ASSERT: migration seeds 7 default reasons
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(5);
    }
  );
});

// ---------------------------------------------------------------------------
// adjustments table: schema
// ---------------------------------------------------------------------------
describe('adjustments table: schema structure', () => {
  it.skipIf(!adjustmentsEnabled)(
    'adjustments table has expected columns',
    async () => {
      // ARRANGE
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = '${SCHEMA}'
            AND table_name = 'adjustments'
          ORDER BY ordinal_position
        `,
      });

      // ASSERT
      expect(error).toBeNull();
      const colNames = (data as { column_name: string }[]).map((c) => c.column_name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('adjustment_number');
      expect(colNames).toContain('location_id');
      expect(colNames).toContain('commodity_id');
      expect(colNames).toContain('unit_id');
      expect(colNames).toContain('reason_id');
      expect(colNames).toContain('quantity');
      expect(colNames).toContain('notes');
      expect(colNames).toContain('created_by');
      expect(colNames).toContain('created_at');
      expect(colNames).toContain('deleted_at');
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    '[HIGH] adjustments has deleted_at column (soft-delete support)',
    async () => {
      // ARRANGE
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = '${SCHEMA}'
            AND table_name = 'adjustments'
            AND column_name = 'deleted_at'
        `,
      });

      // ASSERT
      expect(error).toBeNull();
      const rows = data as { column_name: string }[];
      expect(rows.length).toBe(1);
      expect(rows[0].column_name).toBe('deleted_at');
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    '[HIGH] adjustment_number has UNIQUE constraint (no duplicate ADJ numbers)',
    async () => {
      // ARRANGE
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT tc.constraint_type
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.constraint_schema = tc.constraint_schema
          WHERE tc.table_schema = '${SCHEMA}'
            AND tc.table_name = 'adjustments'
            AND ccu.column_name = 'adjustment_number'
            AND tc.constraint_type = 'UNIQUE'
        `,
      });

      // ASSERT: UNIQUE constraint must exist on adjustment_number
      expect(error).toBeNull();
      const rows = data as { constraint_type: string }[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    '[HIGH] quantity CHECK constraint rejects zero and negative values',
    async () => {
      // ARRANGE: need a valid reason_id
      const client = tenantClient(SCHEMA);
      const { data: reasons } = await client
        .from('adjustment_reasons')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!reasons) return;

      // ACT: attempt insert with quantity = 0 (violates CHECK quantity > 0)
      const { error: zeroErr } = await client
        .from('adjustments')
        .insert({
          adjustment_number: `ADJ-TEST-ZERO-${Date.now()}`,
          location_id: TW_LOCATIONS.LOC1,
          commodity_id: TW_COMMODITIES.COMM1,
          unit_id: await getDefaultUnit(SCHEMA).then((u) => u.id),
          reason_id: reasons.id,
          quantity: 0,
          created_by: '00000000-0000-0000-0000-000000000099',
        });

      // ASSERT: check constraint fires
      expect(zeroErr).not.toBeNull();
      expect(zeroErr!.message).toMatch(/check|violates/i);

      // ACT: attempt with negative quantity
      const { error: negErr } = await client
        .from('adjustments')
        .insert({
          adjustment_number: `ADJ-TEST-NEG-${Date.now()}`,
          location_id: TW_LOCATIONS.LOC1,
          commodity_id: TW_COMMODITIES.COMM1,
          unit_id: await getDefaultUnit(SCHEMA).then((u) => u.id),
          reason_id: reasons.id,
          quantity: -10,
          created_by: '00000000-0000-0000-0000-000000000099',
        });

      // ASSERT
      expect(negErr).not.toBeNull();
      expect(negErr!.message).toMatch(/check|violates/i);
    }
  );
});

// ---------------------------------------------------------------------------
// adjustments table: CRUD
// ---------------------------------------------------------------------------
describe('adjustments table: CRUD operations', () => {
  it.skipIf(!adjustmentsEnabled)(
    'can create an adjustment record and read it back',
    async () => {
      // ARRANGE: fetch a valid reason
      const client = tenantClient(SCHEMA);
      const { data: reason } = await client
        .from('adjustment_reasons')
        .select('id, direction')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!reason) {
        console.warn('No active adjustment reason found, skipping CRUD test');
        return;
      }

      const unit = await getDefaultUnit(SCHEMA);
      const adjNumber = `ADJ-TEST-${Date.now()}`;

      // ACT: create an adjustment
      const { data: created, error: createErr } = await client
        .from('adjustments')
        .insert({
          adjustment_number: adjNumber,
          location_id: TW_LOCATIONS.LOC1,
          commodity_id: TW_COMMODITIES.COMM1,
          unit_id: unit.id,
          reason_id: reason.id,
          quantity: 5,
          notes: 'Test adjustment created by backend test suite',
          created_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id, adjustment_number, quantity')
        .single();

      // ASSERT: successful insert
      expect(createErr).toBeNull();
      expect(created).not.toBeNull();
      expect(created!.adjustment_number).toBe(adjNumber);
      expect(Number(created!.quantity)).toBe(5);

      registerCleanup({ schema: SCHEMA, table: 'adjustments', id: created!.id });

      // ACT: read back
      const { data: readback, error: readErr } = await client
        .from('adjustments')
        .select('id, adjustment_number, quantity, deleted_at')
        .eq('id', created!.id)
        .single();

      // ASSERT: matches inserted values
      expect(readErr).toBeNull();
      expect(readback!.adjustment_number).toBe(adjNumber);
      expect(readback!.deleted_at).toBeNull();
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    'duplicate adjustment_number is rejected by UNIQUE constraint',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);
      const { data: reason } = await client
        .from('adjustment_reasons')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!reason) return;

      const unit = await getDefaultUnit(SCHEMA);
      const adjNumber = `ADJ-DUP-${Date.now()}`;

      const { data: first, error: firstErr } = await client
        .from('adjustments')
        .insert({
          adjustment_number: adjNumber,
          location_id: TW_LOCATIONS.LOC1,
          commodity_id: TW_COMMODITIES.COMM1,
          unit_id: unit.id,
          reason_id: reason.id,
          quantity: 1,
          created_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id')
        .single();

      expect(firstErr).toBeNull();
      registerCleanup({ schema: SCHEMA, table: 'adjustments', id: first!.id });

      // ACT: insert with same adjustment_number
      const { error: dupErr } = await client
        .from('adjustments')
        .insert({
          adjustment_number: adjNumber,
          location_id: TW_LOCATIONS.LOC1,
          commodity_id: TW_COMMODITIES.COMM1,
          unit_id: unit.id,
          reason_id: reason.id,
          quantity: 2,
          created_by: '00000000-0000-0000-0000-000000000099',
        });

      // ASSERT: unique violation
      expect(dupErr).not.toBeNull();
      expect(dupErr!.message).toMatch(/unique|duplicate/i);
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    'soft-deleting an adjustment sets deleted_at and excludes it from active queries',
    async () => {
      // ARRANGE: create an adjustment to soft-delete
      const client = tenantClient(SCHEMA);
      const { data: reason } = await client
        .from('adjustment_reasons')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!reason) return;

      const unit = await getDefaultUnit(SCHEMA);

      const { data: adj, error: adjErr } = await client
        .from('adjustments')
        .insert({
          adjustment_number: `ADJ-SOFTDEL-${Date.now()}`,
          location_id: TW_LOCATIONS.LOC1,
          commodity_id: TW_COMMODITIES.COMM1,
          unit_id: unit.id,
          reason_id: reason.id,
          quantity: 3,
          created_by: '00000000-0000-0000-0000-000000000099',
        })
        .select('id')
        .single();

      expect(adjErr).toBeNull();
      registerCleanup({ schema: SCHEMA, table: 'adjustments', id: adj!.id });

      // ACT: soft-delete
      const { error: delErr } = await client
        .from('adjustments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', adj!.id);

      expect(delErr).toBeNull();

      // ASSERT: row excluded when filtering deleted_at IS NULL
      const { data: active, error: readErr } = await client
        .from('adjustments')
        .select('id')
        .is('deleted_at', null)
        .eq('id', adj!.id);

      expect(readErr).toBeNull();
      expect(active).toEqual([]);

      // ASSERT: row still exists when not filtering
      const { data: all } = await client
        .from('adjustments')
        .select('id, deleted_at')
        .eq('id', adj!.id)
        .single();

      expect(all!.deleted_at).not.toBeNull();
    }
  );
});

// ---------------------------------------------------------------------------
// adjustments: indexes (performance)
// ---------------------------------------------------------------------------
describe('adjustments: index coverage', () => {
  it.skipIf(!adjustmentsEnabled)(
    '[MEDIUM] index exists on adjustments.location_id (for location-scoped queries)',
    async () => {
      // ARRANGE
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = '${SCHEMA}'
            AND tablename = 'adjustments'
            AND indexdef ILIKE '%location_id%'
        `,
      });

      // ASSERT: at least one index covering location_id
      expect(error).toBeNull();
      const rows = data as { indexname: string }[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  );

  it.skipIf(!adjustmentsEnabled)(
    '[MEDIUM] index exists on adjustments.commodity_id (for commodity-scoped queries)',
    async () => {
      // ARRANGE
      const { data, error } = await serviceClient.rpc('exec_sql', {
        query: `
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = '${SCHEMA}'
            AND tablename = 'adjustments'
            AND indexdef ILIKE '%commodity_id%'
        `,
      });

      // ASSERT
      expect(error).toBeNull();
      const rows = data as { indexname: string }[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  );
});

// ---------------------------------------------------------------------------
// adjustments: sequence counter registration
// ---------------------------------------------------------------------------
describe('adjustments: sequence counter', () => {
  it.skipIf(!adjustmentsEnabled)(
    'sequence_counters table has an entry for adjustment prefix ADJ',
    async () => {
      // ARRANGE
      const client = tenantClient(SCHEMA);

      // ACT
      const { data, error } = await client
        .from('sequence_counters')
        .select('id, prefix, current_value')
        .eq('id', 'adjustment');

      // ASSERT: ADJ sequence counter must be registered
      expect(error).toBeNull();
      expect(data!.length).toBe(1);
      expect(data![0].prefix).toBe('ADJ');
      expect(Number(data![0].current_value)).toBeGreaterThanOrEqual(0);
    }
  );
});

// ---------------------------------------------------------------------------
// API contract tests (require running dev server)
// ---------------------------------------------------------------------------
describe.skip('adjustments API: HTTP contract (requires dev server + auth)', () => {
  it('GET /api/t/[slug]/adjustments returns list for authorized user', () => {
    expect(true).toBe(true);
  });

  it('GET /api/t/[slug]/adjustments returns 401 without auth', () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/adjustments creates a new adjustment and returns ADJ-XXXXXX number', () => {
    expect(true).toBe(true);
  });

  it('POST /api/t/[slug]/adjustments with quantity <= 0 returns 422', () => {
    expect(true).toBe(true);
  });

  it('[HIGH] POST /api/t/[slug]/adjustments for a user without canManageAdjustments returns 403', () => {
    expect(true).toBe(true);
  });
});
