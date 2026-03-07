import { createAdminClient } from '@/lib/supabase/admin';

export async function applyReturnsMigration(schemaName: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.rpc('exec_sql', {
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
    `,
  });
  if (error) throw new Error(`Returns migration failed: ${error.message}`);
}
