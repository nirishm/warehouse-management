CREATE TABLE "super_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "super_admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"enabled_modules" jsonb DEFAULT '["inventory"]'::jsonb,
	"plan" text DEFAULT 'free' NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"type" text NOT NULL,
	"base_unit_id" uuid,
	"conversion_factor" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"sku" text,
	"description" text,
	"category" text,
	"type" text DEFAULT 'goods' NOT NULL,
	"default_unit_id" uuid,
	"purchase_price" numeric,
	"selling_price" numeric,
	"hsn_code" text,
	"image_url" text,
	"tags" text[],
	"reorder_level" integer,
	"shelf_life_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"custom_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" text DEFAULT 'warehouse' NOT NULL,
	"address" text,
	"geo_point" jsonb,
	"capacity" integer,
	"parent_location_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"email" text,
	"phone" text,
	"gst_number" text,
	"address" text,
	"credit_limit" numeric,
	"payment_terms" integer,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"field_name" text NOT NULL,
	"field_type" text NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"unit_id" uuid,
	"quantity" numeric NOT NULL,
	"unit_price" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sale_number" text,
	"contact_id" uuid,
	"location_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"shipping_address" text,
	"tracking_number" text,
	"custom_status" text,
	"notes" text,
	"custom_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"unit_id" uuid,
	"quantity" numeric NOT NULL,
	"unit_price" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"purchase_number" text,
	"contact_id" uuid,
	"location_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"expected_delivery_date" timestamp with time zone,
	"notes" text,
	"custom_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"unit_id" uuid,
	"sent_qty" numeric NOT NULL,
	"received_qty" numeric,
	"shortage" numeric
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transfer_number" text,
	"origin_location_id" uuid,
	"dest_location_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"unit_id" uuid,
	"qty_change" numeric,
	"value_change" numeric
);
--> statement-breakpoint
CREATE TABLE "adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adjustment_number" text,
	"location_id" uuid,
	"reason" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"phone" text,
	"permissions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequence_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sequence_id" text NOT NULL,
	"current_value" integer DEFAULT 0 NOT NULL,
	"prefix" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"location_id" uuid,
	"min_quantity" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_number" text,
	"type" text NOT NULL,
	"reference_id" uuid,
	"amount" numeric NOT NULL,
	"payment_method" text,
	"payment_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_default_unit_id_units_id_fk" FOREIGN KEY ("default_unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_origin_location_id_locations_id_fk" FOREIGN KEY ("origin_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_dest_location_id_locations_id_fk" FOREIGN KEY ("dest_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_adjustment_id_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."adjustments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_thresholds" ADD CONSTRAINT "alert_thresholds_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_thresholds" ADD CONSTRAINT "alert_thresholds_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_tenants_user_tenant_unique" ON "user_tenants" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "units_tenant_id_idx" ON "units" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "items_tenant_code_unique" ON "items" USING btree ("tenant_id","code") WHERE "items"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "items_tenant_id_idx" ON "items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "locations_tenant_id_idx" ON "locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_field_definitions_tenant_id_idx" ON "custom_field_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sales_tenant_id_idx" ON "sales" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_tenant_status_idx" ON "sales" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchases_tenant_id_idx" ON "purchases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "purchases_tenant_status_idx" ON "purchases" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "transfer_items_transfer_id_idx" ON "transfer_items" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "transfers_tenant_id_idx" ON "transfers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transfers_tenant_status_idx" ON "transfers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "adjustment_items_adjustment_id_idx" ON "adjustment_items" USING btree ("adjustment_id");--> statement-breakpoint
CREATE INDEX "adjustments_tenant_id_idx" ON "adjustments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_locations_tenant_user_idx" ON "user_locations" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_tenant_id_idx" ON "user_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_profiles_tenant_user_idx" ON "user_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_id_idx" ON "audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_entity_idx" ON "audit_log" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sequence_counters_tenant_seq_unique" ON "sequence_counters" USING btree ("tenant_id","sequence_id");--> statement-breakpoint
CREATE INDEX "alert_thresholds_tenant_id_idx" ON "alert_thresholds" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "alert_thresholds_tenant_item_idx" ON "alert_thresholds" USING btree ("tenant_id","item_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_id_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_reference_idx" ON "payments" USING btree ("tenant_id","reference_id");

-- ============================================================
-- Self-referential FK constraints (not handled by Drizzle)
-- ============================================================
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_location_id_fk"
  FOREIGN KEY ("parent_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;

ALTER TABLE "units" ADD CONSTRAINT "units_base_unit_id_fk"
  FOREIGN KEY ("base_unit_id") REFERENCES "public"."units"("id") ON DELETE SET NULL;

-- ============================================================
-- Additional composite indexes for common query patterns
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "idx_locations_code" ON "locations"("tenant_id", "code") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts"("tenant_id", "email") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_payments_type_ref" ON "payments"("tenant_id", "type", "reference_id");

-- ============================================================
-- RLS policies — defense-in-depth for tenant isolation
-- ============================================================

-- Tenant-scoped tables that need RLS
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "items" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "locations" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "units" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "contacts" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "custom_field_definitions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "custom_field_definitions" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "sales" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "purchases" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "purchases" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "transfers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "transfers" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "adjustments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "adjustments" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "user_profiles" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "user_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "user_locations" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "audit_log" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "sequence_counters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "sequence_counters" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "alert_thresholds" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "alert_thresholds" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "payments" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE "user_tenants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "user_tenants" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Line item tables: RLS through parent join is too slow, so we isolate
-- by ensuring queries always go through tenant-scoped parent first.
-- These don't have tenant_id directly — access is controlled via the
-- parent table's RLS + withTenantScope ensuring parent joins.

-- ============================================================
-- stock_levels VIEW — computes available stock per item/location/unit
-- ============================================================
-- Adapted from v1-archive stock-levels-view.ts for shared-schema (tenant_id)

CREATE OR REPLACE VIEW stock_levels AS
WITH inbound AS (
    -- Received purchases → stock in at purchase location
    SELECT p.tenant_id, pi.item_id, p.location_id, pi.unit_id, pi.quantity
    FROM purchase_items pi
    JOIN purchases p ON p.id = pi.purchase_id
    WHERE p.status = 'received' AND p.deleted_at IS NULL

    UNION ALL

    -- Received transfers → stock in at destination
    SELECT t.tenant_id, ti.item_id, t.dest_location_id AS location_id, ti.unit_id,
           COALESCE(ti.received_qty, ti.sent_qty) AS quantity
    FROM transfer_items ti
    JOIN transfers t ON t.id = ti.transfer_id
    WHERE t.status = 'received' AND t.deleted_at IS NULL

    UNION ALL

    -- Approved adjustments (positive qty_change = stock addition)
    SELECT a.tenant_id, ai.item_id, a.location_id, ai.unit_id, ai.qty_change AS quantity
    FROM adjustment_items ai
    JOIN adjustments a ON a.id = ai.adjustment_id
    WHERE a.status = 'approved' AND ai.qty_change > 0 AND a.deleted_at IS NULL
),
outbound AS (
    -- Dispatched/received transfers → stock out from origin
    SELECT t.tenant_id, ti.item_id, t.origin_location_id AS location_id, ti.unit_id,
           ti.sent_qty AS quantity
    FROM transfer_items ti
    JOIN transfers t ON t.id = ti.transfer_id
    WHERE t.status IN ('dispatched', 'in_transit', 'received') AND t.deleted_at IS NULL

    UNION ALL

    -- Confirmed/dispatched sales → stock out from sale location
    SELECT s.tenant_id, si.item_id, s.location_id, si.unit_id, si.quantity
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.status IN ('confirmed', 'dispatched') AND s.deleted_at IS NULL

    UNION ALL

    -- Approved adjustments (negative qty_change = stock removal)
    SELECT a.tenant_id, ai.item_id, a.location_id, ai.unit_id, ABS(ai.qty_change) AS quantity
    FROM adjustment_items ai
    JOIN adjustments a ON a.id = ai.adjustment_id
    WHERE a.status = 'approved' AND ai.qty_change < 0 AND a.deleted_at IS NULL
),
in_transit AS (
    -- Transfers in dispatched/in_transit status → awaiting receipt at destination
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