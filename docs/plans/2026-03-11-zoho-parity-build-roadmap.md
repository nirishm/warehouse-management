# WareOS × Zoho Inventory — Feature Parity Build Roadmap

> **Reference:** See `2026-03-10-wareos-vs-zoho-feature-comparison.md` for the full feature-by-feature comparison table.
> **This document:** Defines what WareOS will build, what Tally handles, the required data infrastructure, and the phased build sequence.

---

## Strategic Framework: WareOS + Tally = Full Zoho Parity

WareOS is the **operational layer** (what moved, where, when, for whom).
Tally is the **accounting layer** (financial books, GST returns, P&L, payables, receivables).

This means:
- WareOS does NOT build invoicing, journal entries, P&L, or GST filing
- WareOS DOES capture all raw data (HSN codes, GSTIN, tax rates, place of supply) that Tally needs
- The Tally sync module (Phase 8) pushes WareOS operational data into Tally vouchers

---

## BUCKET A: ACCOUNTING → TALLY HANDLES

WareOS does not build these. Tally owns the accounting logic.

| Feature | Tally Equivalent | WareOS Role |
|---|---|---|
| Tax Invoices (with IRN) | Sales Voucher / Tax Invoice | Generate operational delivery challan; Tally generates tax invoice |
| Vendor Bills | Purchase Voucher | Generate GRN; Tally generates bill |
| Credit Notes / Debit Notes | Tally Credit/Debit Notes | None |
| Retainer Invoices / Advance Accounting | Tally Advance Receipt Voucher | Record advance payment amount only |
| Chart of Accounts / Ledger | Tally Ledger Groups | Map WareOS contacts → Tally ledger names |
| GST Return Filing (GSTR-1, 3B, 2A) | Tally GST Reports | None — Tally generates from synced vouchers |
| TDS Computation + Filing | Tally TDS | None |
| E-Invoicing / IRN | Tally / IRP portal | None |
| Payables/Receivables Aging | Tally AP/AR Reports | Partial: track outstanding via payments module only |
| Financial Reports (P&L, Balance Sheet) | Tally Reports | None |
| Bank Reconciliation | Tally Bank Recon | None |
| Multi-currency Forex Accounting | Tally Multi-Currency | None (INR-only for now) |
| Online Payment Gateway | Out of scope | None |

### Data WareOS MUST Capture for Tally Passthrough

Even though Tally handles accounting, WareOS must store these fields:

**On Commodities (items):**
```
hsn_code        TEXT       -- HSN code for goods (8-digit)
sac_code        TEXT       -- SAC code for services (6-digit)
gst_rate        NUMERIC    -- 0 | 5 | 12 | 18 | 28
item_type       TEXT       -- 'goods' | 'service'
```

**On Contacts:**
```
gstin           TEXT       -- 15-char GSTIN (validated format)
state_code      TEXT       -- 2-digit state code (01–37)
gst_treatment   TEXT       -- 'registered' | 'unregistered' | 'consumer' | 'overseas' | 'sez'
```

**On Tenant Settings:**
```
state_code      TEXT       -- Tenant's home state (for interstate calculation)
pan_number      TEXT       -- PAN for Tally company mapping
gst_number      TEXT       -- Move from document_config to settings
```

**On Purchase/Sale Headers:**
```
place_of_supply  TEXT      -- State code where supply is made
is_interstate    BOOLEAN   -- Computed: tenant state ≠ party state
price_list_id    FK        -- Nullable, references price_lists
```

**On Purchase/Sale Line Items:**
```
cgst_rate        NUMERIC   -- Central GST rate %
sgst_rate        NUMERIC   -- State GST rate %
igst_rate        NUMERIC   -- Integrated GST rate % (for interstate)
cgst_amount      NUMERIC   -- Computed CGST amount
sgst_amount      NUMERIC   -- Computed SGST amount
igst_amount      NUMERIC   -- Computed IGST amount
taxable_amount   NUMERIC   -- Line amount before tax
```

---

## BUCKET B: COMPLIANCE → MOSTLY TALLY, EXCEPT E-WAY BILLS

