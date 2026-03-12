# WareOS User Manual

> Version: 2.0 | Updated: March 2026 | Covers all 16 modules

---

## Table of Contents

1. [What Is WareOS?](#1-what-is-wareos)
2. [Key Concepts Glossary](#2-key-concepts-glossary)
3. [Getting Started](#3-getting-started)
   - 3.1 [Signing In](#31-signing-in)
   - 3.2 [Navigating the Interface](#32-navigating-the-interface)
   - 3.3 [Your First Day: Setup Checklist](#33-your-first-day-setup-checklist)
4. [Operations](#4-operations)
   - 4.1 [Purchases](#41-purchases)
   - 4.2 [Dispatches](#42-dispatches)
   - 4.3 [Sales](#43-sales)
   - 4.4 [Returns](#44-returns)
   - 4.5 [Stock Adjustments](#45-stock-adjustments)
5. [Inventory Management](#5-inventory-management)
   - 5.1 [Stock Levels](#51-stock-levels)
   - 5.2 [Lot & Batch Tracking](#52-lot--batch-tracking)
   - 5.3 [Stock Alerts](#53-stock-alerts)
   - 5.4 [Shortage Tracking](#54-shortage-tracking)
6. [Reports & Insights](#6-reports--insights)
   - 6.1 [Analytics Dashboard](#61-analytics-dashboard)
   - 6.2 [Audit Log](#62-audit-log)
   - 6.3 [Payments](#63-payments)
   - 6.4 [Bulk Import / Export](#64-bulk-import--export)
   - 6.5 [Barcodes & QR Codes](#65-barcodes--qr-codes)
7. [Administration](#7-administration)
   - 7.1 [User Management](#71-user-management)
   - 7.2 [The 18 Permission Flags](#72-the-18-permission-flags)
   - 7.3 [Location Restrictions](#73-location-restrictions)
   - 7.4 [Master Data (Locations, Items, Contacts)](#74-master-data-locations-items-contacts)
   - 7.5 [Custom Fields](#75-custom-fields)
   - 7.6 [Document Templates](#76-document-templates)
   - 7.7 [Tenant Settings & Module Control](#77-tenant-settings--module-control)
8. [Technical Reference](#8-technical-reference)
   - 8.1 [Environment Variables](#81-environment-variables)
   - 8.2 [Local Setup](#82-local-setup)
   - 8.3 [Deploying to Production (Vercel + Supabase)](#83-deploying-to-production-vercel--supabase)
   - 8.4 [Troubleshooting](#84-troubleshooting)
- [Appendix A: All 16 Modules Reference](#appendix-a-all-16-modules-reference)

---

## 1. What Is WareOS?

WareOS is a **multi-tenant SaaS Warehouse Management System** designed for businesses that need to track goods moving in (purchases, returns) and out (dispatches, sales) of one or more warehouses. Each business operates in a fully isolated environment called a **tenant**.

### Core Capabilities

| Area | What You Can Do |
|---|---|
| **Operations** | Record purchases, dispatches, sales, returns, and stock adjustments with auto-numbered documents |
| **Inventory** | Track stock levels across locations, manage lot/batch numbers, set low-stock alerts |
| **People & Contacts** | Manage suppliers, customers, and internal users with granular permissions |
| **Reporting** | Analytics dashboards, audit trails, payment ledgers, CSV exports |
| **Documents** | Auto-generate PDF dispatch challans, GRNs, and delivery notes |
| **Automation** | Barcode/QR scanning, bulk CSV import, shortage alerts |

### Design Philosophy

WareOS is built around a **transaction-first** model: every movement of goods is recorded as an immutable transaction with a unique sequence number (e.g., `DSP-000001`, `PUR-000001`). Stock levels are always derived from these transactions — there is no manual "stock count" override, only a formal **adjustment** transaction.

---

## 2. Key Concepts Glossary

| Term | Definition |
|---|---|
| **Tenant** | A single company/organization on WareOS. Each tenant has fully isolated data. |
| **Tenant Slug** | A short URL-safe identifier for your tenant (e.g., `acme`). All your URLs begin with `/t/acme/`. |
| **Location** | A physical storage area: warehouse, shelf, bin, or zone. Stocks are tracked per location. |
| **Commodity / Item** | A product, material, or SKU that can be stocked and moved. |
| **Contact** | A supplier or customer linked to purchase/sale/dispatch transactions. |
| **Lot / Batch** | A production or receipt batch that allows tracing groups of items through the supply chain. |
| **Dispatch** | An outbound movement of goods (to a customer or another location). |
| **Purchase** | An inbound receipt of goods from a supplier. |
| **Sale** | A confirmed sale order; may or may not immediately trigger a dispatch. |
| **Return** | Goods coming back from a customer (sales return) or going back to a supplier (purchase return). |
| **Adjustment** | A formal correction to stock levels, e.g., after a physical count finds a discrepancy. |
| **Module** | A feature bundle that can be enabled or disabled per tenant by a super admin. |
| **Permission Flag** | A boolean capability granted to a user (e.g., `canDispatch`, `canPurchase`). |
| **Super Admin** | A platform-level administrator who manages tenants; accessed at `/admin`. |
| **Sequence Number** | Auto-incrementing document ID: `DSP-000001`, `PUR-000001`, `SAL-000001`, `RET-000001`, `PAY-000001`, `ADJ-000001`. |

---

## 3. Getting Started

### 3.1 Signing In

Navigate to your WareOS instance URL (e.g., `https://wareos.in`). You will land on the sign-in page.

**Email / Password login:**
1. Enter your email and password, then click **Sign In**.
2. If you forgot your password, click **Forgot password?** — a recovery link will be sent to your email.
3. After clicking the link in the email, you will land on `/reset-password` to set a new password.

**Google OAuth login:**
1. Click **Continue with Google**.
2. Authenticate with Google; you will be redirected back automatically.

**First-time invited users:**
- If an admin invited you, check your email for an invitation link.
- Clicking the link opens the **Set Password** page (`/set-password`) where you create your password.
- After setting your password you are automatically signed in.

**Access pending:**
- If you sign up directly and see an "Access Pending" screen (`/no-tenant`), your account exists but has not been assigned to a tenant yet.
- Contact your warehouse administrator; they can approve your request from the **Access Requests** panel in Admin settings.

---

### 3.2 Navigating the Interface

After signing in, you are redirected to your tenant dashboard at:

```
/t/{tenantSlug}/dashboard
```

The interface has three main areas:

```
┌─────────────────────────────────────────────────┐
│  Header (60px)  — Logo, Tenant Name, User Menu  │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  Sidebar     │  Main Content Area               │
│  (240px)     │                                  │
│              │  All pages render here           │
│  Navigation  │                                  │
│  Groups:     │                                  │
│  • Overview  │                                  │
│  • Operations│                                  │
│  • Inventory │                                  │
│  • Reports   │                                  │
│  • Settings  │                                  │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

**Sidebar navigation groups:**

| Group | Pages |
|---|---|
| Overview | Dashboard |
| Operations | Purchases, Dispatches, Sales, Returns |
| Inventory | Stock Levels, Lot Tracking, Stock Alerts, Shortage Tracking, Stock Adjustments |
| Reports | Analytics, Audit Log, Payments, Bulk Import/Export, Barcodes |
| Settings | Locations, Items (Commodities), Contacts, Users, Custom Fields, Document Templates, Tenant Settings |

> Sidebar items are only shown if the corresponding module is **enabled** and you have the required **permission**. If a page is missing from your sidebar, ask your admin.

---

### 3.3 Your First Day: Setup Checklist

Before recording any transactions, complete the following setup in order:

- [ ] **1. Add Locations** — Go to Settings → Locations. Create at least one warehouse location.
- [ ] **2. Add Items (Commodities)** — Go to Settings → Items. Add the products/materials you stock.
- [ ] **3. Add Contacts** — Go to Settings → Contacts. Add your suppliers and customers.
- [ ] **4. Set Opening Stock** — Use Stock Adjustments (Inventory → Adjustments) to record your starting stock levels.
- [ ] **5. Invite Team Members** — Go to Settings → Users → Invite User. Assign appropriate permissions.
- [ ] **6. Enable Modules** — (Super admin or tenant admin) Go to Settings → Modules to enable features like Lot Tracking, Stock Alerts, etc.
- [ ] **7. Configure Stock Alerts** — Go to Inventory → Stock Alerts and set minimum quantity thresholds for critical items.

---

## 4. Operations

All operations create permanent, audit-trailed transaction records with auto-assigned sequence numbers.

### 4.1 Purchases

**Module:** `purchase` | **Permission:** `canPurchase` | **Sequence:** `PUR-000001`

A Purchase records goods received from a supplier into your warehouse.

#### Creating a Purchase

1. Navigate to **Operations → Purchases → New Purchase**.
2. Fill in the purchase form using the **Transaction Stepper**:
   - **Step 1 — Details**: Select supplier (contact), set purchase date, add reference number (optional), add notes.
   - **Step 2 — Items**: Add line items. For each item, select the commodity, quantity, unit price, and destination location. If Lot Tracking is enabled, you may assign a lot/batch number here.
   - **Step 3 — Review**: Confirm all details and submit.
3. On submission, a `PUR-XXXXXX` number is assigned and stock is increased at the specified location(s).

#### Purchase Statuses

| Status | Meaning |
|---|---|
| **Ordered** | Purchase created but goods not yet received |
| **Received** | All goods have been received into stock |
| **Partial** | Some line items received, others pending |
| **Cancelled** | Purchase cancelled; no stock movement |

#### Receiving a Partial Purchase

Open a purchase in **Ordered** or **Partial** status and click **Receive Items**. You can receive a subset of line items; the purchase moves to **Partial** until all items are received.

#### Generating a GRN (Goods Receipt Note)

With the **Document Generation** module enabled and `canGenerateDocuments` permission:
- Open a received purchase → click **Download GRN** to get a PDF.

---

### 4.2 Dispatches

**Module:** `dispatch` | **Permission:** `canDispatch` (create), `canReceive` (mark received) | **Sequence:** `DSP-000001`

A Dispatch records goods leaving your warehouse — to a customer, a delivery address, or another location.

#### Creating a Dispatch

1. Navigate to **Operations → Dispatches → New Dispatch**.
2. Fill in the **Transaction Stepper**:
   - **Step 1 — Details**: Select recipient contact, dispatch date, vehicle/driver details (optional), notes.
   - **Step 2 — Items**: Add line items with commodity, quantity, source location. If Lot Tracking is enabled, a lot selector appears — select which lot the goods are taken from.
   - **Step 3 — Review**: Confirm and submit.
3. Stock is **reserved** (not yet deducted) until the dispatch is marked **Received**.

#### Dispatch Statuses

| Status | Meaning |
|---|---|
| **Pending** | Dispatch created, awaiting loading |
| **Dispatched** | Goods have left; in transit |
| **Received** | Recipient confirmed receipt; stock deducted |
| **Cancelled** | Dispatch cancelled; stock reservation released |

#### Marking a Dispatch as Received

**Desktop:** Open the dispatch → click **Mark as Received** → confirm quantities.

**Mobile (field use):** A mobile-optimized receive form is available at the dispatch detail page on phones. It uses a large-tap card layout with a sticky submit button — designed for use on the warehouse floor or at point of delivery. Navigate to `/t/{slug}/dispatches/{id}/receive` on a mobile browser.

#### Generating a Dispatch Challan

With the Document Generation module enabled:
- Open a dispatched record → click **Download Challan** to get a PDF with dispatch details, item list, and vehicle info.

---

### 4.3 Sales

**Module:** `sale` | **Permission:** `canSale` | **Sequence:** `SAL-000001`

A Sale records a confirmed sale to a customer. Sales can optionally be linked to a dispatch.

#### Creating a Sale

1. Navigate to **Operations → Sales → New Sale**.
2. Fill in the **Transaction Stepper**:
   - **Step 1 — Details**: Select customer contact, sale date, payment terms, notes.
   - **Step 2 — Items**: Add line items with commodity, quantity, unit price, and source location.
   - **Step 3 — Review**: Confirm and submit.
3. A `SAL-XXXXXX` number is assigned. Stock is allocated but not immediately deducted unless the sale is fulfilled via a linked dispatch.

#### Sale Statuses

| Status | Meaning |
|---|---|
| **Draft** | Sale started but not confirmed |
| **Confirmed** | Sale confirmed; goods pending dispatch |
| **Fulfilled** | All items dispatched/delivered |
| **Cancelled** | Sale cancelled |

#### Generating a Delivery Note

With the Document Generation module enabled:
- Open a fulfilled sale → click **Download Delivery Note** to get a PDF.

---

### 4.4 Returns

**Module:** `returns` | **Permission:** `canManageReturns` | **Sequence:** `RET-000001`

Returns handle goods coming back: either from a customer (Sales Return) or back to a supplier (Purchase Return).

#### Creating a Return

1. Navigate to **Operations → Returns → New Return**.
2. Select return type: **Sales Return** or **Purchase Return**.
3. Link to the original sale or purchase (optional but recommended).
4. Add items being returned, with quantities and reason.
5. Specify the destination location (where returned goods will go back into stock).
6. Submit — stock is updated and a `RET-XXXXXX` number is assigned.

> **Note:** The **Create Return** and **Accept Return** buttons only appear if the `returns` module is enabled AND you have `canManageReturns` permission. If these buttons are missing, contact your admin.

#### Return Statuses

| Status | Meaning |
|---|---|
| **Pending** | Return initiated, awaiting acceptance |
| **Accepted** | Return accepted; stock restored |
| **Rejected** | Return rejected; no stock movement |

---

### 4.5 Stock Adjustments

**Module:** `adjustments` | **Permission:** `canManageAdjustments` | **Sequence:** `ADJ-000001`

Stock Adjustments are the formal mechanism for correcting stock levels — for example, after a physical stock count reveals a discrepancy, or to record opening stock.

#### When to Use Adjustments

- **Opening stock:** Setting initial quantities when first setting up WareOS.
- **Physical count discrepancy:** Found 47 units but system shows 50 — adjust by -3.
- **Damage / shrinkage:** Write off goods lost to damage.
- **Write-on:** Add goods found during a stocktake not previously recorded.

#### Creating an Adjustment

1. Navigate to **Inventory → Stock Adjustments → New Adjustment**.
2. Fill in the form:
   - **Location**: Which location is being adjusted.
   - **Reference / Reason**: Note explaining why (e.g., "Stocktake 2026-03-11", "Damaged goods write-off").
   - **Line Items**: For each item, enter the **adjustment quantity** — positive to add stock, negative to remove.
3. Submit — an `ADJ-XXXXXX` number is assigned and stock levels update immediately.

> Adjustments are permanent and fully audited. There is no "undo" — to reverse an adjustment, create a new offsetting adjustment.

#### Viewing Adjustment History

Navigate to **Inventory → Stock Adjustments** to see a full list of all past adjustments, filterable by date, location, and item.

---

## 5. Inventory Management

### 5.1 Stock Levels

**Module:** `inventory` | **Permission:** `canViewStock`

Navigate to **Inventory → Stock Levels** to see a live summary of all stock across all locations.

#### Stock Level Views

| View | Description |
|---|---|
| **Summary** | Total quantity per item across all locations |
| **By Location** | Stock broken down by each location |
| **By Item** | All locations where a specific item is held |
| **Low Stock** | Items at or below their alert threshold |

#### Understanding Stock Quantities

- **On Hand**: Physical quantity currently in stock.
- **Reserved**: Quantity allocated to pending dispatches (not yet shipped).
- **Available**: On Hand minus Reserved — what you can actually dispatch.

Stock levels are always derived from transaction history. They cannot be edited directly — use a Stock Adjustment to correct discrepancies.

---

### 5.2 Lot & Batch Tracking

**Module:** `lot-tracking` | **Permission:** `canManageLots`

Lot Tracking allows you to trace specific batches of goods from receipt (purchase) through to dispatch/sale. This is essential for industries requiring traceability (food, pharma, chemicals).

#### Enabling Lot Tracking

A super admin or tenant admin enables the `lot-tracking` module from Settings → Modules. Once enabled, lot assignment fields appear on purchase and dispatch forms.

#### Assigning Lots

**On Purchase (receipt):** In Step 2 of the purchase form, each line item has an optional **Lot Number** field. Enter a production batch code, expiry date reference, or supplier lot number.

**On Dispatch / Sale:** When picking items for a dispatch or sale, a **Lot Selector** appears allowing you to choose which lot the goods are taken from. This ensures FIFO (first-in, first-out) or specific lot selection.

> **Tip:** If the lot selector does not appear on a dispatch/sale form, verify that: (a) the `lot-tracking` module is enabled, and (b) the item being dispatched has at least one lot assigned from a previous purchase.

#### Lot Traceability Report

Navigate to **Inventory → Lot Tracking → Lot Detail** to see the full movement history of any lot — when it was received, where it was stored, and when/where it was dispatched.

---

### 5.3 Stock Alerts

**Module:** `stock-alerts` | **Permission:** `canManageAlerts`

Stock Alerts notify you when an item's stock level falls below a minimum threshold.

#### Setting Up Alerts

1. Navigate to **Inventory → Stock Alerts**.
2. Click **Add Alert** (or edit an existing item).
3. For each item + location combination, set a **Minimum Quantity** threshold.
4. Save — the system will flag this item whenever available stock drops below the threshold.

#### Viewing Active Alerts

The Stock Alerts dashboard shows:
- Items currently below threshold (highlighted in red).
- Items approaching threshold (highlighted in orange).
- Last reorder date (if linked to a purchase).

> **Note:** If the Stock Alerts dashboard appears empty even after adding thresholds, verify the `stock-alerts` module is enabled in Settings → Modules.

---

### 5.4 Shortage Tracking

**Module:** `shortage-tracking` | **Permission:** `canViewAnalytics`

Shortage Tracking identifies items that have been requested (via dispatch orders) but could not be fully fulfilled due to insufficient stock.

#### How Shortage Tracking Works

Whenever a dispatch is created for more quantity than is available, WareOS records a **shortage event**. The Shortage Tracking dashboard aggregates these events to show:

- **Unresolved shortages** — items still short.
- **Shortage history** — past shortages and how they were resolved.
- **Top shorted items** — items that are frequently under-stocked.

Navigate to **Inventory → Shortage Tracking** to access this dashboard.

#### Resolving a Shortage

A shortage is automatically resolved when the required stock arrives (via a purchase or adjustment). The shortage event is linked to the fulfilling purchase for audit purposes.

---

## 6. Reports & Insights

### 6.1 Analytics Dashboard

**Module:** `analytics` | **Permission:** `canViewAnalytics`

Navigate to **Reports → Analytics** for an overview of warehouse performance.

#### Dashboard Sections

| Section | What It Shows |
|---|---|
| **KPI Cards** | Total purchases, dispatches, sales this period; total stock value |
| **Movement Trends** | Line chart of goods in vs. goods out over time |
| **Top Items** | Most-moved commodities by volume |
| **Location Utilization** | Stock distribution across locations |
| **Recent Activity** | Latest transactions across all types |

#### Date Filters

Use the date range picker (top right of the Analytics page) to filter all charts and KPIs to a specific period: last 7 days, 30 days, 90 days, or custom range.

---

### 6.2 Audit Log

**Module:** `audit-trail` | **Permission:** `canViewAuditLog`

The Audit Log records every significant action performed in WareOS — who did what, when, and on which record.

Navigate to **Reports → Audit Log**.

#### Filtering the Audit Log

| Filter | Options |
|---|---|
| **Date Range** | Any date range |
| **User** | Filter by specific user |
| **Action Type** | create, update, delete, login, etc. |
| **Module** | Filter by feature area |

#### What Gets Audited

All create, update, and delete operations on: purchases, dispatches, sales, returns, adjustments, contacts, commodities, locations, users, and custom field definitions.

---

### 6.3 Payments

**Module:** `payments` | **Permission:** `canManagePayments` | **Sequence:** `PAY-000001`

The Payments module tracks money in and out linked to purchases and sales.

Navigate to **Reports → Payments**.

#### Recording a Payment

1. Click **New Payment**.
2. Link to a purchase (outgoing payment to supplier) or sale (incoming payment from customer).
3. Enter: amount, payment date, method (bank transfer, cash, cheque), reference number, notes.
4. Submit — a `PAY-XXXXXX` number is assigned.

#### Payments Ledger

The payments list shows all payments with running balance per contact. Filter by contact, payment type (in/out), or date range.

> **Note:** If the Payments panel is not visible in the sidebar, verify the `payments` module is enabled in Settings → Modules.

---

### 6.4 Bulk Import / Export

**Module:** `bulk-import` | **Permission:** `canImportData` (import), `canExportData` (export)

WareOS supports CSV bulk operations to speed up data entry and reporting.

Navigate to **Reports → Bulk Import/Export**.

#### Importing Data

**Supported import types:**

| Import Type | Required Columns | Notes |
|---|---|---|
| **Commodities / Items** | `name`, `sku`, `unit` | `sku` must be unique |
| **Contacts** | `name`, `type` (`supplier`/`customer`), `email` | Duplicates shown as warnings |
| **Purchases** | `supplier`, `item_sku`, `quantity`, `location`, `date` | Location must exist |
| **Stock Adjustments** | `item_sku`, `location`, `quantity`, `reason` | Positive or negative quantity |

**Import steps:**
1. Download the template CSV for your import type.
2. Fill in the template with your data.
3. Upload the CSV on the import page.
4. Review the **pre-flight validation report** — errors stop import; warnings proceed with caution.
5. Confirm to execute the import.

**Common import errors:**
- `"location not found"` — The location name in your CSV does not match any location in Settings → Locations. Check for typos and extra spaces.
- `"duplicate SKU"` — An item with that SKU already exists. Update the existing item instead.
- `"invalid date format"` — Use ISO format: `YYYY-MM-DD`.

#### Exporting Data

Each major list page (Purchases, Dispatches, Sales, Stock Levels) has an **Export CSV** button (requires `canExportData`). The export respects your current filters.

---

### 6.5 Barcodes & QR Codes

**Module:** `barcode` | **Permission:** none required (all users)

Navigate to **Reports → Barcodes** to generate and print barcode/QR labels for items or locations.

#### Generating Labels

1. Select items or locations you want labels for.
2. Choose label format: **Barcode (Code 128)** or **QR Code**.
3. Click **Generate** — a printable PDF label sheet is produced.

#### Using Barcodes in Transactions

When creating a dispatch or purchase, the item search field supports barcode scanning — if you have a USB or Bluetooth barcode scanner, scan the item's barcode to auto-fill the commodity field.

---

## 7. Administration

### 7.1 User Management

**Module:** `user-management` | **Permission:** Admin role required

Navigate to **Settings → Users** to manage who can access your tenant and what they can do.

#### Inviting a New User

1. Click **Invite User**.
2. Enter the user's email address.
3. Assign their **permissions** (see Section 7.2).
4. (Optional) Assign **location restrictions** (see Section 7.3).
5. Click **Send Invitation**.
6. The user receives an email (sent via Resend) with a link to `/set-password` to create their password.

#### Editing User Permissions

Click any user's name in the user list → **Edit Permissions**. Toggle permission flags on/off and save.

#### Removing a User

Click any user → **Remove from Tenant**. This revokes their access but does not delete their account (they may still belong to other tenants). The action is logged in the Audit Log.

#### Approving Access Requests

If a user registered themselves and is waiting at the `/no-tenant` page:
- Navigate to **Settings → Access Requests**.
- Review pending requests.
- **Approve** to add the user with a default permission set, or **Reject** to deny access.

---

### 7.2 The 18 Permission Flags

Each user is assigned a combination of these flags. Flags are independent — a user can have `canDispatch` without `canPurchase`, for example.

| # | Permission Flag | What It Grants |
|---|---|---|
| 1 | `canPurchase` | Create and manage purchase transactions |
| 2 | `canDispatch` | Create and manage dispatch transactions |
| 3 | `canReceive` | Mark dispatches as received |
| 4 | `canSale` | Create and manage sale transactions |
| 5 | `canViewStock` | View stock levels and stock reports |
| 6 | `canManageLocations` | Create and edit warehouse locations |
| 7 | `canManageCommodities` | Create and edit items/commodities |
| 8 | `canManageContacts` | Create and edit supplier and customer contacts |
| 9 | `canViewAnalytics` | Access Analytics dashboard and Shortage Tracking |
| 10 | `canExportData` | Export data as CSV from any list page |
| 11 | `canViewAuditLog` | View the Audit Log |
| 12 | `canManagePayments` | Record and manage payment transactions |
| 13 | `canManageAlerts` | Create and configure stock alert thresholds |
| 14 | `canGenerateDocuments` | Download PDFs (challans, GRNs, delivery notes) |
| 15 | `canManageLots` | Assign and track lot/batch numbers |
| 16 | `canManageReturns` | Create and process return transactions |
| 17 | `canImportData` | Use the bulk CSV import feature |
| 18 | `canManageAdjustments` | Create stock adjustment transactions |

#### Suggested Role Profiles

| Role | Suggested Permissions |
|---|---|
| **Warehouse Manager** | All 18 flags |
| **Purchase Officer** | canPurchase, canViewStock, canManageContacts, canManageLots, canGenerateDocuments |
| **Dispatch Clerk** | canDispatch, canReceive, canViewStock, canManageLots, canGenerateDocuments |
| **Sales Executive** | canSale, canManageReturns, canViewStock, canManageContacts, canGenerateDocuments |
| **Stock Auditor** | canViewStock, canViewAnalytics, canViewAuditLog, canManageAdjustments, canExportData |
| **Finance** | canManagePayments, canViewAnalytics, canExportData |
| **Data Entry** | canImportData, canManageCommodities, canManageContacts |

---

### 7.3 Location Restrictions

By default, users can see and operate in all locations. Location Restrictions limit a user to specific locations.

#### Assigning Location Restrictions

1. Navigate to **Settings → Users** → click a user → **Edit**.
2. Under **Location Access**, toggle from **All Locations** to **Specific Locations**.
3. Check the locations this user should have access to.
4. Save.

**Effect:** The user will only see stock, transactions, and items for their assigned locations. Attempts to access other locations will be blocked.

> **Note:** Location restrictions stack with permission flags. A user needs both the permission (e.g., `canDispatch`) AND access to the relevant location to create a transaction.

---

### 7.4 Master Data (Locations, Items, Contacts)

#### Locations

Navigate to **Settings → Locations**.

- **Create Location**: Name, code (optional short code), description, parent location (for hierarchical storage).
- **Edit / Archive**: Locations cannot be deleted if they hold stock — archive them instead.

#### Items (Commodities)

Navigate to **Settings → Items**.

- **Fields**: Name, SKU (unique), unit of measure (kg, pcs, litre, etc.), description, category, custom fields.
- **Bulk Add**: Use Bulk Import → Commodities to add many items from a CSV.

#### Contacts

Navigate to **Settings → Contacts**.

- **Types**: Supplier, Customer, or Both.
- **Fields**: Name, email, phone, address, GSTIN (tax ID), notes, custom fields.
- **Bulk Add**: Use Bulk Import → Contacts.

---

### 7.5 Custom Fields

Navigate to **Settings → Custom Fields**.

Custom Fields allow you to capture business-specific data on any entity without code changes.

#### Supported Entities

Custom fields can be added to: **Commodities**, **Contacts**, **Purchases**, **Dispatches**, **Sales**, **Returns**, **Adjustments**.

#### Field Types

| Type | Use Case |
|---|---|
| **Text** | Short free-form text (e.g., "Brand") |
| **Textarea** | Long notes |
| **Number** | Numeric values (e.g., "Weight (kg)") |
| **Date** | Date picker (e.g., "Expiry Date") |
| **Select** | Dropdown with predefined options (e.g., "Grade: A / B / C") |
| **Checkbox** | Boolean flag |

#### Adding a Custom Field

1. Click **New Custom Field**.
2. Select the entity it applies to.
3. Enter: label, field type, options (for Select type), whether it's required.
4. Save — the field immediately appears in the relevant forms.

---

### 7.6 Document Templates

**Module:** `document-gen` | **Permission:** `canGenerateDocuments`

Navigate to **Settings → Document Templates** to configure the appearance of generated PDFs.

#### Customizable Documents

| Document | Triggered From |
|---|---|
| **Dispatch Challan** | Dispatch detail page |
| **Goods Receipt Note (GRN)** | Purchase detail page |
| **Delivery Note** | Sale detail page |

#### Template Settings

- **Company Name & Logo**: Upload your logo and set your company name.
- **Address & Contact Info**: Footer details on all PDFs.
- **Custom Header Text**: Optional free-text header on each document type.
- **Show/Hide Fields**: Toggle which fields appear (e.g., hide vehicle number from GRNs).

---

### 7.7 Tenant Settings & Module Control

Navigate to **Settings → Tenant Settings**.

#### General Settings

- **Tenant Name**: Display name shown in the header.
- **Tenant Slug**: URL identifier — changing this will break bookmarked URLs.
- **Timezone**: Used for date/time display on transactions and documents.

#### Module Control

The **Modules** tab shows all available modules and their enabled/disabled status.

> **Who can toggle modules?** Super admins (at `/admin`) can enable or disable any module for any tenant. Tenant admins can view module status but may not have permission to toggle modules — check with your WareOS platform administrator.

**Module dependencies:** Some modules require others to be enabled first. For example:
- `lot-tracking` requires `inventory` and `purchase`.
- `shortage-tracking` requires `inventory` and `dispatch`.
- `returns` requires `inventory`, `purchase`, and `sale`.

If you cannot enable a module, ensure its dependencies are enabled first.

---

## 8. Technical Reference

### 8.1 Environment Variables

All environment variables are set in `.env.local` (local development) or as environment variables in your hosting platform (Vercel).

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL (e.g., `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public, safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **never expose client-side** |
| `NEXT_PUBLIC_APP_URL` | Yes | Full URL of your app (e.g., `https://wareos.in`) — used in email links |
| `RESEND_API_KEY` | Yes | API key from Resend — used for sending invitation and password reset emails |

#### Getting Your Supabase Keys

1. Open your project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → API**.
3. Copy **URL** → `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`.

#### Getting Your Resend API Key

1. Sign up at [resend.com](https://resend.com).
2. Create an API key.
3. In Supabase → **Authentication → SMTP Settings**, configure Resend as the SMTP provider using the credentials from Resend's documentation.

---

### 8.2 Local Setup

**Prerequisites:** Node.js 20+, pnpm, Supabase CLI, Git.

```bash
# 1. Clone the repository
git clone https://github.com/your-org/warehouse-management.git
cd warehouse-management

# 2. Install dependencies
pnpm install

# 3. Copy environment template and fill in your values
cp .env.example .env.local
# Edit .env.local with your Supabase URL, keys, and Resend API key

# 4. Run database migrations
supabase db push

# 5. Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

**Creating your first tenant (local):**
1. Open `http://localhost:3000/admin` — this is the super admin panel.
2. Click **New Tenant** and fill in the tenant name and slug.
3. Navigate to `/t/{your-slug}/dashboard` to see the new tenant.
4. Go to Settings → Users to invite yourself or other users.

**Running tests:**

```bash
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # End-to-end tests (Playwright)
pnpm lint          # Lint code
pnpm build         # Production build check
```

---

### 8.3 Deploying to Production (Vercel + Supabase)

#### Step 1: Set Up Supabase Project

1. Create a new project at [supabase.com](https://supabase.com).
2. Note your project URL and keys.
3. Run migrations: `supabase db push --project-ref YOUR_PROJECT_REF`

#### Step 2: Configure Resend for Email

1. In Supabase → **Authentication → SMTP Settings**.
2. Enable custom SMTP.
3. Use Resend's SMTP credentials (host: `smtp.resend.com`, port 465).
4. Set **From** email to a verified domain on Resend.
5. Set the Site URL to your production URL in **Authentication → URL Configuration**.

#### Step 3: Deploy to Vercel

1. Push your code to GitHub.
2. In [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. Add all environment variables (see Section 8.1).
4. Set **Root Directory** to `.` (project root).
5. Framework preset: **Next.js** (auto-detected).
6. Click **Deploy**.

#### Step 4: Post-Deploy Checks

- [ ] Visit `https://your-domain.com/admin` — super admin panel accessible.
- [ ] Create a tenant at `/admin` → confirm slug-based routing works.
- [ ] Invite a user — confirm invitation email arrives.
- [ ] Test password reset flow.
- [ ] Enable a module and verify it appears in the sidebar.

#### Production Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set as an encrypted environment variable (not in client bundle).
- [ ] Row-level security is enabled on all tenant tables in Supabase.
- [ ] Google OAuth redirect URI is set in Supabase → **Authentication → Providers → Google**.
- [ ] CORS origins in Supabase are limited to your production domain.
- [ ] Vercel deployment protection is configured (optional but recommended).

---

### 8.4 Troubleshooting

#### Problem 1: Invalid API Key / Supabase Connection Error

**Symptom:** App shows "Failed to fetch" or "Invalid API key" error.

**Fix:** Check `.env.local` (dev) or Vercel environment variables (prod). Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exactly match the values from Supabase → Project Settings → API. Restart the dev server after changing `.env.local`.

---

#### Problem 2: Table Not Found (Migrations Not Run)

**Symptom:** Error like `relation "tenant_acme.purchases" does not exist`.

**Fix:** Run `supabase db push` to apply all pending migrations. For modules, ensure each required module is **enabled** in Settings → Modules — module tables are only created when the module is enabled.

---

#### Problem 3: Data from One Company Appears in Another

**Symptom:** Tenant A can see tenant B's stock or transactions.

**Fix:** This should not be possible with correct RLS policies. Verify that the service role client is NOT being used on the client side (check for `SUPABASE_SERVICE_ROLE_KEY` in client-side code). Each tenant's data is isolated in a separate PostgreSQL schema (`tenant_{slug}`). Contact support if cross-tenant data exposure is confirmed — this is a critical security issue.

---

#### Problem 4: Module Not Visible in Sidebar

**Symptom:** Expected module (e.g., Lot Tracking) does not appear in the sidebar.

**Fix:**
1. Go to **Settings → Modules** — is the module listed as **Enabled**?
2. If disabled, a super admin must enable it from `/admin → Tenants → [Tenant] → Modules`.
3. Check that module dependencies are also enabled.
4. Hard-refresh the browser (Ctrl+Shift+R / Cmd+Shift+R) after enabling.

---

#### Problem 5: User Cannot See a Feature They Should Have

**Symptom:** User reports a page or button is missing.

**Fix:**
1. Go to **Settings → Users** → click the user → **Edit Permissions**.
2. Verify the required permission flag is toggled on (see Section 7.2 for which flag controls which feature).
3. Check location restrictions — the user may have permissions but be restricted to a different location.
4. If the feature requires a module, confirm the module is enabled (Problem 4).

---

#### Problem 6: Stock Levels Look Wrong

**Symptom:** Stock shows 0 or an unexpected quantity.

**Fix:**
1. Check the **transaction history** for that item — every stock movement should correspond to a purchase, dispatch, sale, or adjustment.
2. Look for a recent dispatch that hasn't been marked **Received** — this stock is reserved, not deducted.
3. If a purchase was entered with the wrong location, the stock is at the wrong location. Find the purchase, check the line items, and create a corrective adjustment if needed.
4. Use **Inventory → Stock Adjustments** to create a correction with a documented reason.

---

#### Problem 7: Shortage Figures Not Appearing

**Symptom:** Shortage Tracking dashboard shows no data.

**Fix:**
1. Ensure both `inventory` and `dispatch` modules are enabled.
2. Shortages only appear when a dispatch was created for more quantity than was available. Check if any recent dispatches had quantity warnings during creation.
3. Verify the user has `canViewAnalytics` permission.

---

#### Problem 8: Users Cannot Log In / No Confirmation Email

**Symptom:** New user gets no email; cannot sign in.

**Fix:**
1. Check **Resend** dashboard for delivery logs — was the email sent?
2. Verify `RESEND_API_KEY` is correctly set in environment variables.
3. In Supabase → **Authentication → SMTP Settings** — verify Resend SMTP configuration.
4. Check Supabase → **Authentication → URL Configuration** — Site URL must match your actual app URL, or email links will be broken.
5. Ask the user to check spam/junk folder.

---

#### Problem 9: Document Numbers Not Incrementing Correctly

**Symptom:** Two transactions have the same sequence number, or numbers jump unexpectedly.

**Fix:** WareOS uses a PostgreSQL `get_next_sequence()` function with row-level locking to generate sequence numbers — concurrent transactions are handled correctly. If duplicates appear, it may indicate a manual database intervention. Check the Audit Log for unusual admin activity. Contact support with the affected sequence numbers.

---

#### Problem 10: User Cannot See a Location

**Symptom:** User sees no locations in dropdowns or can't find stock at a location they expect to see.

**Fix:**
1. Check **Settings → Users** → user → **Location Access**. Is it set to "Specific Locations" with the correct locations checked?
2. If set to "All Locations", verify the location exists and is not archived in **Settings → Locations**.
3. Ensure the location has stock (via Inventory → Stock Levels filtered by that location).

---

#### Problem 11: Create Return / Accept Return Button Not Visible

**Symptom:** The Return button does not appear on a purchase or sale detail page.

**Fix:**
1. The `returns` module must be enabled (check Settings → Modules).
2. The user must have `canManageReturns` permission.
3. Both conditions must be true for the button to appear. Check each independently.

---

#### Problem 12: App Looks Different (Old Cached Version)

**Symptom:** After a WareOS update, the UI looks outdated or CSS appears broken.

**Fix:** Hard-refresh the browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux). If using Vercel, check the **Deployments** page to confirm the latest build is active. Clear browser cache if the issue persists.

---

#### Problem 13: Payments Panel Not Visible

**Symptom:** "Payments" does not appear in the Reports sidebar group.

**Fix:**
1. The `payments` module must be enabled in Settings → Modules.
2. The user needs `canManagePayments` permission.
3. Enable the module and grant the permission, then hard-refresh.

---

#### Problem 14: Stock Alerts Dashboard Is Empty

**Symptom:** Inventory → Stock Alerts shows no alerts even though items are low on stock.

**Fix:**
1. Confirm the `stock-alerts` module is enabled.
2. Alerts only appear if thresholds have been configured. Go to **Inventory → Stock Alerts → Add Alert** and set minimum quantities for items you want to monitor.
3. If thresholds are set but no alerts show, verify the available stock is actually below the threshold (check Inventory → Stock Levels).

---

#### Problem 15: PDF Download Buttons Not Appearing

**Symptom:** No "Download Challan", "Download GRN", or "Download Delivery Note" button visible on transaction detail pages.

**Fix:**
1. The `document-gen` module must be enabled.
2. The user must have `canGenerateDocuments` permission.
3. For GRN: the purchase must be in **Received** status.
4. For Challan: the dispatch must be in **Dispatched** or **Received** status.
5. For Delivery Note: the sale must be in **Fulfilled** status.

---

#### Problem 16: CSV Import Fails with "Location Not Found"

**Symptom:** Bulk import returns an error: `Row 5: location "Main Warehouse" not found`.

**Fix:** The location name in the CSV must exactly match the name in **Settings → Locations** — including capitalisation and spacing. Go to Settings → Locations, copy the exact name, and update your CSV. Re-upload to retry.

---

#### Problem 17: Stock Adjustment Not Reflecting in Stock Levels

**Symptom:** Created an adjustment but stock levels didn't change.

**Fix:**
1. Confirm the adjustment status — it should be **Completed** (adjustments are applied immediately on submission).
2. Check that the adjustment used the correct **location** — the stock level change will only appear at that specific location.
3. Hard-refresh the Stock Levels page (the dashboard may be cached).
4. Check the Audit Log for the adjustment record to confirm it was created.

---

#### Problem 18: Lot Selector Not Appearing on Dispatch/Sale Form

**Symptom:** Adding items to a dispatch but no lot/batch selector appears.

**Fix:**
1. Confirm the `lot-tracking` module is enabled.
2. The lot selector only appears if the item being added has at least **one lot assigned** from a previous purchase. If the item was received without a lot number, no lots are available to select.
3. To assign a lot retroactively, find the original purchase and edit the line item to add a lot number (if the purchase is still in editable status), or create a new purchase with the lot assigned.

---

## Appendix A: All 16 Modules Reference

| # | Module ID | Display Name | Required Modules | Permissions Required | Sidebar Location |
|---|---|---|---|---|---|
| 1 | `inventory` | Inventory | _(none)_ | `canViewStock`, `canManageLocations`, `canManageCommodities`, `canManageContacts` | Inventory, Settings |
| 2 | `dispatch` | Dispatches | `inventory` | `canDispatch`, `canReceive` | Operations |
| 3 | `purchase` | Purchases | `inventory` | `canPurchase` | Operations |
| 4 | `sale` | Sales | `inventory` | `canSale` | Operations |
| 5 | `analytics` | Analytics | `inventory` | `canViewAnalytics` | Reports |
| 6 | `shortage-tracking` | Shortage Tracking | `inventory`, `dispatch` | `canViewAnalytics` | Inventory |
| 7 | `user-management` | User Management | _(none)_ | _(admin role)_ | Settings |
| 8 | `audit-trail` | Audit Trail | _(none)_ | `canViewAuditLog` | Reports |
| 9 | `payments` | Payments | `inventory` | `canManagePayments` | Reports |
| 10 | `stock-alerts` | Stock Alerts | `inventory` | `canManageAlerts` | Inventory |
| 11 | `document-gen` | Document Generation | `inventory` | `canGenerateDocuments` | _(embedded in transaction pages)_ |
| 12 | `lot-tracking` | Lot & Batch Tracking | `inventory`, `purchase` | `canManageLots` | Inventory |
| 13 | `returns` | Returns | `inventory`, `purchase`, `sale` | `canManageReturns` | Operations |
| 14 | `bulk-import` | Bulk Import / Export | `inventory` | `canImportData`, `canExportData` | Reports |
| 15 | `barcode` | Barcode & QR Codes | `inventory` | _(none — all users)_ | Reports |
| 16 | `adjustments` | Stock Adjustments | `inventory` | `canManageAdjustments` | Inventory |

---

### Sequence Number Reference

| Prefix | Module | Example | Meaning |
|---|---|---|---|
| `PUR-` | purchase | `PUR-000001` | Purchase / goods receipt |
| `DSP-` | dispatch | `DSP-000001` | Outbound dispatch |
| `SAL-` | sale | `SAL-000001` | Sale order |
| `RET-` | returns | `RET-000001` | Return transaction |
| `PAY-` | payments | `PAY-000001` | Payment record |
| `ADJ-` | adjustments | `ADJ-000001` | Stock adjustment |

---

### Design System Quick Reference

| Token | Value | Usage |
|---|---|---|
| Primary accent | `#F45F00` | Buttons, links, status badges (active/dispatched) |
| Background base | `#FFFFFF` | Card/panel backgrounds |
| Background off | `#F5F5F3` | Page backgrounds |
| Status — green | System green | Received / Completed |
| Status — orange | `#F45F00` | Dispatched / In Progress |
| Status — blue | System blue | Confirmed / Ordered |
| Status — red | System red | Cancelled / Error |
| Display font | Hedvig Letters Serif | Page titles, KPI numbers |
| Body font | Rethink Sans | All UI text, forms |
| Code font | Space Mono | Sequence numbers, codes, tables |

---

*WareOS User Manual — End of Document*

*For platform support or to report a bug, contact your WareOS administrator or open an issue on the project repository.*
