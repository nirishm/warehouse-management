import { createAdminClient } from '@/lib/supabase/admin';

export async function applyDocumentGenMigration(schemaName: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS "${schemaName}".document_config (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name     TEXT NOT NULL DEFAULT '',
        company_address  TEXT,
        company_phone    TEXT,
        company_email    TEXT,
        company_gstin    TEXT,
        logo_url         TEXT,
        footer_text      TEXT,
        updated_by       UUID,
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO "${schemaName}".document_config (company_name)
      SELECT '' WHERE NOT EXISTS (SELECT 1 FROM "${schemaName}".document_config);

      ALTER TABLE "${schemaName}".document_config ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".document_config
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });
  if (error) throw new Error(`Document gen migration failed: ${error.message}`);
}
