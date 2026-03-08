-- NOTE: This is NOT auto-applied. It's a template used by tenant-provisioning.ts
-- {schema} is replaced with actual tenant schema name at provisioning time

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
    deleted_at      TIMESTAMPTZ,
    UNIQUE(code) WHERE deleted_at IS NULL
);

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
    deleted_at      TIMESTAMPTZ,
    UNIQUE(code) WHERE deleted_at IS NULL
);

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

-- Contacts (suppliers and customers)
CREATE TABLE {schema}.contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('supplier','customer','both')),
    email           TEXT,
    phone           TEXT,
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

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
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
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
    current_value       BIGINT NOT NULL DEFAULT 0
);

-- Stock levels view
CREATE VIEW {schema}.stock_levels AS
WITH inbound AS (
    SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
           COALESCE(di.received_quantity, di.sent_quantity) AS quantity
    FROM {schema}.dispatch_items di
    JOIN {schema}.dispatches d ON d.id = di.dispatch_id
    WHERE d.status = 'received' AND d.deleted_at IS NULL

    UNION ALL

    SELECT pi.commodity_id, p.location_id, pi.unit_id, pi.quantity
    FROM {schema}.purchase_items pi
    JOIN {schema}.purchases p ON p.id = pi.purchase_id
    WHERE p.status = 'received' AND p.deleted_at IS NULL
),
outbound AS (
    SELECT di.commodity_id, d.origin_location_id AS location_id, di.unit_id,
           di.sent_quantity AS quantity
    FROM {schema}.dispatch_items di
    JOIN {schema}.dispatches d ON d.id = di.dispatch_id
    WHERE d.status IN ('dispatched','in_transit','received') AND d.deleted_at IS NULL

    UNION ALL

    SELECT si.commodity_id, s.location_id, si.unit_id, si.quantity
    FROM {schema}.sale_items si
    JOIN {schema}.sales s ON s.id = si.sale_id
    WHERE s.status IN ('confirmed','dispatched') AND s.deleted_at IS NULL
),
in_transit AS (
    SELECT di.commodity_id, d.dest_location_id AS location_id, di.unit_id,
           di.sent_quantity AS quantity
    FROM {schema}.dispatch_items di
    JOIN {schema}.dispatches d ON d.id = di.dispatch_id
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
