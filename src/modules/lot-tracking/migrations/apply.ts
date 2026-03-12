import { execSql } from '@/core/db/exec-sql';
import { buildLotStockLevelsViewSQL } from '@/modules/returns/migrations/apply';

export async function applyLotTrackingMigration(schemaName: string): Promise<void> {
  // Step 1: Create lots table + add lot columns to item tables
  await execSql(`
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
    `);

  // Step 2: Check if returns table exists to include return adjustments in the VIEW
  const returnsCheck = await execSql<{ table_exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = '${schemaName}' AND table_name = 'returns'
      ) AS table_exists
    `);

  const returnsExist = returnsCheck?.[0]?.table_exists === true;

  // Step 3: Create lot_stock_levels VIEW (with or without return adjustments)
  await execSql(buildLotStockLevelsViewSQL(schemaName, returnsExist));
}