| Feature | Owner | Notes |
|---|---|---|
| GST Return Filing (GSTR-1, 3B) | Tally | Tally generates from synced vouchers |
| TDS Filing | Tally | None |
| E-Invoicing (IRN via IRP) | Tally | Complex; Tally handles via connector |
| Annual Statutory Filings | Tally/CA | None |
| **E-way Bills** | **WareOS** | Dispatch-level operational requirement; WareOS owns the dispatch workflow |
| **GSTIN format validation** | **WareOS** | UI validation on contact forms |
| **Delivery Challans** | **WareOS** | Already built; extend with GST fields |

### E-way Bill (WareOS-owned)

E-way bills (EWB) are mandatory for goods movement > ₹50,000 within India. Since WareOS owns dispatches, it naturally owns EWB.

**New fields on dispatches:**
```
ewb_number       TEXT       -- E-way bill number from NIC portal
ewb_date         TIMESTAMPTZ
ewb_validity     TIMESTAMPTZ  -- Auto-calculated: 1 day per 100km
ewb_status       TEXT       -- 'not_required' | 'generated' | 'cancelled'
transporter_gstin TEXT
distance_km      INTEGER
```

**Phase 1:** Store EWB fields manually (user enters EWB number after generating on NIC portal)
**Phase 2:** API integration with NIC EWB portal for automated generation

---

## BUCKET C: WAREOS BUILDS — Phased Roadmap

### Phase 1: Data Infrastructure (Foundation)
**Build this first — every downstream phase depends on it.**
These are migration-only changes. No new UI beyond field additions to existing forms.

#### 1.1 — GST/Tax Fields on Existing Entities
Migration adds columns to `commodities`, `contacts`, `tenant_settings`, purchases/sales tables (see Bucket A above for exact columns).

UI changes:
- Commodity form: add HSN/SAC/GST rate fields
- Contact form: add GSTIN, state code, GST treatment
- Tenant settings: add state code, PAN
- Transaction forms: show tax breakdown per line item (auto-computed from item GST rate)

#### 1.2 — Tally Sync Markers on All Transaction Tables
Add to `purchases`, `sales`, `dispatches`, `returns`, `payments`:
```
tally_synced_at    TIMESTAMPTZ   -- NULL = not yet synced
tally_ref_id       TEXT          -- Tally voucher reference
tally_sync_error   TEXT          -- Last sync error message
```
No UI needed. Enables Phase 8 without future schema migrations.

#### 1.3 — PO/SO Reference Fields on Transactions
Add to `purchases`, `sales`, `dispatches`:
```
purchase_order_id  UUID   FK → purchase_orders (nullable)
sales_order_id     UUID   FK → sales_orders (nullable)
```
Tables don't exist yet — add as nullable FKs with no constraint initially. Enables Phase 2 PO/SO modules to link back without re-migrating.

#### 1.4 — Price Lists
New tables:
```sql
CREATE TABLE price_lists (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,          -- 'sales' | 'purchase'
  currency TEXT DEFAULT 'INR',
  is_default BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE price_list_items (
  id UUID PRIMARY KEY,
  price_list_id UUID REFERENCES price_lists,
  commodity_id UUID REFERENCES commodities,
  unit_id UUID REFERENCES units_of_measure,
  unit_price NUMERIC NOT NULL,
  min_quantity NUMERIC DEFAULT 0,
  date_from DATE,
  date_to DATE
);
```
UI: Price Lists CRUD under Inventory > Settings. Apply price list to contact as default. Override per transaction.

#### 1.5 — Item Groups / Variants
Add to `commodities`:
```
commodity_group_id   UUID   FK → commodity_groups (nullable)
variant_attributes   JSONB  -- {"grade": "A", "quality": "FAQ"}
```

New table:
```sql
CREATE TABLE commodity_groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```
UI: Commodity group management. Commodities show group membership and variant attributes.

#### 1.6 — E-way Bill Fields on Dispatches
Add EWB columns to dispatches (see Bucket B above). Update dispatch detail page to show EWB fields with manual entry for now.

---

### Phase 2: Purchase Orders + Sales Orders
**Biggest operational gap vs Zoho.** Currently WareOS jumps directly from nothing to purchase receipts and sale deliveries. Phase 2 adds the order stage before fulfillment.

