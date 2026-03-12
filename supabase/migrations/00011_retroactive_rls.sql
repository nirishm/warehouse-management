-- Retroactive RLS for module tables created before RLS was added to migrations.
-- Runs once per deploy; ALTER TABLE IF NOT EXISTS ... ENABLE ROW LEVEL SECURITY
-- is idempotent (no-op if already enabled).

CREATE OR REPLACE FUNCTION public.apply_retroactive_module_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sch RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY['payments', 'stock_alert_thresholds', 'document_config'];
BEGIN
  FOR sch IN SELECT schema_name FROM public.tenants LOOP
    FOREACH tbl IN ARRAY tables LOOP
      -- Only if table exists in this tenant schema
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = sch.schema_name AND table_name = tbl
      ) THEN
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', sch.schema_name, tbl);
        BEGIN
          EXECUTE format(
            'CREATE POLICY "service_role_only" ON %I.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false)',
            sch.schema_name, tbl
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Execute immediately
SELECT public.apply_retroactive_module_rls();

-- Clean up — function is no longer needed
DROP FUNCTION public.apply_retroactive_module_rls();
