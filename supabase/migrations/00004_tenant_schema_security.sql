-- Applies RLS + REVOKE + performance indexes + CHECK constraint to all existing tenant schemas
DO $$
DECLARE
  r RECORD;
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'locations','commodities','units','contacts',
    'dispatches','dispatch_items',
    'purchases','purchase_items',
    'sales','sale_items',
    'user_profiles','user_locations',
    'custom_field_definitions','audit_log','sequence_counters'
  ];
BEGIN
  FOR r IN SELECT schema_name FROM public.tenants LOOP
    -- Revoke public/anon/authenticated access to schema
    EXECUTE format('REVOKE USAGE ON SCHEMA %I FROM anon, authenticated', r.schema_name);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM anon, authenticated', r.schema_name);

    -- Enable RLS + deny-all on each table
    FOREACH tbl IN ARRAY tables LOOP
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = r.schema_name AND table_name = tbl
      ) THEN
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, tbl);
        -- Drop existing policy if it already exists (idempotent)
        EXECUTE format(
          'DROP POLICY IF EXISTS "service_role_only" ON %I.%I',
          r.schema_name, tbl
        );
        -- Service role bypasses RLS by default; deny everyone else
        EXECUTE format(
          'CREATE POLICY "service_role_only" ON %I.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false)',
          r.schema_name, tbl
        );
      END IF;
    END LOOP;

    -- Add missing indexes (idempotent)
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_purchases_status ON %I.purchases(status) WHERE deleted_at IS NULL', r.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_sales_status ON %I.sales(status) WHERE deleted_at IS NULL', r.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dispatch_items_commodity ON %I.dispatch_items(commodity_id)', r.schema_name);

    -- Add CHECK constraint on received_quantity (idempotent)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = r.schema_name
        AND table_name = 'dispatch_items'
        AND constraint_name = 'chk_received_not_exceed_sent'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.dispatch_items ADD CONSTRAINT chk_received_not_exceed_sent CHECK (received_quantity IS NULL OR received_quantity <= sent_quantity)',
        r.schema_name
      );
    END IF;
  END LOOP;
END $$;