#### 2.1 — Purchase Orders Module (`purchase-orders`)

**New tables:**
```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  po_number TEXT UNIQUE,           -- PO-000001
  vendor_id UUID REFERENCES contacts,
  location_id UUID REFERENCES locations,
  po_date DATE NOT NULL,
  expected_date DATE,
  price_list_id UUID REFERENCES price_lists,
  status TEXT DEFAULT 'draft',     -- draft|sent|partial|received|closed|cancelled
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  tally_synced_at TIMESTAMPTZ,
  tally_ref_id TEXT
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders,
  commodity_id UUID REFERENCES commodities,
  unit_id UUID REFERENCES units_of_measure,
  quantity NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,  -- updated on each receive
  unit_price NUMERIC,
  taxable_amount NUMERIC,
  cgst_rate NUMERIC DEFAULT 0,
  sgst_rate NUMERIC DEFAULT 0,
  igst_rate NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);
```

**Status machine:**
`draft → sent → partial → received → closed | cancelled`

**Key operations:**
- Create / Edit (only in draft)
- Send PO → generates PO PDF, marks status = `sent`
- Receive against PO → creates `purchase` record with `purchase_order_id` FK; updates `received_quantity` per line; marks `partial` or `received`
- Cancel PO

**Documents:** Purchase Order PDF (extend document-gen module)
**Auto-numbering:** PO-000001 (new sequence in sequences table)

#### 2.2 — Sales Orders Module (`sales-orders`)

**New tables:**
```sql
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY,
  so_number TEXT UNIQUE,           -- SO-000001
  customer_id UUID REFERENCES contacts,
  location_id UUID REFERENCES locations,
  so_date DATE NOT NULL,
  expected_date DATE,
  price_list_id UUID REFERENCES price_lists,
  status TEXT DEFAULT 'draft',     -- draft|confirmed|partial|fulfilled|closed|cancelled
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  tally_synced_at TIMESTAMPTZ,
  tally_ref_id TEXT
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY,
  sales_order_id UUID REFERENCES sales_orders,
  commodity_id UUID REFERENCES commodities,
  unit_id UUID REFERENCES units_of_measure,
  quantity NUMERIC NOT NULL,
  fulfilled_quantity NUMERIC DEFAULT 0,  -- updated on each fulfillment
  unit_price NUMERIC,
  taxable_amount NUMERIC,
  cgst_rate NUMERIC DEFAULT 0,
  sgst_rate NUMERIC DEFAULT 0,
  igst_rate NUMERIC DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);
```

**Status machine:**
`draft → confirmed → partial → fulfilled → closed | cancelled`

**Key operations:**
- Create / Edit (only in draft)
- Confirm SO → commits stock (updates `committed_stock` in stock view)
- Fulfill SO → creates `sale` record with `sales_order_id` FK; updates `fulfilled_quantity` per line; marks `partial` or `fulfilled`
- Cancel SO

**Documents:** Proforma Invoice / Sales Order PDF
**Auto-numbering:** SO-000001

#### 2.3 — Committed vs Available Stock (stock_levels view update)

Update the `stock_levels` view to compute:
- `committed_stock` — sum of unfulfilled quantities on confirmed SOs
- `available_stock` = `current_stock - committed_stock`

This prevents selling stock already committed on open SOs.

#### 2.4 — Backorder Tracking
- PO stays `partial` until all items received; shows pending qty per line
- SO stays `partial` until all items fulfilled; shows pending qty per line
- List views flag partial orders prominently
- "Create backorder PO/SO" action: copies unreceived/unfulfilled lines to a new draft

---

### Phase 3: Fulfillment Enhancements

#### 3.1 — Picklists
Auto-generate from confirmed SO. Assign picker (user). Track picking progress per item.

