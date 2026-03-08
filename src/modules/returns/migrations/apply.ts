import { createAdminClient } from '@/lib/supabase/admin';

export async function applyReturnsMigration(schemaName: string): Promise<void> {
  const client = createAdminClient();

  // Step 1: Create returns tables
  const { error: tableError } = await client.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS "${schemaName}".returns (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number    TEXT NOT NULL UNIQUE,
        return_type      TEXT NOT NULL CHECK (return_type IN ('purchase_return','sale_return')),
        original_txn_id  UUID NOT NULL,
        location_id      UUID NOT NULL REFERENCES "${schemaName}".locations(id),
        contact_id       UUID REFERENCES "${schemaName}".contacts(id),
        return_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
        reason           TEXT,
        status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','confirmed','cancelled')),
        notes            TEXT,
        created_by       UUID NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at       TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "${schemaName}".return_items (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id    UUID NOT NULL REFERENCES "${schemaName}".returns(id) ON DELETE CASCADE,
        commodity_id UUID NOT NULL REFERENCES "${schemaName}".commodities(id),
        unit_id      UUID NOT NULL REFERENCES "${schemaName}".units(id),
        quantity     NUMERIC NOT NULL CHECK (quantity > 0),
        lot_id       UUID,
        notes        TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_returns_type_txn
        ON "${schemaName}".returns(return_type, original_txn_id)
        WHERE deleted_at IS NULL;

      -- RLS + security for returns tables (match base schema pattern)
      ALTER TABLE "${schemaName}".returns ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "${schemaName}".return_items ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".returns
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".return_items
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });
  if (tableError) throw new Error(`Returns migration failed: ${tableError.message}`);

  // Step 2: Rebuild stock_levels VIEW to include returns
  // Sale returns = inbound (goods come back from customer)
  // Purchase returns = outbound (goods go back to supplier)
  const { error: viewError } = await client.rpc('exec_sql', {
    query: `
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
    `,
  });
  if (viewError) throw new Error(`Returns stock_levels VIEW rebuild failed: ${viewError.message}`);

  // Step 3: If lot-tracking tables exist, rebuild lot_stock_levels with returns
  const { data: lotsCheck } = await client.rpc('exec_sql', {
    query: `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = '${schemaName}' AND table_name = 'lots'
      ) AS table_exists
    `,
  });

  const lotsExist = (lotsCheck as unknown as Array<{ table_exists: boolean }>)?.[0]?.table_exists === true;
  if (lotsExist) {
    const { error: lotViewError } = await client.rpc('exec_sql', {
      query: buildLotStockLevelsViewSQL(schemaName, true),
    });
    if (lotViewError) throw new Error(`Returns lot_stock_levels VIEW rebuild failed: ${lotViewError.message}`);
  }
}

/**
 * Builds the lot_stock_levels VIEW SQL, optionally including return adjustments.
 * Shared by both returns and lot-tracking migrations.
 */
export function buildLotStockLevelsViewSQL(schemaName: string, includeReturns: boolean): string {
  const returnJoins = includeReturns
    ? `
      LEFT JOIN (
        SELECT ri.lot_id, SUM(ri.quantity) AS qty
        FROM "${schemaName}".return_items ri
        JOIN "${schemaName}".returns r ON r.id = ri.return_id
        WHERE r.return_type = 'purchase_return' AND r.status = 'confirmed' AND r.deleted_at IS NULL
          AND ri.lot_id IS NOT NULL
        GROUP BY ri.lot_id
      ) purchase_returned ON purchase_returned.lot_id = l.id
      LEFT JOIN (
        SELECT ri.lot_id, SUM(ri.quantity) AS qty
        FROM "${schemaName}".return_items ri
        JOIN "${schemaName}".returns r ON r.id = ri.return_id
        WHERE r.return_type = 'sale_return' AND r.status = 'confirmed' AND r.deleted_at IS NULL
          AND ri.lot_id IS NOT NULL
        GROUP BY ri.lot_id
      ) sale_returned ON sale_returned.lot_id = l.id`
    : '';

  const returnCalc = includeReturns
    ? '- COALESCE(purchase_returned.qty, 0) + COALESCE(sale_returned.qty, 0)'
    : '';

  return `
    CREATE OR REPLACE VIEW "${schemaName}".lot_stock_levels AS
    SELECT
      l.id AS lot_id,
      l.lot_number,
      l.commodity_id,
      l.unit_id,
      l.received_date,
      l.expiry_date,
      l.initial_quantity,
      COALESCE(l.initial_quantity, 0)
        - COALESCE(dispatched.qty, 0)
        - COALESCE(sold.qty, 0)
        ${returnCalc} AS current_quantity
    FROM "${schemaName}".lots l
    LEFT JOIN (
      SELECT di.lot_id, SUM(di.sent_quantity) AS qty
      FROM "${schemaName}".dispatch_items di
      JOIN "${schemaName}".dispatches d ON d.id = di.dispatch_id
      WHERE d.status IN ('dispatched','in_transit','received') AND d.deleted_at IS NULL
        AND di.lot_id IS NOT NULL
      GROUP BY di.lot_id
    ) dispatched ON dispatched.lot_id = l.id
    LEFT JOIN (
      SELECT si.lot_id, SUM(si.quantity) AS qty
      FROM "${schemaName}".sale_items si
      JOIN "${schemaName}".sales s ON s.id = si.sale_id
      WHERE s.status IN ('confirmed','dispatched') AND s.deleted_at IS NULL
        AND si.lot_id IS NOT NULL
      GROUP BY si.lot_id
    ) sold ON sold.lot_id = l.id
    ${returnJoins}
    WHERE l.deleted_at IS NULL;
  `;
}
