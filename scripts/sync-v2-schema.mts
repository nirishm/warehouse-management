/**
 * Sync Supabase DB from v1 schema → v2 schema.
 * Safe to run: uses IF NOT EXISTS / IF EXISTS everywhere.
 * Preserves super_admins and user data.
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '');

async function run() {
  console.log('=== V1 → V2 Schema Sync ===\n');

  // ── Step 1: Alter existing tables to match v2 ──────────────────

  console.log('1. Altering existing tables...');

  // tenants: drop v1-only columns, convert enabled_modules from text[] to jsonb
  await sql.unsafe(`
    ALTER TABLE tenants
      DROP COLUMN IF EXISTS schema_name,
      DROP COLUMN IF EXISTS billing_notes,
      DROP COLUMN IF EXISTS max_users,
      DROP COLUMN IF EXISTS max_locations;
  `);
  // Convert enabled_modules from text[] to jsonb
  // Must drop default first — PG can't auto-cast the old text[] default to jsonb
  await sql.unsafe(`
    ALTER TABLE tenants
      ALTER COLUMN enabled_modules DROP DEFAULT;
  `);
  await sql.unsafe(`
    ALTER TABLE tenants
      ALTER COLUMN enabled_modules TYPE jsonb USING to_jsonb(enabled_modules);
  `);
  await sql.unsafe(`
    ALTER TABLE tenants
      ALTER COLUMN enabled_modules SET DEFAULT '["inventory"]'::jsonb;
  `);
  // settings: make nullable (v2 has no NOT NULL, no default)
  await sql.unsafe(`
    ALTER TABLE tenants
      ALTER COLUMN settings DROP NOT NULL,
      ALTER COLUMN settings DROP DEFAULT;
  `);
  console.log('  ✓ tenants table updated');

  // access_requests: add tenant_id FK, drop v1-only columns
  await sql.unsafe(`
    ALTER TABLE access_requests
      DROP COLUMN IF EXISTS full_name,
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS updated_at;
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'access_requests' AND column_name = 'tenant_id'
      ) THEN
        ALTER TABLE access_requests ADD COLUMN tenant_id uuid REFERENCES tenants(id);
      END IF;
    END $$;
  `);
  console.log('  ✓ access_requests table updated');

  // super_admins: drop created_at (v2 doesn't have it), add unique constraint
  await sql.unsafe(`
    ALTER TABLE super_admins DROP COLUMN IF EXISTS created_at;
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'super_admins_user_id_unique'
      ) THEN
        ALTER TABLE super_admins ADD CONSTRAINT super_admins_user_id_unique UNIQUE (user_id);
      END IF;
    END $$;
  `);
  console.log('  ✓ super_admins table updated');

  // user_tenants: change role default from 'employee' to 'viewer', drop created_at
  await sql.unsafe(`
    ALTER TABLE user_tenants
      ALTER COLUMN role SET DEFAULT 'viewer';
  `);
  await sql.unsafe(`
    ALTER TABLE user_tenants DROP COLUMN IF EXISTS created_at;
  `);
  // Add FK + unique index if missing
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_tenants_tenant_id_tenants_id_fk'
      ) THEN
        ALTER TABLE user_tenants ADD CONSTRAINT user_tenants_tenant_id_tenants_id_fk
          FOREIGN KEY (tenant_id) REFERENCES tenants(id);
      END IF;
    END $$;
  `);
  console.log('  ✓ user_tenants table updated');

  // ── Step 2: Drop v1-only tables ────────────────────────────────

  console.log('\n2. Dropping v1-only tables...');
  await sql.unsafe(`DROP TABLE IF EXISTS tenant_modules CASCADE;`);
  await sql.unsafe(`DROP TABLE IF EXISTS waitlist CASCADE;`);
  console.log('  ✓ tenant_modules, waitlist dropped');

  // ── Step 3: Create all v2 tables (IF NOT EXISTS) ──────────────

  console.log('\n3. Creating v2 tables...');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS units (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      abbreviation text NOT NULL,
      type text NOT NULL,
      base_unit_id uuid,
      conversion_factor numeric,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ units');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      code text,
      sku text,
      description text,
      category text,
      type text NOT NULL DEFAULT 'goods',
      default_unit_id uuid,
      purchase_price numeric,
      selling_price numeric,
      hsn_code text,
      image_url text,
      tags text[],
      reorder_level integer,
      shelf_life_days integer,
      is_active boolean NOT NULL DEFAULT true,
      custom_fields jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ items');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS locations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      code text,
      type text NOT NULL DEFAULT 'warehouse',
      address text,
      geo_point jsonb,
      capacity integer,
      parent_location_id uuid,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ locations');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS contacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      name text NOT NULL,
      type text NOT NULL,
      email text,
      phone text,
      gst_number text,
      address text,
      credit_limit numeric,
      payment_terms integer,
      custom_fields jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ contacts');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      entity_type text NOT NULL,
      field_name text NOT NULL,
      field_type text NOT NULL,
      options jsonb,
      is_required boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('  ✓ custom_field_definitions');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      sale_number text,
      contact_id uuid,
      location_id uuid,
      status text NOT NULL DEFAULT 'draft',
      shipping_address text,
      tracking_number text,
      custom_status text,
      notes text,
      custom_fields jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ sales');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id uuid NOT NULL,
      item_id uuid NOT NULL,
      unit_id uuid,
      quantity numeric NOT NULL,
      unit_price numeric NOT NULL
    );
  `);
  console.log('  ✓ sale_items');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS purchases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      purchase_number text,
      contact_id uuid,
      location_id uuid,
      status text NOT NULL DEFAULT 'draft',
      expected_delivery_date timestamptz,
      notes text,
      custom_fields jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ purchases');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_id uuid NOT NULL,
      item_id uuid NOT NULL,
      unit_id uuid,
      quantity numeric NOT NULL,
      unit_price numeric NOT NULL
    );
  `);
  console.log('  ✓ purchase_items');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS transfers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      transfer_number text,
      origin_location_id uuid,
      dest_location_id uuid,
      status text NOT NULL DEFAULT 'draft',
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ transfers');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS transfer_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      transfer_id uuid NOT NULL,
      item_id uuid NOT NULL,
      unit_id uuid,
      sent_qty numeric NOT NULL,
      received_qty numeric,
      shortage numeric
    );
  `);
  console.log('  ✓ transfer_items');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS adjustments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      adjustment_number text,
      location_id uuid,
      reason text,
      type text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ adjustments');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS adjustment_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      adjustment_id uuid NOT NULL,
      item_id uuid NOT NULL,
      unit_id uuid,
      qty_change numeric,
      value_change numeric
    );
  `);
  console.log('  ✓ adjustment_items');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS user_locations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      tenant_id uuid NOT NULL,
      location_id uuid NOT NULL
    );
  `);
  console.log('  ✓ user_locations');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      user_id uuid NOT NULL,
      display_name text,
      phone text,
      permissions jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('  ✓ user_profiles');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      user_id uuid,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid NOT NULL,
      old_data jsonb,
      new_data jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('  ✓ audit_log');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS sequence_counters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      sequence_id text NOT NULL,
      current_value integer NOT NULL DEFAULT 0,
      prefix text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('  ✓ sequence_counters');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS alert_thresholds (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      item_id uuid NOT NULL,
      location_id uuid,
      min_quantity numeric NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('  ✓ alert_thresholds');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      payment_number text,
      type text NOT NULL,
      reference_id uuid,
      amount numeric NOT NULL,
      payment_method text,
      payment_date timestamptz,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );
  `);
  console.log('  ✓ payments');

  // ── Step 4: Foreign keys ───────────────────────────────────────

  console.log('\n4. Adding foreign keys...');

  const fks = [
    ['items', 'items_default_unit_id_units_id_fk', 'default_unit_id', 'units', 'id'],
    ['sale_items', 'sale_items_sale_id_sales_id_fk', 'sale_id', 'sales', 'id'],
    ['sale_items', 'sale_items_item_id_items_id_fk', 'item_id', 'items', 'id'],
    ['sale_items', 'sale_items_unit_id_units_id_fk', 'unit_id', 'units', 'id'],
    ['sales', 'sales_contact_id_contacts_id_fk', 'contact_id', 'contacts', 'id'],
    ['sales', 'sales_location_id_locations_id_fk', 'location_id', 'locations', 'id'],
    ['purchase_items', 'purchase_items_purchase_id_purchases_id_fk', 'purchase_id', 'purchases', 'id'],
    ['purchase_items', 'purchase_items_item_id_items_id_fk', 'item_id', 'items', 'id'],
    ['purchase_items', 'purchase_items_unit_id_units_id_fk', 'unit_id', 'units', 'id'],
    ['purchases', 'purchases_contact_id_contacts_id_fk', 'contact_id', 'contacts', 'id'],
    ['purchases', 'purchases_location_id_locations_id_fk', 'location_id', 'locations', 'id'],
    ['transfer_items', 'transfer_items_transfer_id_transfers_id_fk', 'transfer_id', 'transfers', 'id'],
    ['transfer_items', 'transfer_items_item_id_items_id_fk', 'item_id', 'items', 'id'],
    ['transfer_items', 'transfer_items_unit_id_units_id_fk', 'unit_id', 'units', 'id'],
    ['transfers', 'transfers_origin_location_id_locations_id_fk', 'origin_location_id', 'locations', 'id'],
    ['transfers', 'transfers_dest_location_id_locations_id_fk', 'dest_location_id', 'locations', 'id'],
    ['adjustment_items', 'adjustment_items_adjustment_id_adjustments_id_fk', 'adjustment_id', 'adjustments', 'id'],
    ['adjustment_items', 'adjustment_items_item_id_items_id_fk', 'item_id', 'items', 'id'],
    ['adjustment_items', 'adjustment_items_unit_id_units_id_fk', 'unit_id', 'units', 'id'],
    ['adjustments', 'adjustments_location_id_locations_id_fk', 'location_id', 'locations', 'id'],
    ['user_locations', 'user_locations_location_id_locations_id_fk', 'location_id', 'locations', 'id'],
    ['alert_thresholds', 'alert_thresholds_item_id_items_id_fk', 'item_id', 'items', 'id'],
    ['alert_thresholds', 'alert_thresholds_location_id_locations_id_fk', 'location_id', 'locations', 'id'],
  ];

  for (const [table, name, col, refTable, refCol] of fks) {
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
          ALTER TABLE "${table}" ADD CONSTRAINT "${name}"
            FOREIGN KEY ("${col}") REFERENCES "${refTable}"("${refCol}");
        END IF;
      END $$;
    `);
  }
  // Self-referential FKs
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'locations_parent_location_id_fk') THEN
        ALTER TABLE locations ADD CONSTRAINT locations_parent_location_id_fk
          FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'units_base_unit_id_fk') THEN
        ALTER TABLE units ADD CONSTRAINT units_base_unit_id_fk
          FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  console.log('  ✓ all foreign keys added');

  // ── Step 5: Indexes ────────────────────────────────────────────

  console.log('\n5. Creating indexes...');

  const indexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_tenants_user_tenant_unique" ON "user_tenants" ("user_id","tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "units_tenant_id_idx" ON "units" ("tenant_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "items_tenant_code_unique" ON "items" ("tenant_id","code") WHERE "deleted_at" IS NULL`,
    `CREATE INDEX IF NOT EXISTS "items_tenant_id_idx" ON "items" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "locations_tenant_id_idx" ON "locations" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "contacts_tenant_id_idx" ON "contacts" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "custom_field_definitions_tenant_id_idx" ON "custom_field_definitions" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items" ("sale_id")`,
    `CREATE INDEX IF NOT EXISTS "sales_tenant_id_idx" ON "sales" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "sales_tenant_status_idx" ON "sales" ("tenant_id","status")`,
    `CREATE INDEX IF NOT EXISTS "purchase_items_purchase_id_idx" ON "purchase_items" ("purchase_id")`,
    `CREATE INDEX IF NOT EXISTS "purchases_tenant_id_idx" ON "purchases" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "purchases_tenant_status_idx" ON "purchases" ("tenant_id","status")`,
    `CREATE INDEX IF NOT EXISTS "transfer_items_transfer_id_idx" ON "transfer_items" ("transfer_id")`,
    `CREATE INDEX IF NOT EXISTS "transfers_tenant_id_idx" ON "transfers" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "transfers_tenant_status_idx" ON "transfers" ("tenant_id","status")`,
    `CREATE INDEX IF NOT EXISTS "adjustment_items_adjustment_id_idx" ON "adjustment_items" ("adjustment_id")`,
    `CREATE INDEX IF NOT EXISTS "adjustments_tenant_id_idx" ON "adjustments" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "user_locations_tenant_user_idx" ON "user_locations" ("tenant_id","user_id")`,
    `CREATE INDEX IF NOT EXISTS "user_profiles_tenant_id_idx" ON "user_profiles" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "user_profiles_tenant_user_idx" ON "user_profiles" ("tenant_id","user_id")`,
    `CREATE INDEX IF NOT EXISTS "audit_log_tenant_id_idx" ON "audit_log" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "audit_log_tenant_entity_idx" ON "audit_log" ("tenant_id","entity_type","entity_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "sequence_counters_tenant_seq_unique" ON "sequence_counters" ("tenant_id","sequence_id")`,
    `CREATE INDEX IF NOT EXISTS "alert_thresholds_tenant_id_idx" ON "alert_thresholds" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "alert_thresholds_tenant_item_idx" ON "alert_thresholds" ("tenant_id","item_id")`,
    `CREATE INDEX IF NOT EXISTS "payments_tenant_id_idx" ON "payments" ("tenant_id")`,
    `CREATE INDEX IF NOT EXISTS "payments_tenant_reference_idx" ON "payments" ("tenant_id","reference_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_locations_code" ON "locations"("tenant_id", "code") WHERE "deleted_at" IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts"("tenant_id", "email") WHERE "deleted_at" IS NULL`,
    `CREATE INDEX IF NOT EXISTS "idx_payments_type_ref" ON "payments"("tenant_id", "type", "reference_id")`,
  ];

  for (const idx of indexes) {
    await sql.unsafe(idx);
  }
  console.log('  ✓ all indexes created');

  // ── Step 6: RLS policies ───────────────────────────────────────

  console.log('\n6. Enabling RLS + policies...');

  const rlsTables = [
    'items', 'locations', 'units', 'contacts', 'custom_field_definitions',
    'sales', 'purchases', 'transfers', 'adjustments',
    'user_profiles', 'user_locations', 'audit_log', 'sequence_counters',
    'alert_thresholds', 'payments', 'user_tenants',
  ];

  for (const table of rlsTables) {
    await sql.unsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'tenant_isolation'
        ) THEN
          CREATE POLICY "tenant_isolation" ON "${table}" FOR ALL TO authenticated
            USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
        END IF;
      END $$;
    `);
  }
  console.log('  ✓ RLS enabled on', rlsTables.length, 'tables');

  // ── Step 7: stock_levels VIEW ──────────────────────────────────

  console.log('\n7. Creating stock_levels VIEW...');

  await sql.unsafe(`
    CREATE OR REPLACE VIEW stock_levels AS
    WITH inbound AS (
        SELECT p.tenant_id, pi.item_id, p.location_id, pi.unit_id, pi.quantity
        FROM purchase_items pi
        JOIN purchases p ON p.id = pi.purchase_id
        WHERE p.status = 'received' AND p.deleted_at IS NULL
        UNION ALL
        SELECT t.tenant_id, ti.item_id, t.dest_location_id AS location_id, ti.unit_id,
               COALESCE(ti.received_qty, ti.sent_qty) AS quantity
        FROM transfer_items ti
        JOIN transfers t ON t.id = ti.transfer_id
        WHERE t.status = 'received' AND t.deleted_at IS NULL
        UNION ALL
        SELECT a.tenant_id, ai.item_id, a.location_id, ai.unit_id, ai.qty_change AS quantity
        FROM adjustment_items ai
        JOIN adjustments a ON a.id = ai.adjustment_id
        WHERE a.status = 'approved' AND ai.qty_change > 0 AND a.deleted_at IS NULL
    ),
    outbound AS (
        SELECT t.tenant_id, ti.item_id, t.origin_location_id AS location_id, ti.unit_id,
               ti.sent_qty AS quantity
        FROM transfer_items ti
        JOIN transfers t ON t.id = ti.transfer_id
        WHERE t.status IN ('dispatched', 'in_transit', 'received') AND t.deleted_at IS NULL
        UNION ALL
        SELECT s.tenant_id, si.item_id, s.location_id, si.unit_id, si.quantity
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.status IN ('confirmed', 'dispatched') AND s.deleted_at IS NULL
        UNION ALL
        SELECT a.tenant_id, ai.item_id, a.location_id, ai.unit_id, ABS(ai.qty_change) AS quantity
        FROM adjustment_items ai
        JOIN adjustments a ON a.id = ai.adjustment_id
        WHERE a.status = 'approved' AND ai.qty_change < 0 AND a.deleted_at IS NULL
    ),
    in_transit AS (
        SELECT t.tenant_id, ti.item_id, t.dest_location_id AS location_id, ti.unit_id,
               ti.sent_qty AS quantity
        FROM transfer_items ti
        JOIN transfers t ON t.id = ti.transfer_id
        WHERE t.status IN ('dispatched', 'in_transit') AND t.deleted_at IS NULL
    )
    SELECT
        COALESCE(i.tenant_id, o.tenant_id) AS tenant_id,
        COALESCE(i.item_id, o.item_id) AS item_id,
        COALESCE(i.location_id, o.location_id) AS location_id,
        COALESCE(i.unit_id, o.unit_id) AS unit_id,
        COALESCE(i.total_in, 0) AS total_in,
        COALESCE(o.total_out, 0) AS total_out,
        COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0) AS current_stock,
        COALESCE(tr.in_transit, 0) AS in_transit
    FROM (
        SELECT tenant_id, item_id, location_id, unit_id, SUM(quantity) AS total_in
        FROM inbound GROUP BY tenant_id, item_id, location_id, unit_id
    ) i
    FULL OUTER JOIN (
        SELECT tenant_id, item_id, location_id, unit_id, SUM(quantity) AS total_out
        FROM outbound GROUP BY tenant_id, item_id, location_id, unit_id
    ) o ON i.tenant_id = o.tenant_id AND i.item_id = o.item_id
       AND i.location_id = o.location_id AND i.unit_id = o.unit_id
    LEFT JOIN (
        SELECT tenant_id, item_id, location_id, unit_id, SUM(quantity) AS in_transit
        FROM in_transit GROUP BY tenant_id, item_id, location_id, unit_id
    ) tr ON COALESCE(i.tenant_id, o.tenant_id) = tr.tenant_id
        AND COALESCE(i.item_id, o.item_id) = tr.item_id
        AND COALESCE(i.location_id, o.location_id) = tr.location_id
        AND COALESCE(i.unit_id, o.unit_id) = tr.unit_id;
  `);
  console.log('  ✓ stock_levels VIEW created');

  // ── Step 8: Verify ─────────────────────────────────────────────

  console.log('\n8. Verifying...');

  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log('  Tables:', tables.map(r => r.tablename).join(', '));

  const views = await sql`
    SELECT viewname FROM pg_views WHERE schemaname = 'public'
  `;
  console.log('  Views:', views.map(r => r.viewname).join(', '));

  const rlsCheck = await sql`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = true
    ORDER BY tablename
  `;
  console.log('  RLS enabled on:', rlsCheck.map(r => r.tablename).join(', '));

  // Check super_admins
  const admins = await sql`SELECT user_id FROM super_admins`;
  console.log('  Super admins:', admins.length > 0 ? admins.map(a => a.user_id).join(', ') : '(none)');

  // Check tenants
  const tenantRows = await sql`SELECT id, name, slug, status FROM tenants`;
  console.log('  Tenants:', tenantRows.length > 0 ? tenantRows.map(t => `${t.name} (${t.slug})`).join(', ') : '(none)');

  console.log('\n=== Schema sync complete! ===');
  await sql.end();
}

run().catch(async (err) => {
  console.error('FATAL:', err);
  await sql.end();
  process.exit(1);
});