```sql
CREATE TABLE picklists (
  id UUID PRIMARY KEY,
  pl_number TEXT UNIQUE,           -- PL-000001
  sales_order_id UUID REFERENCES sales_orders,
  location_id UUID REFERENCES locations,
  assigned_to UUID,                -- user
  status TEXT DEFAULT 'pending',   -- pending|picking|picked|cancelled
  notes TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE picklist_items (
  id UUID PRIMARY KEY,
  picklist_id UUID REFERENCES picklists,
  sales_order_item_id UUID REFERENCES sales_order_items,
  commodity_id UUID REFERENCES commodities,
  quantity NUMERIC,
  picked_quantity NUMERIC DEFAULT 0,
  bin_id UUID,                     -- nullable, if bin locations active
  status TEXT DEFAULT 'pending'    -- pending|picked|short
);
```

**Documents:** Picklist PDF (printable for warehouse floor)

#### 3.2 — Packages
Create packages from SO items. Generate packing slips.

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY,
  pkg_number TEXT UNIQUE,          -- PKG-000001
  sales_order_id UUID REFERENCES sales_orders,
  status TEXT DEFAULT 'packing',   -- packing|packed|shipped|delivered
  carrier_name TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE package_items (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES packages,
  sales_order_item_id UUID REFERENCES sales_order_items,
  commodity_id UUID REFERENCES commodities,
  quantity NUMERIC,
  unit_id UUID REFERENCES units_of_measure
);
```

**Documents:** Packing Slip PDF

#### 3.3 — Bin Locations
Sub-warehouse location hierarchy for precise stock placement.

```sql
CREATE TABLE bins (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations,
  bin_code TEXT NOT NULL,
  name TEXT,
  zone TEXT,
  aisle TEXT,
  rack TEXT,
  shelf TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  UNIQUE(location_id, bin_code)
);
```

Extend `lot_movements`, `purchase_items`, `dispatch_items` with optional `bin_id FK`.
Add bin-level stock view: `bin_stock_levels` (stock per bin per commodity).

---

### Phase 4: Reporting Enhancements

All reports added as new pages under the `analytics` module.

#### 4.1 — Inventory Reports
| Report | Query Basis |
|---|---|
| Product Sales Report | Group sales items by commodity; date range filter |
| Product Purchase Report | Group purchase items by commodity; date range filter |
| Inventory Details | Current stock + lot breakdown per commodity per location |
| Inventory Valuation | Current stock × weighted avg cost (from purchase unit_price) |
| Stock Movement Report | All movements (in/out) across purchases, sales, dispatches, adjustments, returns |
| Stock Aging | Days since each lot was received (FIFO date from lot table) |
| ABC Analysis | Rank commodities by movement frequency: top 20% = A, next 30% = B, bottom 50% = C |

#### 4.2 — Purchase & Payables Reports
| Report | Depends on |
|---|---|
| Purchase Summary by Vendor | Phase 1 (existing purchases) |
| Pending POs | Phase 2 PO module |
| Vendor Payment History | Existing payments |
| Payables Aging | Phase 2 PO module |

#### 4.3 — Sales & Receivables Reports
| Report | Depends on |
|---|---|
| Sales Summary by Customer | Phase 1 (existing sales) |
| Pending SOs | Phase 2 SO module |
| Customer Payment History | Existing payments |
| Receivables Aging | Phase 2 SO module |

#### 4.4 — Reporting Tags
Add flexible labels to any entity for cross-cutting report segmentation.

```sql
CREATE TABLE reporting_tags (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#666666',
  applicable_entity_types TEXT[],  -- ['commodity','contact','sale','purchase','dispatch']
  created_at TIMESTAMPTZ
);

CREATE TABLE reporting_tag_assignments (
  tag_id UUID REFERENCES reporting_tags,
  entity_type TEXT,
  entity_id UUID,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);
```

UI: Tag manager in settings. Tag chip selector on detail pages. Filter by tag on all list/report pages.

---

### Phase 5: Notifications & Communication

#### 5.1 — Notification Engine (new module: `notifications`)

**Schema:**
```sql
CREATE TABLE notification_templates (
  event_type TEXT PRIMARY KEY,
  subject_template TEXT,
  body_template TEXT,       -- Handlebars/mustache variables: {{order_number}}, {{customer_name}}, etc.
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE notification_preferences (
  user_id UUID,
  event_type TEXT,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, event_type)
);

