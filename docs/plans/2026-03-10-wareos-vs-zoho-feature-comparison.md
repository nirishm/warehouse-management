# WareOS vs Zoho Inventory — Complete Feature-by-Feature Comparison

## Strategy Note
WareOS will NOT build accounting features in-house. Instead, we'll integrate with **Tally** (and potentially Zoho Books) for the accounting/financial heavy lifting. Features marked "Tally Integration" below mean we export/sync data to Tally rather than building the feature natively.

---

## Legend

| Symbol | Meaning |
|---|---|
| **HAVE** | Fully implemented in WareOS |
| **PARTIAL** | Basic version exists, needs enhancement |
| **MISSING** | Not built yet |
| **BETTER** | WareOS does this better than Zoho |
| **TALLY** | Should be handled via Tally integration, not built natively |
| **N/A** | Not relevant to WareOS's target market |

---

## 1. INVENTORY (Items & Stock)

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 1.1 | Items | Track stock on hand, committed stock, available-for-sale | **PARTIAL** | We have `stock_levels` view (purchased - dispatched - sold + returned). Missing: committed qty (reserved by confirmed but unfulfilled orders) and available qty (on hand - committed) |
| 1.2 | Item Groups / Variants | Group items by shared attributes (color, size, grade). E.g., "Basmati Rice" group with 1121, Pusa variants | **MISSING** | We have flat commodities with `category` field. No parent-child variant hierarchy |
| 1.3 | Composite Items / Kits | Bundle multiple items into one sellable unit. E.g., "Gift Hamper" = 3 items at custom price | **N/A** | Not relevant for commodity warehouses |
| 1.4 | Inventory Adjustments | Manually adjust stock qty/value with reason codes (damaged, expired, found, theft). Reconcile physical vs system | **MISSING** | Stock only changes via purchase/dispatch/sale/return. No way to adjust for breakage, spillage, pest damage — a critical gap for grain warehouses |
| 1.5 | Price Lists | Customer-specific and vendor-specific pricing. Markup/markdown %. Tiered pricing by quantity (up to 10 ranges) | **MISSING** | unit_price is manually entered per line item on each transaction. No reusable price lists |
| 1.6 | Serial Number Tracking | Track individual units from creation to sale. Each unit gets unique ID | **MISSING** | We have lot/batch tracking (groups) but not individual serial tracking |
| 1.7 | Batch/Lot Tracking | Group items by batch with expiry dates. Trace defective items to batch. FEFO allocation | **HAVE** | Full lot tracking with expiry, FIFO allocation, lot movement history. Solid implementation |
| 1.8 | Barcode Generation | Generate barcodes (EAN-13, UPC-A, Code 39, ITF). Bulk generation. Print labels | **HAVE** | QR + Code128 generation with printable A4 label sheets |
| 1.9 | Barcode Scanning | Scan to add items to transactions. Scan serial numbers. Bin population via scan | **MISSING** | We generate barcodes but can't scan them into transactions. No camera/scanner integration |
| 1.10 | Reorder Points | Set min stock levels. Auto-email alerts when stock drops below threshold. Auto-create PO drafts | **PARTIAL** | We have thresholds with CRITICAL/WARNING/OK states. Missing: email alerts and auto-PO creation |
| 1.11 | SKU Generator | Auto-generate SKU codes based on configurable rules | **MISSING** | No auto-SKU; commodities have manual `code` field |
| 1.12 | ABC Classification | Classify items by value/movement frequency (A=high value, B=medium, C=low) | **MISSING** | No classification system |
| 1.13 | Inventory Valuation | FIFO and Weighted Average Cost methods. Track COGS. Transaction locking for COGS stability | **TALLY** | Cost tracking and COGS should sync to Tally. We'd need to store cost_price per purchase line item (we already have unit_price) |

**WareOS is BETTER at:**
- **Shortage tracking on transfers** — Zoho's transfer orders don't calculate shortage %. WareOS auto-calculates sent vs received delta, tracks shortage by route/transporter/commodity. This is a major differentiator for grain/commodity warehouses where transit loss is a real problem.

---

