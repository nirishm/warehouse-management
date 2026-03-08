import { createAdminClient } from '@/lib/supabase/admin';

export async function applyLotTrackingMigration(schemaName: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS "${schemaName}".lots (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lot_number          TEXT NOT NULL UNIQUE,
        commodity_id        UUID NOT NULL REFERENCES "${schemaName}".commodities(id),
        source_purchase_id  UUID REFERENCES "${schemaName}".purchases(id),
        received_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
        expiry_date         TIMESTAMPTZ,
        initial_quantity    NUMERIC NOT NULL CHECK (initial_quantity > 0),
        unit_id             UUID NOT NULL REFERENCES "${schemaName}".units(id),
        notes               TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at          TIMESTAMPTZ
      );

      ALTER TABLE "${schemaName}".purchase_items  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES "${schemaName}".lots(id);
      ALTER TABLE "${schemaName}".purchase_items  ADD COLUMN IF NOT EXISTS lot_number TEXT;
      ALTER TABLE "${schemaName}".dispatch_items  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES "${schemaName}".lots(id);
      ALTER TABLE "${schemaName}".dispatch_items  ADD COLUMN IF NOT EXISTS lot_number TEXT;
      ALTER TABLE "${schemaName}".sale_items      ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES "${schemaName}".lots(id);
      ALTER TABLE "${schemaName}".sale_items      ADD COLUMN IF NOT EXISTS lot_number TEXT;

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
          - COALESCE(sold.qty, 0) AS current_quantity
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
      WHERE l.deleted_at IS NULL;
    `,
  });
  if (error) throw new Error(`Lot tracking migration failed: ${error.message}`);
}