CREATE TABLE notification_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  channel TEXT,             -- 'in_app' | 'email'
  status TEXT,              -- 'sent' | 'failed'
  sent_at TIMESTAMPTZ,
  error TEXT
);
```

**Built-in notification events:**
| Event | Default Recipients |
|---|---|
| `purchase_order.sent` | Purchasing manager |
| `purchase.received` | Warehouse manager, purchasing manager |
| `sales_order.confirmed` | Warehouse manager |
| `dispatch.in_transit` | Destination location manager |
| `dispatch.received` | Origin location manager, sender |
| `stock_alert.triggered` | Users with `canManageAlerts` |
| `payment.recorded` | Users with `canManagePayments` |

**In-app:** Bell icon in header showing unread count + notification drawer
**Email:** Resend (already configured as SMTP)

#### 5.2 — Email Documents
"Email" button on all document types: PO, GRN, Delivery Note, Delivery Challan, SO PDF.
Opens compose modal with pre-filled subject, body, recipient (from contact email), and attached PDF.
Logs as audit entry + notification log entry.

---

### Phase 6: Customer & Vendor Portals

#### 6.1 — Customer Portal
**URL:** `[app]/portal/customer/[token]`

Token-based access (no full auth required). Token generated per contact, shareable link.

**Customer can:**
- View their Sales Orders (status, items, delivery date)
- Track dispatch status for deliveries in transit
- Download: Delivery Challan, Delivery Note, Proforma Invoice
- See payment history and outstanding balance
- All read-only

**Schema:**
```sql
CREATE TABLE portal_tokens (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts,
  token TEXT UNIQUE NOT NULL,
  type TEXT,                -- 'customer' | 'vendor'
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);
```

#### 6.2 — Vendor Portal
**URL:** `[app]/portal/vendor/[token]`

**Vendor can:**
- View Purchase Orders sent to them (status, items, expected delivery)
- Acknowledge/confirm PO receipt
- See their payment history and pending payments
- All read-only (except PO acknowledgment)

---

### Phase 7: Workflow Automation & Webhooks

#### 7.1 — Automation Rules (new module: `automation`)

```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_event TEXT,          -- 'stock.below_reorder' | 'sales_order.confirmed' | etc.
  condition_field TEXT,        -- optional field check
  condition_operator TEXT,     -- 'equals' | 'gt' | 'lt' | 'contains'
  condition_value TEXT,
  action_type TEXT,            -- 'send_email' | 'create_draft_po' | 'update_field' | 'send_webhook'
  action_config JSONB,         -- action-specific params
  is_active BOOLEAN DEFAULT TRUE,
  run_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ
);
```

**Built-in automation examples:**
- Stock hits reorder point → auto-create draft PO for that commodity
- SO confirmed → notify warehouse manager
- Payment overdue (>30 days) → send reminder email to customer

**UI:** Rule builder with trigger/condition/action dropdowns. Rule activation log.

#### 7.2 — Webhooks

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  name TEXT,
  url TEXT NOT NULL,
  secret TEXT,                 -- HMAC signing secret
  event_types TEXT[],          -- subscribed event types
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  webhook_id UUID REFERENCES webhooks,
  event_type TEXT,
  payload JSONB,
  status TEXT,                 -- 'pending' | 'delivered' | 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_code INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ
);
```

Delivery: 3 attempts with exponential backoff. Delivery log in admin UI.

---

### Phase 8: Tally Integration Layer

#### 8.1 — Tally Sync Module (new module: `tally-sync`)

**Configuration (per tenant):**
```sql
CREATE TABLE tally_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants,
  server_ip TEXT,
  port INTEGER DEFAULT 9000,
  company_name TEXT,
  sync_mode TEXT DEFAULT 'manual',   -- 'manual' | 'auto'
  sync_frequency TEXT DEFAULT 'daily',
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE tally_ledger_mappings (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  wareos_entity_type TEXT,     -- 'contact' | 'commodity' | 'tax_cgst' | 'tax_sgst' | 'tax_igst'
  wareos_entity_id UUID,       -- nullable (for system mappings like tax ledgers)
  tally_ledger_name TEXT,
  tally_group_name TEXT,
  created_at TIMESTAMPTZ
);
```