## 2. WAREHOUSING

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 2.1 | Multi-Location Management | Multiple warehouses per organization | **HAVE** | Locations with types (warehouse, store, yard, external) |
| 2.2 | Transfer Orders | Move stock between warehouses with tracking | **BETTER** | Our dispatch module is richer: transporter/vehicle/driver tracking, mobile receive form, auto-shortage calculation. Zoho's transfer orders are simpler |
| 2.3 | In-Transit Tracking | Track goods during transfer | **HAVE** | Full status workflow: draft → dispatched → in_transit → received → cancelled |
| 2.4 | Warehouse Restrictions | User-level warehouse access control | **BETTER** | Per-user location assignments that filter ALL data (inventory, dispatches, purchases, sales). Zoho just hides warehouse details |
| 2.5 | Bin Locations | Hierarchical sub-locations: Floor > Zone > Aisle > Rack > Shelf > Bin (up to 5,000 per warehouse) | **MISSING** | No sub-warehouse location management. All stock tracked at warehouse level only |
| 2.6 | Picklists | Generate pick lists for orders. Assign to warehouse picker. Track picked status | **MISSING** | No pick list generation |
| 2.7 | Pick Path Optimization | Optimize picker route through warehouse | **MISSING** | No routing |
| 2.8 | Wave Planning | Batch multiple orders into one pick wave | **MISSING** | No wave planning |
| 2.9 | Multi-Order Picking | Pick items for multiple orders in a single pass | **MISSING** | No multi-order picking |
| 2.10 | Putaway Rules | Directed putaway — system suggests where to store received goods | **MISSING** | No putaway logic |
| 2.11 | Move Orders | Internal movement within warehouse (bin to bin) with assignee tracking | **MISSING** | No intra-warehouse movement |
| 2.12 | Cycle Counting | Scheduled physical stock counts. Barcode scan counting. Reconciliation workflow | **MISSING** | No stock count feature. Users can't reconcile physical vs system stock |
| 2.13 | Replenishment Tasks | Auto-generate tasks to refill pick-face bins from bulk storage | **MISSING** | No replenishment logic |

**WareOS is BETTER at:**
- **Transfer shortage analytics** — shortage % by route, by transporter, by commodity. Zoho doesn't offer this.
- **Mobile receive form** — dedicated responsive form for receiving at warehouse dock. Zoho's mobile is a general app.
- **Transporter/vehicle/driver tracking** — on every dispatch. Zoho's transfers don't track transport details.

---

## 3. ORDER MANAGEMENT (Sales Side)

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 3.1 | Sales Orders | Create, edit, track sales orders | **HAVE** | Full CRUD with auto-numbering (SAL-000001), status tracking, line items |
| 3.2 | Custom Statuses | User-defined order statuses beyond defaults | **MISSING** | Fixed statuses only (draft/confirmed/dispatched/cancelled) |
| 3.3 | Order Filtering | Predefined filters + saved custom views | **PARTIAL** | Basic list with filters. No saved/named custom views |
| 3.4 | Multichannel Sales | Sync orders from Shopify, Amazon, eBay, Etsy, etc. | **N/A** | Not relevant for B2B commodity warehouses |
| 3.5 | Packages | Create packages, generate packing slips, track packed/shipped/delivered stages | **MISSING** | No packaging workflow |
| 3.6 | Package Geometry | Simulate box packing optimization | **N/A** | Not relevant for bulk commodity |
| 3.7 | Sales Returns | Create returns, issue credits/refunds, auto-adjust stock | **HAVE** | Returns module with original transaction linking, qty validation, auto stock adjustment |
| 3.8 | Invoicing | Convert order → invoice. Customizable templates. Tax calculation | **TALLY** | Invoices should be generated via Tally integration. We generate delivery notes/challans for warehouse operations |
| 3.9 | Email Invoices | Email invoices directly to customers | **TALLY** | Invoice emailing via Tally |
| 3.10 | Multi-Currency | Transactions in any currency with conversion | **MISSING** | Single currency (INR assumed) |
| 3.11 | Retainer Invoices | Collect advance payments, allocate to future invoices | **TALLY** | Accounting feature → Tally |
| 3.12 | Dropshipment | PO directly from vendor to customer | **N/A** | Not relevant for warehouse operations |
| 3.13 | Backorders | Auto-create backorder when stock insufficient | **MISSING** | No backorder workflow; system doesn't block sales exceeding stock |
| 3.14 | Delivery Challans | India-specific goods transfer document | **HAVE** | PDF dispatch challan with full details and line items |
| 3.15 | Payment Received | Record customer payments | **HAVE** | Payment tracking with method, reference number, amount, date |
| 3.16 | Credit Notes | Issue credits for returns/overcharges | **TALLY** | Accounting feature → Tally |
| 3.17 | E-invoicing | GST-compliant electronic invoicing via IRP | **TALLY** | Compliance feature best handled at invoicing layer (Tally) |

