import { createAdminClient } from '@/lib/supabase/admin';

export async function applyAdjustmentsMigration(schemaName: string): Promise<void> {
  const client = createAdminClient();

  // Step 1: Create adjustment_reasons and adjustments tables
  const { error: tableError } = await client.rpc('exec_sql', {
    query: `
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
    `,
  });
  if (tableError) throw new Error(`Adjustments migration failed: ${tableError.message}`);

  // Step 2: Seed default adjustment reasons (idempotent via ON CONFLICT)
  const { error: seedError } = await client.rpc('exec_sql', {
    query: `
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
    `,
  });
  if (seedError) throw new Error(`Adjustments seed failed: ${seedError.message}`);

  // Step 3: Register sequence counter for ADJ prefix
  const { error: seqError } = await client.rpc('exec_sql', {
    query: `
      INSERT INTO "${schemaName}".sequence_counters (id, prefix, current_value)
      VALUES ('adjustment', 'ADJ', 0)
      ON CONFLICT (id) DO NOTHING;
    `,
  });
  if (seqError) throw new Error(`Adjustments sequence setup failed: ${seqError.message}`);

  // Step 4: Rebuild stock_levels VIEW to include adjustments
  const { error: viewError } = await client.rpc('exec_sql', {
    query: buildStockLevelsWithAdjustments(schemaName),
  });
  if (viewError) throw new Error(`Adjustments stock_levels VIEW rebuild failed: ${viewError.message}`);
}

function buildStockLevelsWithAdjustments(schemaName: string): string {
  return `
    CREATE OR REPLACE VIEW "${schemaName}".stock_levels AS
    WITH inbound AS (
        SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
               COALESCE(di.received_quantity, di.sent_quantity) AS quantity
        FROM "${schemaName}".dispatch_items di
        JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
        WHERE d.status = 'received' AND d.deleted_at IS NULL

        UNION ALL

        SELECT pi.commodity_id, p.location_id, pi.unit_id, pi.quantity
        FROM "${schemaName}".purchase_items pi
        JOIN "${schemaName}".purchases p ON p.id = pi.purchase_id
        WHERE p.status = 'received' AND p.deleted_at IS NULL

        UNION ALL

        SELECT ri.commodity_id, r.location_id, ri.unit_id, ri.quantity
        FROM "${schemaName}".return_items ri
        JOIN "${schemaName}".returns r ON r.id = ri.return_id
        WHERE r.return_type = 'sale_return' AND r.status = 'confirmed' AND r.deleted_at IS NULL

        UNION ALL

        SELECT a.commodity_id, a.location_id, a.unit_id, a.quantity
        FROM "${schemaName}".adjustments a
        JOIN "${schemaName}".adjustment_reasons ar ON ar.id = a.reason_id
        WHERE ar.direction = 'add' AND a.deleted_at IS NULL
    ),
    outbound AS (
        SELECT di.commodity_id, d.origin_location_id AS location_id, di.unit_id,
               di.sent_quantity AS quantity
        FROM "${schemaName}".dispatch_items di
        JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
        WHERE d.status IN ('dispatched','in_transit','received') AND d.deleted_at IS NULL

        UNION ALL

        SELECT si.commodity_id, s.location_id, si.unit_id, si.quantity
        FROM "${schemaName}".sale_items si
        JOIN "${schemaName}".sales s ON s.id = si.sale_id
        WHERE s.status IN ('confirmed','dispatched') AND s.deleted_at IS NULL

        UNION ALL

        SELECT ri.commodity_id, r.location_id, ri.unit_id, ri.quantity
        FROM "${schemaName}".return_items ri
        JOIN "${schemaName}".returns r ON r.id = ri.return_id
        WHERE r.return_type = 'purchase_return' AND r.status = 'confirmed' AND r.deleted_at IS NULL

        UNION ALL

        SELECT a.commodity_id, a.location_id, a.unit_id, a.quantity
        FROM "${schemaName}".adjustments a
        JOIN "${schemaName}".adjustment_reasons ar ON ar.id = a.reason_id
        WHERE ar.direction = 'remove' AND a.deleted_at IS NULL
    ),
    in_transit AS (
        SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
               di.sent_quantity AS quantity
        FROM "${schemaName}".dispatch_items di
        JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
        WHERE d.status IN ('dispatched','in_transit') AND d.deleted_at IS NULL
    )
    SELECT
        COALESCE(i.commodity_id, o.commodity_id) AS commodity_id,
        COALESCE(i.location_id, o.location_id) AS location_id,
        COALESCE(i.unit_id, o.unit_id) AS unit_id,
        COALESCE(i.total_in, 0) AS total_in,
        COALESCE(o.total_out, 0) AS total_out,
        COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0) AS current_stock,
        COALESCE(t.in_transit, 0) AS in_transit
    FROM (
        SELECT commodity_id, location_id, unit_id, SUM(quantity) AS total_in
        FROM inbound GROUP BY commodity_id, location_id, unit_id
    ) i
    FULL OUTER JOIN (
        SELECT commodity_id, location_id, unit_id, SUM(quantity) AS total_out
        FROM outbound GROUP BY commodity_id, location_id, unit_id
    ) o ON i.commodity_id = o.commodity_id AND i.location_id = o.location_id AND i.unit_id = o.unit_id
    LEFT JOIN (
        SELECT commodity_id, location_id, unit_id, SUM(quantity) AS in_transit
        FROM in_transit GROUP BY commodity_id, location_id, unit_id
    ) t ON COALESCE(i.commodity_id, o.commodity_id) = t.commodity_id
       AND COALESCE(i.location_id, o.location_id) = t.location_id
       AND COALESCE(i.unit_id, o.unit_id) = t.unit_id;
  `;
}