**Sync Operations (WareOS entity → Tally voucher):**
| WareOS Entity | Tally Voucher | XML Structure |
|---|---|---|
| Purchase (confirmed) | Purchase Voucher | Stock item entry + ledger credit |
| Sale (confirmed) | Sales Voucher | Stock item entry + ledger debit |
| Payment received | Receipt Voucher | Ledger credit |
| Payment made | Payment Voucher | Ledger debit |
| Return (confirmed) | Credit/Debit Note | Reversal entry |
| Stock Adjustment | Journal Voucher | Stock journal |

**Sync modes:**
- Manual: "Sync to Tally" button per transaction (marks `tally_synced_at`)
- Batch: Admin panel → sync date range → queues all unsynced transactions
- Auto: Cron job at configured frequency (uses Vercel cron or Supabase pg_cron)

**Export format:** Tally XML (TDL-compatible, imported via Tally HTTP server at port 9000)

**Status tracking:** `tally_synced_at`, `tally_ref_id`, `tally_sync_error` (added in Phase 1)

---

### Phase 9: Advanced Analytics

#### 9.1 — Dashboard Enhancements
- Financial KPI cards: total sales value, total purchase value, gross margin %
- Trend charts: sales value vs purchase value over time (line chart)
- Stock aging heatmap: days-in-stock per commodity (color: green=fresh → red=old)
- Top 10 table: items by revenue, items by volume, items by margin

#### 9.2 — Custom Report Builder (future)
- Choose: dimensions (commodity, location, contact, date), measures (qty, value, count), grouping, date range
- Save as named report visible to all users
- Export to CSV/Excel

---

## Out of Scope (Explicit Exclusions)

| Feature | Reason |
|---|---|
| Multichannel sales (Shopify, Amazon) | Ops-only tool |
| Shipping carrier integrations (Shiprocket, FedEx) | Ops-only tool |
| Online payment gateways (Razorpay, Stripe) | Tally handles payments |
| EDI / 3PL integrations | Niche; defer indefinitely |
| Package Geometry (3D packing sim) | Not relevant for bulk commodity |
| Multi-currency | India-focus; INR only for now |
| CRM integration | Ops-only tool |
| QuickBooks / Xero / Zoho Books | Tally is the accounting system |
| Custom scripting (Deluge equivalent) | Platform complexity; defer |
| Native mobile app (iOS/Android) | Web-only; PWA in Phase 6+ |
| Web Tabs | Low value |
| Dropshipment | Not relevant for warehouse ops |

---

## Implementation Sequence

```
Phase 1 — Data Infrastructure   ← START HERE; unblocks all other phases
Phase 2 — PO + SO Workflows     ← Biggest operational gap vs Zoho
Phase 3 — Fulfillment           ← Depends on Phase 2
Phase 4 — Reporting             ← Inventory reports: independent. PO/SO reports: after Phase 2
Phase 5 — Notifications         ← Most events need Phase 2 triggers
Phase 6 — Portals               ← Meaningful only after Phase 2 data exists
Phase 7 — Automation            ← Platform layer on top of all above
Phase 8 — Tally Sync            ← Needs Phase 1 fields; can start after Phase 1
Phase 9 — Advanced Analytics    ← Final layer
```

---

## WareOS Competitive Advantages to Preserve

These are areas where WareOS is already **better** than Zoho. Don't regress these.

1. **Dispatch Shortage Tracking** — sent vs received delta, analytics by route/transporter/commodity. Zoho has no transit loss analysis.
2. **Audit Trail Depth** — `old_data`/`new_data` JSONB diffs on every mutation. Zoho shows "field changed" without values.
3. **Location-Scoped User Access** — per-user location assignments filter ALL data globally. Zoho just hides dropdowns.
4. **Transfer/Dispatch Richness** — transporter, vehicle, driver, mobile receive form, shortage auto-calc.
5. **GRN Document** — dedicated Goods Receipt Note PDF. Zoho focuses on bills, not warehouse documentation.
6. **Multi-tenant Architecture** — schema-per-tenant with full data isolation and module enable/disable per tenant.