**WareOS is BETTER at:**
- **Delivery Challan** — our challan includes transporter, vehicle, driver details which Zoho's doesn't always capture.

---

## 4. PURCHASE MANAGEMENT

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 4.1 | Purchase Orders | Create, edit, send POs to vendors | **HAVE** | Full CRUD with auto-numbering (PUR-000001) |
| 4.2 | PO Statuses | Billed, partially received, received, in transit, yet to be received | **PARTIAL** | Basic statuses (draft/ordered/received/cancelled). No "partially received" or "in transit" status |
| 4.3 | Bills | Convert PO → Bill. Track until paid | **TALLY** | Bills/AP → Tally integration |
| 4.4 | Purchase Receives | Separate receive entity. Partial receives. Serial/batch tracking at receive time | **PARTIAL** | Receive updates purchase status and stock. No partial receives (it's all-or-nothing). Lot tracking available |
| 4.5 | Excess Vendor Payment Import | Handle overpayments | **TALLY** | Accounting → Tally |
| 4.6 | Vendor Payments | Record payments made to vendors | **HAVE** | Payment tracking on purchases with method, reference, amount |
| 4.7 | Multi-Level PO Approval | Approval chains before PO is sent | **MISSING** | No approval workflow |
| 4.8 | WhatsApp PO Notifications | Send PO to vendor via WhatsApp | **MISSING** | No messaging integration |
| 4.9 | Vendor Price Lists | Vendor-specific pricing per item | **MISSING** | No vendor price lists |

**WareOS is BETTER at:**
- **GRN (Goods Receipt Note)** — dedicated PDF document for purchase receipts. Zoho focuses on bills, not GRN documents.

---

## 5. INTEGRATIONS

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 5.1 | Shipping Carriers | 40+ carriers via AfterShip. Real-time rates. Label generation | **MISSING** | Transporter is a text field. No carrier API integration |
| 5.2 | Shipping Labels | Generate and print shipping labels | **MISSING** | No label printing (we have barcode labels, not shipping labels) |
| 5.3 | Shipment Tracking | AfterShip integration for post-shipment tracking | **MISSING** | No tracking integration |
| 5.4 | Marketplaces | Shopify, Amazon, eBay, Etsy, WooCommerce, BigCommerce | **N/A** | B2B commodity market, not e-commerce |
| 5.5 | Accounting - India | Tally integration | **MISSING** | **This is our #1 integration priority** |
| 5.6 | Accounting - Global | Zoho Books, QuickBooks, Xero | **MISSING** | Tally first, Zoho Books second |
| 5.7 | CRM | Zoho CRM, Salesforce | **N/A** | Not needed for warehouse ops |
| 5.8 | EDI | 3PL logistics (SPS Commerce, etc.) | **MISSING** | No EDI. Could be relevant for large warehouse operators |
| 5.9 | SMS | Invoice/payment SMS notifications | **MISSING** | No SMS. Could use Indian SMS gateways (MSG91, Twilio) |
| 5.10 | Online Payments | Stripe, PayPal, Razorpay | **MISSING** | Payments are manual records. Could integrate Razorpay for India |
| 5.11 | REST API (public) | Documented public API with API keys | **PARTIAL** | Internal API routes exist (60+ endpoints). Not documented or authenticated for external consumers |
| 5.12 | Webhooks (outbound) | Send events to external systems on triggers | **MISSING** | No event notification system |
| 5.13 | Zoho Flow / Make / Zapier | Low-code integration connectors | **MISSING** | No connector for any integration platform |

---

## 6. REPORTS & ANALYTICS

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 6.1 | Inventory Reports | Product sales report, purchase report, inventory details, FIFO cost lot tracking | **PARTIAL** | Analytics module shows counts and status breakdowns. No per-product or per-location detailed reports |
| 6.2 | Sales Reports | Sales by customer, item, date. Revenue trends | **PARTIAL** | Basic sale count/status. No revenue analysis or customer breakdown |
| 6.3 | Purchase Reports | Purchases by vendor, item. Procurement trends | **PARTIAL** | Basic purchase count/status. No vendor spend analysis |
| 6.4 | Receivables | Customer balances, invoice aging, receivable summaries | **TALLY** | AR tracking → Tally |
| 6.5 | Payables | Vendor balances, bill aging, payable summaries | **TALLY** | AP tracking → Tally |
| 6.6 | Activity Reports | System emails sent, staff activity logs | **PARTIAL** | Audit log captures all mutations with user attribution. No email/activity reports |
| 6.7 | Payments Reports | Payments received, refund history, payment trends | **PARTIAL** | Payment list exists. No summary dashboards or trend analysis |
| 6.8 | FIFO Cost Lot Tracking Report | Cost tracking per lot with FIFO valuation | **PARTIAL** | Lot movements tracked with quantities. No cost/value tracking per lot |
| 6.9 | Advanced Analytics | 75+ prebuilt dashboards, custom report builder, Zia AI queries | **MISSING** | No chart dashboards, no custom report builder, no AI |
| 6.10 | Reporting Tags | Hierarchical labels for cross-entity filtering in reports | **MISSING** | No tagging/labeling system |
| 6.11 | Stock Movement Report | All movements (in/out) for any item across all transaction types | **PARTIAL** | Shortage tracking covers dispatches comprehensively. No unified movement report across purchases + sales + dispatches + adjustments |
| 6.12 | Profit by Item | Margin analysis with forecasting and anomaly detection | **TALLY** | Profit/margin → Tally |
| 6.13 | Scheduled Report Emails | Auto-email reports on schedule | **MISSING** | No scheduled reports |

**WareOS is BETTER at:**
- **Shortage Analytics** — multi-dimensional shortage analysis (by route, transporter, commodity) with avg/max shortage %. Zoho has nothing comparable.
- **Audit Trail depth** — old_data vs new_data JSONB diffs on every mutation. Zoho's audit trail is simpler.

---

## 7. TAX & COMPLIANCE (India)

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 7.1 | GST Settings | Intrastate/interstate tax rates. GSTIN per location. HSN/SAC codes per item | **MISSING** | No tax system at all |
| 7.2 | E-way Bills | Generate e-way bills for goods movement >50K. Sync with EWB portal | **MISSING** | Critical for interstate dispatches |
| 7.3 | E-invoicing | Generate IRN via GST portal for B2B invoices | **TALLY** | E-invoicing at invoice layer → Tally |
| 7.4 | HSN/SAC Bulk Validation | Validate HSN codes in bulk | **MISSING** | No HSN tracking on commodities |

**Note:** GST settings (#7.1) and E-way Bills (#7.2) are **must-haves** even with Tally integration, because they affect warehouse operations (not just accounting). E-way bills are needed before goods can physically move.

---

## 8. DOCUMENT GENERATION

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 8.1 | PDF Templates | Customizable templates for all transaction types. Gallery of pre-built designs | **PARTIAL** | 3 PDF types (challan, GRN, delivery note) via @react-pdf/renderer. Not user-customizable |
| 8.2 | Packing Slips | Packing slip per package | **MISSING** | No packing slips |
| 8.3 | Shipping Labels | Printable shipping labels | **MISSING** | We have barcode labels, not shipping labels |
| 8.4 | Email Templates | Multi-language email templates for different transaction types | **MISSING** | Only invite/reset password emails exist |
| 8.5 | SMS Templates | Configurable SMS for invoices/payments | **MISSING** | No SMS |
| 8.6 | Template Editor | WYSIWYG or drag-and-drop template customization | **MISSING** | Templates are code-only (@react-pdf components) |

**WareOS is BETTER at:**
- **GRN document** — dedicated Goods Receipt Note PDF. Zoho doesn't have a standalone GRN document.
- **QR codes on documents** — optional QR code integration in PDFs.

---

## 9. USER MANAGEMENT & ACCESS

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 9.1 | Users and Roles | Assign roles to users from different departments | **HAVE** | 3 roles (tenant_admin, manager, employee) + 18 granular permissions |
| 9.2 | Custom Roles | Create user-defined roles with specific permission sets | **MISSING** | Roles are fixed. Permissions are per-user but can't create named role templates |
| 9.3 | Warehouse-Level User Access | Restrict users to specific warehouses | **BETTER** | Per-user location assignments that filter ALL data globally. More granular than Zoho |
| 9.4 | Record Locking | Lock finalized records from editing | **MISSING** | No record locking |
| 9.5 | Multi-Level Approval | Configurable approval chains for POs, transfers, etc. | **MISSING** | No approval workflows |
| 9.6 | Audit Trail | Track all changes with user attribution | **BETTER** | Append-only log with full old_data/new_data JSONB diffs. More detailed than Zoho's activity log |
| 9.7 | Team Performance Tracking | Track pick rates, fulfillment times | **MISSING** | No performance metrics |

---

## 10. AUTOMATION & CUSTOMIZATION

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 10.1 | Workflow Rules | Event-based triggers (up to 200 rules). 10 criteria with AND/OR | **MISSING** | No automation engine |
| 10.2 | Email Alerts | Auto-send emails on events (low stock, order status change) | **MISSING** | Only manual email via Resend (invite/password). No event-triggered emails |
| 10.3 | Field Update Actions | Auto-update fields when conditions met | **MISSING** | No auto-field-update |
| 10.4 | Webhooks | POST/PUT/DELETE to external URLs on events | **MISSING** | No outbound webhooks |
| 10.5 | Custom Functions (Deluge) | Scripting language for custom business logic | **MISSING** | No scripting/extension system |
| 10.6 | Scheduled Actions | Run actions on schedule (hourly to yearly) | **MISSING** | No cron/scheduler |
| 10.7 | Blueprints | Visual workflow designer (state machine) | **MISSING** | No visual workflow builder |
| 10.8 | Custom Fields | Add custom fields to any entity | **HAVE** | JSONB-based custom fields with definitions per entity type. Well implemented |
| 10.9 | Custom Modules | Create entirely new data entities | **MISSING** | Module system exists but is developer-only, not user-configurable |
| 10.10 | Connections | OAuth connections to third-party services | **MISSING** | No third-party auth framework |

---

## 11. PORTALS & MOBILE

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 11.1 | Customer Portal | Self-service: view orders, pay invoices, check shipment status | **MISSING** | No customer-facing portal |
| 11.2 | Vendor Portal | Self-service: view POs, upload invoices, comment/negotiate | **MISSING** | No vendor-facing portal |
| 11.3 | Native Mobile App (iOS/Android) | Full inventory management on mobile. Camera scanning. Offline support | **MISSING** | Web-only. Responsive mobile forms for receiving, but no native app |
| 11.4 | Mobile Barcode Scanning | Camera + external scanner (Zebra) support | **MISSING** | No scanning in transactions |
| 11.5 | Mobile Dashboard | Quick-create actions, KPI widgets | **MISSING** | No mobile-specific dashboard |

---

## 12. BULK OPERATIONS

| # | Zoho Feature | Description | WareOS | Detail |
|---|---|---|---|---|
| 12.1 | CSV Import | Import items, contacts, transactions from CSV | **HAVE** | Commodities, contacts, purchases import with duplicate detection and detailed error reporting |
| 12.2 | CSV Export | Export any entity to CSV | **HAVE** | All entity types exportable |
| 12.3 | Bulk Update | Update multiple records at once (e.g., change category for 100 items) | **MISSING** | No bulk update UI |
| 12.4 | Bulk Barcode Generation | Generate barcodes for multiple items at once | **HAVE** | Batch label generation on A4 sheets |

---

## SUMMARY SCORECARD

| Category | Total Features | HAVE | BETTER | PARTIAL | MISSING | TALLY | N/A |
|---|---|---|---|---|---|---|---|
| 1. Inventory | 13 | 2 | 0 | 2 | 7 | 1 | 1 |
| 2. Warehousing | 13 | 2 | 1 | 1 | 9 | 0 | 0 |
| 3. Order Mgmt (Sales) | 17 | 4 | 0 | 1 | 5 | 4 | 3 |
| 4. Purchase Mgmt | 9 | 2 | 0 | 2 | 3 | 1 | 0 |
| 5. Integrations | 13 | 0 | 0 | 1 | 10 | 0 | 2 |
| 6. Reports & Analytics | 13 | 0 | 0 | 6 | 4 | 3 | 0 |
| 7. Tax & Compliance | 4 | 0 | 0 | 0 | 3 | 1 | 0 |
| 8. Documents | 6 | 0 | 0 | 1 | 5 | 0 | 0 |
| 9. Users & Access | 7 | 1 | 2 | 0 | 4 | 0 | 0 |
| 10. Automation | 10 | 1 | 0 | 0 | 9 | 0 | 0 |
| 11. Portals & Mobile | 5 | 0 | 0 | 0 | 5 | 0 | 0 |
| 12. Bulk Operations | 4 | 3 | 0 | 0 | 1 | 0 | 0 |
| **TOTAL** | **114** | **15** | **3** | **14** | **65** | **10** | **6** |

**Effective features to build: 83** (114 - 10 Tally - 6 N/A - 15 Have)
**Already strong: 18** (15 Have + 3 Better)
**Need enhancement: 14** (Partial)
**Gaps to fill: 65** (Missing)

---

## WHERE WAREOS IS BETTER THAN ZOHO (5 Features)

1. **Dispatch Shortage Tracking** — Auto-calculated shortage % (sent vs received), analytics by route, transporter, and commodity. Zoho has zero transit loss analysis. This is our killer feature for Indian grain/commodity warehouses.

2. **Audit Trail Depth** — Full old_data vs new_data JSONB diffs on every mutation. Zoho's audit trail only shows "X changed field Y" without the actual values.

3. **Location-Scoped User Access** — Users assigned to specific locations see only that location's data across ALL modules. Zoho just hides warehouse details in dropdowns.

4. **Transfer/Dispatch Richness** — Transporter, vehicle number, driver name, mobile receive form, shortage auto-calculation. Zoho's transfer orders are bare-bones.

5. **GRN Document** — Dedicated Goods Receipt Note PDF for purchase receives. Zoho focuses on bills, not warehouse receipt documentation.

---

## TALLY INTEGRATION STRATEGY

Instead of building accounting features, sync these data points to Tally:

| WareOS Data | Tally Sync |
|---|---|
| Sales (confirmed) | → Tally Sales Voucher / Invoice |
| Purchases (received) | → Tally Purchase Voucher / Bill |
| Payments received | → Tally Receipt Voucher |
| Payments made | → Tally Payment Voucher |
| Returns (confirmed) | → Tally Credit/Debit Note |
| Stock levels | → Tally Stock Item balances |
| Contacts | → Tally Ledger (Sundry Debtors/Creditors) |
| Commodities | → Tally Stock Items / Stock Groups |
| Inventory Adjustments* | → Tally Journal Voucher |

**Integration approach:** Tally Prime supports XML import and has a REST-like API (Tally Connector). We'd build a sync module that:
1. Queues outbound events (sale confirmed, payment recorded, etc.)
2. Transforms to Tally XML format
3. Pushes via Tally Connector API
4. Handles sync status tracking and retry

This offloads: invoicing, e-invoicing, credit notes, receivables, payables, profit reports, COGS, inventory valuation, and all GST filing to Tally.

**We still need natively (even with Tally):**
- GST settings (GSTIN per location, HSN codes on commodities) — needed on challans/GRN
- E-way bills — needed before physical goods movement
- Basic tax rate display on transactions — for operational visibility

---

## RECOMMENDED BUILD PRIORITY (Revised with Tally Strategy)

### Phase 1: Core Operational Gaps
1. **Inventory Adjustments** with reason codes (damaged, expired, found, theft, spillage)
2. **Partial Purchase Receives** (receive 50 of 100 bags, then 50 later)
3. **GST Basics** (GSTIN on locations, HSN on commodities, tax rate on line items)
4. **Stock Movement Report** (unified view: purchases in, dispatches out, sales out, adjustments, returns)
5. **Committed/Available Stock** calculation on inventory view

### Phase 2: Warehouse Operations
6. **Bin/Sub-Location Management** (zone > rack > shelf > bin hierarchy)
7. **Cycle Count / Physical Stock Count** workflow with reconciliation
8. **Picklists** for sales orders and dispatches
9. **Record Locking** on finalized transactions
10. **E-way Bill Generation** (EWB portal integration)

### Phase 3: Tally Integration
11. **Tally Sync Module** — push sales, purchases, payments, returns to Tally
12. **Sync Dashboard** — track sync status, retry failures, view sync history

### Phase 4: Communication & Alerts
13. **Email Notifications** (stock alerts, order status changes, dispatch updates)
14. **SMS Notifications** (via MSG91 or similar Indian gateway)
15. **Scheduled Report Emails** (daily/weekly stock summaries)

### Phase 5: Advanced Features
16. **Custom Roles** (user-defined permission templates)
17. **Approval Workflows** (multi-level PO/dispatch approval)
18. **Barcode Scanning** in transactions (camera + external scanner)
19. **Enhanced Dashboards** (charts, KPI widgets, trend graphs)
20. **Public REST API** + webhook events for external consumers

### Phase 6: Portals & Mobile
21. **Vendor Portal** (view POs, confirm dispatch, upload documents)
22. **Customer Portal** (view orders, check delivery status)
23. **Progressive Web App** (installable, offline-capable mobile experience)
