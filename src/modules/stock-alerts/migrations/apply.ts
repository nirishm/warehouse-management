import { createAdminClient } from '@/lib/supabase/admin';

export async function applyStockAlertsMigration(schemaName: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS "${schemaName}".stock_alert_thresholds (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        commodity_id  UUID NOT NULL REFERENCES "${schemaName}".commodities(id),
        location_id   UUID NOT NULL REFERENCES "${schemaName}".locations(id),
        unit_id       UUID NOT NULL REFERENCES "${schemaName}".units(id),
        min_stock     NUMERIC NOT NULL DEFAULT 0,
        reorder_point NUMERIC NOT NULL DEFAULT 0,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_by    UUID NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(commodity_id, location_id, unit_id)
      );

      ALTER TABLE "${schemaName}".stock_alert_thresholds ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".stock_alert_thresholds
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });
  if (error) throw new Error(`Stock alerts migration failed: ${error.message}`);
}
