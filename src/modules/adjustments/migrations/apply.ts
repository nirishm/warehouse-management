import { execSql } from '@/core/db/exec-sql';
import { rebuildStockLevelsView } from '@/core/db/stock-levels-view';

export async function applyAdjustmentsMigration(schemaName: string): Promise<void> {
  // Step 1: Create adjustment_reasons and adjustments tables
  await execSql(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".adjustment_reasons (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        direction   TEXT NOT NULL CHECK (direction IN ('add', 'remove')),
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "${schemaName}".adjustments (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        adjustment_number TEXT NOT NULL UNIQUE,
        location_id       UUID NOT NULL REFERENCES "${schemaName}".locations(id),
        commodity_id      UUID NOT NULL REFERENCES "${schemaName}".commodities(id),
        unit_id           UUID NOT NULL REFERENCES "${schemaName}".units(id),
        reason_id         UUID NOT NULL REFERENCES "${schemaName}".adjustment_reasons(id),
        quantity          NUMERIC NOT NULL CHECK (quantity > 0),
        notes             TEXT,
        created_by        UUID NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at        TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_adjustments_location
        ON "${schemaName}".adjustments(location_id)
        WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_adjustments_commodity
        ON "${schemaName}".adjustments(commodity_id)
        WHERE deleted_at IS NULL;

      -- RLS + security (match base schema pattern)
      ALTER TABLE "${schemaName}".adjustment_reasons ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "${schemaName}".adjustments ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".adjustment_reasons
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".adjustments
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

  // Step 2: Seed default adjustment reasons (idempotent via ON CONFLICT)
  await execSql(`
      -- Add unique constraint for idempotent seeding
      DO $$ BEGIN
        ALTER TABLE "${schemaName}".adjustment_reasons
          ADD CONSTRAINT adjustment_reasons_name_key UNIQUE (name);
      EXCEPTION WHEN duplicate_table THEN NULL;
               WHEN duplicate_object THEN NULL;
      END $$;

      INSERT INTO "${schemaName}".adjustment_reasons (name, direction) VALUES
        ('Breakage', 'remove'),
        ('Spillage', 'remove'),
        ('Pest Damage', 'remove'),
        ('Physical Count Correction (Add)', 'add'),
        ('Physical Count Correction (Remove)', 'remove'),
        ('Other (Add)', 'add'),
        ('Other (Remove)', 'remove')
      ON CONFLICT (name) DO NOTHING;
    `);

  // Step 3: Register sequence counter for ADJ prefix
  await execSql(`
      INSERT INTO "${schemaName}".sequence_counters (id, prefix, current_value)
      VALUES ('adjustment', 'ADJ', 0)
      ON CONFLICT (id) DO NOTHING;
    `);

  // Step 4: Rebuild stock_levels VIEW to include adjustments.
  // Adjustments depends on returns (Task 6), so returns tables are always present here.
  // We force both flags true since the tables were just created / are required dependencies.
  await rebuildStockLevelsView(schemaName, { includeReturns: true, includeAdjustments: true });
}
