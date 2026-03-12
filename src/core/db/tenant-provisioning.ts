import { execSql } from './exec-sql';
import { buildStockLevelsViewSQL } from './stock-levels-view';

// NOTE: This SQL is derived from supabase/migrations/00002_tenant_template.sql
// {schema} placeholders are replaced with the actual tenant schema name at provisioning time.
// Embedding avoids runtime fs.readFileSync() which is fragile in serverless environments.
export const TENANT_SCHEMA_SQL = `
-- Locations (warehouses, stores, yards)
CREATE TABLE {schema}.locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'warehouse'
                    CHECK (type IN ('warehouse','store','yard','external')),
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_locations_code_active ON {schema}.locations(code) WHERE deleted_at IS NULL;

-- Commodities (products/items/grains)
CREATE TABLE {schema}.commodities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    description     TEXT,
    category        TEXT,
    default_unit_id UUID,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_commodities_code_active ON {schema}.commodities(code) WHERE deleted_at IS NULL;

-- Units of measure
CREATE TABLE {schema}.units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    abbreviation    TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL DEFAULT 'weight'
                    CHECK (type IN ('weight','volume','count','length','custom')),
    base_unit_id    UUID REFERENCES {schema}.units(id),
    conversion_factor NUMERIC,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK: commodities.default_unit_id -> units (added after units table exists)
ALTER TABLE {schema}.commodities
  ADD CONSTRAINT commodities_default_unit_id_fkey
  FOREIGN KEY (default_unit_id) REFERENCES {schema}.units(id);

-- Contacts (suppliers and customers)
CREATE TABLE {schema}.contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('supplier','customer','both')),
    email           TEXT,
    phone           TEXT,
    address         TEXT,
    code            TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_contacts_code_active ON {schema}.contacts(code) WHERE deleted_at IS NULL AND code IS NOT NULL;

-- Dispatches (inter-location movements)
CREATE TABLE {schema}.dispatches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number     TEXT NOT NULL UNIQUE,
    origin_location_id  UUID NOT NULL REFERENCES {schema}.locations(id),
    dest_location_id    UUID NOT NULL REFERENCES {schema}.locations(id),
    status              TEXT NOT NULL DEFAULT 'dispatched'
                        CHECK (status IN ('draft','dispatched','in_transit','received','cancelled')),
    dispatched_at       TIMESTAMPTZ,
    received_at         TIMESTAMPTZ,
    dispatched_by       UUID NOT NULL,
    received_by         UUID,
    transporter_name    TEXT,
    vehicle_number      TEXT,
    driver_name         TEXT,
    driver_phone        TEXT,
    notes               TEXT,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CHECK (origin_location_id != dest_location_id)
);

-- Dispatch line items
CREATE TABLE {schema}.dispatch_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id         UUID NOT NULL REFERENCES {schema}.dispatches(id) ON DELETE CASCADE,
    commodity_id        UUID NOT NULL REFERENCES {schema}.commodities(id),
    unit_id             UUID NOT NULL REFERENCES {schema}.units(id),
    sent_quantity       NUMERIC NOT NULL CHECK (sent_quantity > 0),
    sent_bags           INT,
    received_quantity   NUMERIC,
    received_bags       INT,
    shortage            NUMERIC GENERATED ALWAYS AS (
                            CASE WHEN received_quantity IS NOT NULL
                            THEN sent_quantity - received_quantity
                            ELSE NULL END
                        ) STORED,
    shortage_percent    NUMERIC GENERATED ALWAYS AS (
                            CASE WHEN received_quantity IS NOT NULL AND sent_quantity > 0
                            THEN ROUND(((sent_quantity - received_quantity) / sent_quantity) * 100, 2)
                            ELSE NULL END
                        ) STORED,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchases (inbound from suppliers)
CREATE TABLE {schema}.purchases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number     TEXT NOT NULL UNIQUE,
    contact_id          UUID REFERENCES {schema}.contacts(id),
    location_id         UUID NOT NULL REFERENCES {schema}.locations(id),
    status              TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('draft','ordered','received','cancelled')),
    received_at         TIMESTAMPTZ DEFAULT now(),
    created_by          UUID NOT NULL,
    transporter_name    TEXT,
    vehicle_number      TEXT,
    driver_name         TEXT,
    driver_phone        TEXT,
    notes               TEXT,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- Purchase line items
CREATE TABLE {schema}.purchase_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id         UUID NOT NULL REFERENCES {schema}.purchases(id) ON DELETE CASCADE,
    commodity_id        UUID NOT NULL REFERENCES {schema}.commodities(id),
    unit_id             UUID NOT NULL REFERENCES {schema}.units(id),
    quantity            NUMERIC NOT NULL CHECK (quantity > 0),
    bags                INT,
    unit_price          NUMERIC,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales (outbound to customers)
CREATE TABLE {schema}.sales (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number         TEXT NOT NULL UNIQUE,
    contact_id          UUID REFERENCES {schema}.contacts(id),
    location_id         UUID NOT NULL REFERENCES {schema}.locations(id),
    status              TEXT NOT NULL DEFAULT 'confirmed'
                        CHECK (status IN ('draft','confirmed','dispatched','cancelled')),
    sold_at             TIMESTAMPTZ DEFAULT now(),
    created_by          UUID NOT NULL,
    transporter_name    TEXT,
    vehicle_number      TEXT,
    driver_name         TEXT,
    driver_phone        TEXT,
    notes               TEXT,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- Sale line items
CREATE TABLE {schema}.sale_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id             UUID NOT NULL REFERENCES {schema}.sales(id) ON DELETE CASCADE,
    commodity_id        UUID NOT NULL REFERENCES {schema}.commodities(id),
    unit_id             UUID NOT NULL REFERENCES {schema}.units(id),
    quantity            NUMERIC NOT NULL CHECK (quantity > 0),
    bags                INT,
    unit_price          NUMERIC,
    custom_fields       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (tenant-specific)
CREATE TABLE {schema}.user_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE,
    display_name        TEXT NOT NULL,
    phone               TEXT,
    permissions         JSONB NOT NULL DEFAULT '{
        "canPurchase": false,
        "canDispatch": false,
        "canReceive": false,
        "canSale": false,
        "canViewStock": true,
        "canManageLocations": false,
        "canManageCommodities": false,
        "canManageContacts": false,
        "canViewAnalytics": false,
        "canExportData": false,
        "canViewAuditLog": false,
        "canManagePayments": false,
        "canManageAlerts": false,
        "canGenerateDocuments": false,
        "canManageLots": false,
        "canManageReturns": false,
        "canImportData": false
    }',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

-- User-location assignments
CREATE TABLE {schema}.user_locations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    location_id         UUID NOT NULL REFERENCES {schema}.locations(id),
    UNIQUE(user_id, location_id)
);

-- Custom field definitions
CREATE TABLE {schema}.custom_field_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         TEXT NOT NULL
                        CHECK (entity_type IN (
                            'dispatch','purchase','sale','commodity','location','contact',
                            'dispatch_item','purchase_item','sale_item'
                        )),
    field_key           TEXT NOT NULL,
    field_label         TEXT NOT NULL,
    field_type          TEXT NOT NULL
                        CHECK (field_type IN ('text','number','date','boolean','select','multiselect')),
    options             JSONB,
    is_required         BOOLEAN NOT NULL DEFAULT false,
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, field_key)
);

-- Audit log (append-only)
CREATE TABLE {schema}.audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID,
    user_name           TEXT,
    action              TEXT NOT NULL,
    entity_type         TEXT NOT NULL,
    entity_id           UUID,
    old_data            JSONB,
    new_data            JSONB,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence counters
CREATE TABLE {schema}.sequence_counters (
    id                  TEXT PRIMARY KEY,
    prefix              TEXT NOT NULL,
    current_value       BIGINT NOT NULL DEFAULT 0 CHECK (current_value >= 0)
);

-- Indexes
CREATE INDEX idx_dispatches_status ON {schema}.dispatches(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatches_origin ON {schema}.dispatches(origin_location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatches_dest ON {schema}.dispatches(dest_location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatches_date ON {schema}.dispatches(dispatched_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatch_items_dispatch ON {schema}.dispatch_items(dispatch_id);
CREATE INDEX idx_purchases_location ON {schema}.purchases(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_location ON {schema}.sales(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_log_entity ON {schema}.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON {schema}.audit_log(created_at DESC);
CREATE INDEX idx_user_locations_user ON {schema}.user_locations(user_id);

-- Seed default units
INSERT INTO {schema}.units (name, abbreviation, type, is_default) VALUES
    ('Kilogram', 'kg', 'weight', true),
    ('Metric Ton', 'MT', 'weight', false),
    ('Quintal', 'qtl', 'weight', false),
    ('Gram', 'g', 'weight', false),
    ('Litre', 'L', 'volume', false),
    ('Piece', 'pc', 'count', false),
    ('Bag', 'bag', 'count', false),
    ('Box', 'box', 'count', false);

-- Seed sequence counters
INSERT INTO {schema}.sequence_counters (id, prefix, current_value) VALUES
    ('dispatch', 'DSP', 0),
    ('purchase', 'PUR', 0),
    ('sale', 'SAL', 0),
    ('payment', 'PAY', 0),
    ('lot', 'LOT', 0),
    ('return', 'RET', 0);

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.locations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.commodities
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.dispatches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.purchases
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.sales
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON {schema}.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Security: grant service_role full access, deny direct access to public roles
GRANT USAGE ON SCHEMA {schema} TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA {schema} TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA {schema} TO service_role;
REVOKE USAGE ON SCHEMA {schema} FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA {schema} FROM anon, authenticated;

-- RLS on all tables (service_role bypasses RLS by default)
ALTER TABLE {schema}.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE {schema}.sequence_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON {schema}.locations AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.commodities AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.units AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.contacts AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.dispatches AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.dispatch_items AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.purchases AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.purchase_items AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.sales AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.sale_items AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.user_profiles AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.user_locations AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.custom_field_definitions AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.audit_log AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
CREATE POLICY "service_role_only" ON {schema}.sequence_counters AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);

-- Additional performance indexes
CREATE INDEX idx_purchases_status ON {schema}.purchases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_status ON {schema}.sales(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dispatch_items_commodity ON {schema}.dispatch_items(commodity_id);

-- Received quantity constraint
ALTER TABLE {schema}.dispatch_items
  ADD CONSTRAINT chk_received_not_exceed_sent
  CHECK (received_quantity IS NULL OR received_quantity <= sent_quantity);
`;

export async function provisionTenantSchema(tenantSlug: string): Promise<string> {
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(tenantSlug)) {
    throw new Error(`Invalid tenant slug: "${tenantSlug}"`);
  }
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`;

  const sql = TENANT_SCHEMA_SQL.replace(/{schema}/g, schemaName);

  await execSql(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
  await execSql(sql);

  // Create the stock_levels VIEW using the shared builder (base only: no returns, no adjustments)
  const viewSql = buildStockLevelsViewSQL(schemaName, { includeReturns: false, includeAdjustments: false });
  await execSql(viewSql);

  return schemaName;
}
