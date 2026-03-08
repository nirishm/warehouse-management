# WareOS — User Manual

**Audience:** Business owners, warehouse managers, and employees
**Last updated:** March 2026

---

## Table of Contents

1. [What Is This App?](#1-what-is-this-app)
2. [Key Concepts Glossary](#2-key-concepts-glossary)
3. [The Big Picture: Two Layers of the System](#3-the-big-picture-two-layers-of-the-system)
4. [Modules — What Each One Does](#4-modules--what-each-one-does)
5. [Setup From Scratch](#5-setup-from-scratch)
6. [Daily Workflows](#6-daily-workflows)
7. [User Roles and Permissions](#7-user-roles-and-permissions)
8. [Custom Fields](#8-custom-fields)
9. [The Audit Trail](#9-the-audit-trail)
10. [Deploying to Production](#10-deploying-to-production)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What Is This App?

WareOS is a cloud-based Warehouse Management System (WMS) designed to help commodity-trading and logistics businesses track stock, movements, purchases, sales, and returns across one or more physical locations.

Think of it as a digital ledger for your warehouse. Every time goods arrive from a supplier, move between your storage points, leave to a customer, or come back as a return, you record that event here. The system keeps a running total of what you have, where it is, and whether anything is short or over. At any time, you can pull up a stock report, trace every movement back to its source, and know exactly who did what.

The application is multi-tenant, meaning one installation of the software can serve multiple independent companies simultaneously. Each company's data is kept completely separate — like separate apartments in the same building. If you are a business owner using this system, you are a tenant. If you are the person who runs the software platform itself, you are the super admin.

### Visual Identity

WareOS uses a clean, light editorial design. The interface features white backgrounds with an orange (#F45F00) accent color. Typography is built on three typefaces:

- **Hedvig Letters Serif** — page headlines and section titles
- **Rethink Sans** — body text, navigation labels, and form fields
- **Space Mono** — reference numbers (DSP-000001), codes, labels, and data values

Buttons use a pill shape. Status badges throughout the application are color-coded:

| Color | Meaning |
|---|---|
| **Green** | Received, completed |
| **Orange** | Dispatched, in-progress |
| **Blue** | Confirmed, ordered |
| **Red** | Cancelled |

The sidebar displays the WareOS brand mark — an orange dot followed by "WAREOS" in monospace capitals — alongside your organization name. Active navigation items are highlighted with a soft orange tint background and an orange left border.

---

## 2. Key Concepts Glossary

**Tenant**
A single company or organisation using the system. Your company is one tenant. Another company using the same software installation is a separate tenant. Your data and theirs never mix. Think of a tenant as a separate filing cabinet in a shared office — same building, but only you have the key to yours.

**Module**
A feature set that can be switched on or off for your company. The system ships with nine modules (inventory, purchase, sale, dispatch, returns, analytics, shortage tracking, user management, and audit trail). If your business only does inbound purchasing and stock management, you can leave the sale and returns modules disabled. Modules are like apps on a phone — you install only what you need.

**Location**
A physical place where stock is stored or handled. This could be a warehouse, a storage yard, a depot, or a shop floor. Each location is named and managed separately. Users can be assigned to specific locations, so a warehouse keeper in Delhi only sees the Delhi location.

**Commodity**
Any product, raw material, or good that your business trades or stores. Each commodity has a name, a unit of measure, and optionally a category and custom attributes. Examples: wheat, rice, fertiliser bags, steel rods.

**Unit of Measure**
How a commodity is measured and counted. The system comes pre-loaded with common units: kg, MT (metric tonne), qtl (quintal), g (gram), L (litre), pc (piece), bag, and box. You can rely on these without adding anything new.

**Dispatch**
A transfer of goods from one location to another. For example, moving 50 MT of wheat from your main warehouse to a distribution depot. Each dispatch gets a unique reference number (DSP-000001, DSP-000002, and so on). A dispatch can have a shortage or excess recorded when the goods arrive at the destination — the actual received quantity may differ from what was sent.

**Purchase**
An inbound transaction recording goods received from a supplier. When a truck arrives from a vendor with a load of commodities, you create a purchase entry. Each purchase gets a unique reference number (PUR-000001, and so on).

**Sale**
An outbound transaction recording goods sold and sent to a customer. When you dispatch an order to a buyer, you create a sale entry. Each sale gets a unique reference number (SAL-000001, and so on).

**Stock**
The current quantity of each commodity at each location, calculated automatically from all recorded purchases, dispatches, and sales. You never type a stock number directly — the system computes it from transactions.

**Shortage (and Gain)**
When goods are dispatched from one location but the quantity received at the destination is less than expected, the difference is called a shortage. If more arrives than was sent, that is a gain. The shortage tracking module monitors these discrepancies over time, grouped by route, transporter, or commodity.

**Custom Field**
An extra piece of information you define yourself. If the standard commodity form does not have a field for "moisture content" or "grade," you can add one. Custom fields let you extend the system without changing the underlying software. See Section 8 for details.

**Audit Trail**
A permanent, append-only record of every action taken in the system. Every time someone creates, updates, or deletes a record, an entry is written to the audit log with the user's name, what changed, and when. This log cannot be edited or deleted. Think of it as a security camera recording for your data.

**Sequence Counter**
The mechanism that auto-numbers your documents. The first dispatch you create is DSP-000001, the next is DSP-000002, and so on. These numbers never repeat and cannot be changed manually.

**Return**
A transaction that reverses part or all of a previous purchase or sale. A purchase return sends goods back to a supplier (for example, damaged or incorrect items). A sale return accepts goods back from a customer (for example, a rejected shipment). Returns are always linked to the original transaction and affect stock levels accordingly. The returns module must be enabled for your tenant before you can create returns.

**Module Gating**
The mechanism by which features appear or disappear based on which modules your company has enabled. For example, the "Create Return" button on a purchase detail page only appears when the returns module is turned on. When a module is disabled, all of its related buttons, pages, and sidebar entries are hidden entirely — they are not shown in a disabled or greyed-out state.

---

## 3. The Big Picture: Two Layers of the System

The system has two distinct layers. Understanding which layer you work in determines what you can see and do.

### Layer 1: The Platform (Super Admin)

The super admin is the person or team who operates the software platform itself. They do not manage warehouses — they manage which companies (tenants) have access to the system.

A super admin can:
- Create new tenant accounts (new companies)
- Enable or disable modules for each tenant
- View a list of all tenants and their status
- Access the super admin panel at `/admin`

A super admin cannot see the internal data of any tenant (stock levels, orders, etc.) unless they also have a user account inside that tenant.

If you are a business owner who purchased access to this system from a service provider, the service provider is the super admin.

### Layer 2: Your Company (Tenant)

Once a tenant account exists, the tenant admin (usually the business owner or IT administrator) sets up the company. Everything happens inside your company's URL, which looks like:

```
https://your-app.com/t/your-company-name/...
```

Inside your tenant, you have:
- Your own locations, commodities, and contacts
- Your own users with their own roles and permissions
- Your own transaction records (purchases, sales, dispatches, and returns)
- Your own settings and custom fields

No other company can see any of this.

---

## 4. Modules — What Each One Does

The system is divided into nine modules. Each module solves a distinct business problem. They are listed here roughly in the order you would set them up.

---

### 4.1 Inventory

**The foundation — everything else depends on this.**

The inventory module is where you define the basic building blocks of your operation: your locations, your commodities, your contacts (suppliers and customers), and your units of measure. Without this module, nothing else works.

**What you can do:**
- Add, edit, and archive physical locations (warehouses, depots, yards)
- Add, edit, and archive commodities (the goods you trade)
- Add suppliers and customers (called contacts)
- Manage units of measure
- Define custom field types for commodities and other records
- View the current stock across all locations

**Data it tracks:**
- Location names, addresses, and status
- Commodity names, categories, and measurement units
- Contact names, types (supplier/customer/both), and details
- Stock quantities (calculated from transactions)

**Dependencies:** None. This is always enabled.

---

### 4.2 Purchase

**For recording goods coming in from suppliers.**

Every time you receive goods from a vendor, you create a purchase record. The purchase module tracks what arrived, from whom, at which location, on which date, and in what quantity.

**What you can do:**
- Create a purchase order linked to a supplier and a location
- Add multiple line items (different commodities and quantities) to one purchase
- Record the date goods were received
- Edit or cancel purchases
- View a history of all purchases, filterable by date or supplier
- Initiate a purchase return (if the returns module is enabled) — a **Create Return** button appears on the purchase detail page, linking directly to the returns form pre-filled with the purchase data

**Data it tracks:**
- Unique purchase number (PUR-000001...)
- Supplier name and contact
- Receiving location
- Date of receipt
- Line items: commodity, quantity, unit, and any notes
- Custom fields you have defined

**Dependencies:** Inventory module must be enabled.

---

### 4.3 Sale

**For recording goods going out to customers.**

When you sell and dispatch goods to a buyer, you create a sale record. The sale module mirrors the purchase module but for outbound stock.

**What you can do:**
- Create a sale record linked to a customer and a source location
- Add multiple line items per sale
- Record the sale date
- View a history of all sales
- Accept a sale return (if the returns module is enabled) — an **Accept Return** button appears on the sale detail page, linking directly to the returns form pre-filled with the sale data

**Data it tracks:**
- Unique sale number (SAL-000001...)
- Customer name and contact
- Source location
- Date of sale
- Line items: commodity, quantity, unit, and any notes
- Custom fields you have defined

**Dependencies:** Inventory module must be enabled.

---

### 4.4 Dispatch

**For moving goods between your own locations.**

A dispatch is an internal stock transfer. No money changes hands — you are simply moving inventory from one of your locations to another. The dispatch module also calculates whether what arrived matches what was sent.

**What you can do:**
- Create a dispatch from a source location to a destination location
- Add multiple commodities to a single dispatch
- Record the actual received quantity at the destination (which may differ from what was sent)
- View all dispatches and filter by date, location, or commodity

**Data it tracks:**
- Unique dispatch number (DSP-000001...)
- Source and destination locations
- Dispatch date and (optionally) receipt date
- Transporter or route name
- Line items: commodity, dispatched quantity, received quantity
- Shortage or gain: automatically computed as `received - dispatched`

**Dependencies:** Inventory module must be enabled.

---

### 4.5 Analytics

**For executive dashboards and movement summaries.**

The analytics module gives you a bird's-eye view of your operation. Instead of looking at individual transactions, you see aggregated charts and summary tables: how much stock moved last month, which commodity moves the most, which location is busiest.

**What you can do:**
- View stock-on-hand summaries across all locations
- See commodity movement over time (inbound vs. outbound)
- Filter dashboards by date range, location, or commodity
- Export data for external reporting (if you have export permission)

**Data it tracks:**
- Aggregated views built from purchase, sale, and dispatch records — no new data is entered here

**Dependencies:** Inventory module must be enabled.

---

### 4.6 Shortage Tracking

**For monitoring losses during transport.**

Over time, recurring shortages on a particular route, with a particular transporter, or for a particular commodity add up. The shortage tracking module aggregates all the shortage data from dispatches and presents it in one place so you can identify patterns and take corrective action.

**What you can do:**
- View total shortages grouped by transporter, route, or commodity
- Filter by date range
- Identify which routes or transporters have the worst track records

**Data it tracks:**
- Shortage and gain amounts pulled from dispatch records — no new data is entered here

**Dependencies:** Inventory and Dispatch modules must be enabled.

---

### 4.7 User Management

**For controlling who can access what.**

The user management module lets you invite team members, assign them roles, and control exactly which actions they are allowed to perform. You can also restrict individual users to specific locations.

**What you can do:**
- Invite new users by email
- Set a user's role (admin or employee)
- Toggle individual permissions for each user (see Section 7 for the full list)
- Assign a user to one or more locations (they will only see data for those locations)
- Deactivate a user without deleting their history

**Data it tracks:**
- User profiles and roles
- Permission flags per user
- Location assignments per user

**Dependencies:** None. Always available to tenant admins.

---

### 4.8 Audit Trail

**For accountability and compliance.**

Every action in the system — creating a dispatch, editing a commodity, deleting a contact — is automatically recorded in the audit log. This module lets you view and search that log.

**What you can do:**
- Search the audit log by user, date, action type, or record type
- See exactly what changed (before and after values)
- Export the audit log for compliance purposes

**Data it tracks:**
- Who performed each action (user ID and name)
- What action was performed (create, update, delete)
- Which record was affected (type and ID)
- When it happened (timestamp)
- What the data looked like before and after the change

**Dependencies:** None. All modules write to the audit log automatically.

---

### 4.9 Returns

**For handling goods sent back to suppliers or received back from customers.**

The returns module manages reverse logistics. A purchase return sends goods back to a supplier — for example, if a delivery contained damaged or incorrect items. A sale return accepts goods back from a customer — for example, if a shipment was rejected or partially defective.

Returns are never standalone records. Every return is linked to an original purchase or sale transaction, ensuring full traceability. When a return is created, stock levels are adjusted automatically at the relevant location.

**What you can do:**
- Create a purchase return from any purchase detail page (via the **Create Return** button in the top-right corner)
- Create a sale return from any sale detail page (via the **Accept Return** button in the top-right corner)
- Track return status and trace it back to the originating transaction
- View a history of all returns

**How it integrates with other modules:**
- On the **purchase detail page**, a "Create Return" button appears when this module is enabled. Clicking it navigates to the returns form pre-linked to that purchase.
- On the **sale detail page**, an "Accept Return" button appears when this module is enabled. Clicking it navigates to the returns form pre-linked to that sale.
- When the returns module is **disabled** for a tenant, these buttons are completely absent from the page — not shown in a disabled state.

**Data it tracks:**
- Link to the original purchase or sale
- Return type (purchase return or sale return)
- Commodities and quantities being returned
- Return date and status
- Audit trail entries for all return actions

**Dependencies:** Inventory module must be enabled. Purchase module is required for purchase returns. Sale module is required for sale returns.

---

## 5. Setup From Scratch

This section walks you through getting the system running for the first time. It assumes you have access to a computer with an internet connection and basic comfort using a terminal (command-line window).

### Step 1: Get the Code

If someone has provided you with the project files, skip this step. Otherwise, the code lives in a Git repository. Ask your developer to provide you with the project folder.

### Step 2: Create a Supabase Account

Supabase is the cloud database service that stores all your data.

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project. Choose a name (e.g., "warehouse-management") and a strong database password. Write down this password — you will need it later.
3. Wait for the project to finish setting up (usually about one minute).

### Step 3: Get Your Supabase Keys

Once your Supabase project is ready:

1. In the Supabase dashboard, click **Settings** in the left sidebar, then **API**.
2. You will see two important values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string of letters and numbers
   - **service_role** key — another long string (keep this secret — it has full database access)

Copy these three values. You will paste them into the configuration file in the next step.

### Step 4: Create Your Configuration File

Inside the project folder, create a file called `.env.local`. This file tells the application where to find the database.

Open the file in any text editor and paste the following, replacing the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save the file. Do not share this file with anyone and do not commit it to a code repository — it contains sensitive credentials.

### Step 5: Install Node.js and pnpm

The application is built with Node.js, a software runtime, and managed with pnpm, a package manager.

1. Download and install Node.js version 18 or higher from [nodejs.org](https://nodejs.org). Choose the "LTS" version.
2. Once Node.js is installed, open a terminal window and run:
   ```
   npm install -g pnpm
   ```
   This installs pnpm globally.

### Step 6: Install Project Dependencies

In your terminal, navigate to the project folder:

```
cd /path/to/warehouse-management
```

Then install all required packages:

```
pnpm install
```

This may take a minute or two.

### Step 7: Run the Database Migrations

The database needs tables before the app can store anything. Migrations are scripts that create those tables automatically.

Run:

```
pnpm supabase db push
```

Or, if you are using the Supabase CLI directly:

```
supabase db push
```

This applies all the migration files in the `supabase/migrations/` folder to your Supabase database.

### Step 8: Start the Development Server

Run:

```
pnpm dev
```

You will see output like:

```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

Open your browser and go to `http://localhost:3000`. You should see the application.

### Step 9: Create Your First Tenant

As the super admin:

1. Navigate to `http://localhost:3000/admin`.
2. Create a new tenant for your company. Give it a short "slug" (a URL-safe name, e.g., `acme-corp`). This becomes part of your company's URL: `/t/acme-corp/`.
3. Enable the modules your business needs. WareOS offers nine modules; enable only the ones relevant to your operations.

### Step 10: Register and Log In

1. Go to `http://localhost:3000/t/acme-corp/` (replace `acme-corp` with your slug).
2. Register with your email and a password.
3. The super admin will need to associate your user account with the tenant.

You are now ready to use the system.

---

## 6. Daily Workflows

This section describes the most common tasks you will perform day to day. Follow these steps in order.

---

### Workflow A: Add a New Location

A location is a physical place where you store goods. Add locations before creating any transactions.

1. Navigate to **Inventory > Locations** in the sidebar.
2. Click **Add Location**.
3. Enter the location name (e.g., "Main Warehouse - Delhi").
4. Optionally add an address or description.
5. Click **Save**.

The location is now available to use in purchases, sales, and dispatches.

---

### Workflow B: Add a New Commodity

A commodity is a product or good you trade or store.

1. Navigate to **Inventory > Commodities**.
2. Click **Add Commodity**.
3. Enter the commodity name (e.g., "Basmati Rice").
4. Select the unit of measure (e.g., MT for metric tonne).
5. Optionally assign a category.
6. If you have created custom fields for commodities (see Section 8), fill those in too.
7. Click **Save**.

The commodity is now available to select when creating purchases, sales, and dispatches.

---

### Workflow C: Create a Dispatch

A dispatch moves goods from one of your locations to another.

1. Navigate to **Dispatch > New Dispatch**.
2. Select the **source location** (where goods are leaving from).
3. Select the **destination location** (where goods are going to).
4. Enter the dispatch date.
5. Optionally enter the transporter name or route.
6. Click **Add Item** and select a commodity. Enter the quantity being dispatched.
7. Repeat step 6 for each commodity in this dispatch.
8. Click **Submit**.

The system assigns a unique dispatch number (e.g., DSP-000001). Stock is immediately deducted from the source location.

---

### Workflow D: Receive a Dispatch and Record Shortage or Gain

When the goods arrive at their destination, you record the actual quantity received. The system computes the difference automatically.

1. Navigate to **Dispatch** and find the dispatch by its reference number.
2. Click **Record Receipt**.
3. For each line item, enter the **actual quantity received**.
   - If this matches the dispatched quantity, type the same number.
   - If less arrived (shortage), type the smaller amount.
   - If more arrived (gain), type the larger amount.
4. Enter the receipt date.
5. Click **Confirm Receipt**.

The system calculates and stores the shortage or gain for each line item. Stock is added to the destination location based on the received quantity. The shortage tracking module will reflect this data automatically.

---

### Workflow E: View Current Stock

To see how much of each commodity you currently hold at each location:

1. Navigate to **Inventory > Stock**.
2. The stock view shows every commodity at every location with current quantity.
3. Use the filters at the top to narrow by location or commodity.

Stock levels are always current — they reflect every purchase, sale, and dispatch that has been entered.

---

### Workflow F: Create a Purchase Return

When goods received from a supplier need to be sent back (damaged, incorrect, or excess):

1. Navigate to **Purchases** in the sidebar.
2. Find the purchase by its reference number and click on it to open the detail page.
3. In the top-right corner, click **Create Return**. (This button only appears if the returns module is enabled for your company. If you do not see it, ask your admin to enable the returns module.)
4. You are taken to the returns form, which is pre-linked to the original purchase.
5. Select the commodities and quantities being returned.
6. Enter the return date and any notes.
7. Click **Submit**.

Stock at the purchase's receiving location is adjusted to reflect the returned goods.

---

### Workflow G: Accept a Sale Return

When a customer returns goods that were previously sold:

1. Navigate to **Sales** in the sidebar.
2. Find the sale by its reference number and click on it to open the detail page.
3. In the top-right corner, click **Accept Return**. (This button only appears if the returns module is enabled for your company. If you do not see it, ask your admin to enable the returns module.)
4. You are taken to the returns form, which is pre-linked to the original sale.
5. Select the commodities and quantities being returned.
6. Enter the return date and any notes.
7. Click **Submit**.

Stock at the sale's source location is adjusted to reflect the returned goods.

---

## 7. User Roles and Permissions

The system has three types of users. Understanding roles helps you set up your team correctly.

### Super Admin

The super admin manages the software platform itself. There is typically one super admin — the person or company running the hosted service.

Super admins can:
- Create and manage tenant accounts
- Enable or disable modules for each tenant
- Access all system-level settings

Super admins do not have access to tenant data (stock levels, orders, contacts) unless explicitly added as a tenant user.

### Tenant Admin

The tenant admin is the business owner or primary manager within a company. Every tenant should have at least one admin.

Tenant admins can:
- Access all features of all enabled modules
- Manage users (invite, configure, deactivate)
- Configure custom fields
- View the audit trail
- Change module settings

### Employee (Managed User)

An employee is any user who is not an admin. Their access is controlled by the 16 permission flags below. By default, all employees can view stock. All other permissions are off by default and must be explicitly enabled.

---

### The 16 Permission Flags

When you add a user to your team, you can toggle any combination of these permissions. Each flag grants access to a specific capability.

| Permission | What It Allows |
|---|---|
| **Can Purchase** | Create and manage purchase records (inbound goods from suppliers) |
| **Can Dispatch** | Create and manage dispatch records (inter-location transfers) |
| **Can Receive** | Record receipt confirmations on dispatches, entering actual quantities |
| **Can Sale** | Create and manage sale records (outbound goods to customers) |
| **Can View Stock** | View the current stock levels (this is on by default for all users) |
| **Can Manage Locations** | Add, edit, and archive locations |
| **Can Manage Commodities** | Add, edit, and archive commodities |
| **Can Manage Contacts** | Add, edit, and archive suppliers and customers |
| **Can View Analytics** | Access the analytics dashboards and reports |
| **Can Export Data** | Download reports and data exports |
| **Can View Audit Log** | Access the full audit trail |
| **Can Manage Payments** | Create and manage payment records linked to purchases and sales |
| **Can Manage Alerts** | Configure and manage stock alert thresholds |
| **Can Generate Documents** | Generate PDF documents (dispatch challans, GRNs, delivery notes) |
| **Can Manage Lots** | Create and manage lot tracking records (FIFO allocation, expiry tracking) |
| **Can Manage Returns** | Create and manage purchase returns and sale returns |

Returns are auto-numbered with the prefix **RET-** (e.g. `RET-000001`). Confirmed returns automatically adjust stock levels: a **sale return** increases stock at the location (goods come back from the customer), while a **purchase return** decreases stock (goods go back to the supplier).

### How to Assign Permissions

1. Navigate to **User Management > Users**.
2. Find the user you want to configure.
3. Click **Edit Permissions**.
4. Toggle each permission on or off.
5. Click **Save**.

Changes take effect the next time the user loads a page.

### Location Restrictions

In addition to permissions, you can restrict a user to specific locations. A restricted user only sees data (stock, dispatches, purchases) for their assigned locations.

1. Navigate to **User Management > Users**.
2. Click **Edit Locations** for the user.
3. Select the locations they should have access to.
4. Click **Save**.

If no location restriction is set, the user can see all locations.

---

## 8. Custom Fields

### What They Are

Custom fields let you add extra information to records that the system does not capture by default. For example, a standard commodity record has a name and a unit of measure. If your business also needs to track "moisture content" or "grade" or "HSN code," you create custom fields for those.

Custom fields are defined once and then appear as form fields whenever you create or edit a record of that type.

### Why They Exist

Every business tracks slightly different information. Instead of forcing everyone to use the same rigid form, the system lets each tenant define the extra fields their business needs. This avoids messy workarounds like stuffing extra information into the "notes" field.

### How to Create a Custom Field

1. Navigate to **Inventory > Custom Fields**.
2. Click **Add Custom Field**.
3. Fill in the following:
   - **Name:** The label that will appear on the form (e.g., "Moisture Content").
   - **Key:** A short identifier used internally, no spaces (e.g., `moisture_content`). This is filled in automatically from the name but you can change it.
   - **Type:** Choose the kind of value this field stores:
     - **Text** — free-form text
     - **Number** — a numeric value
     - **Date** — a calendar date
     - **Boolean** — a yes/no checkbox
     - **Select** — a dropdown with options you define
   - **Entity Type:** Which type of record this field belongs to (e.g., Commodity, Contact, Purchase Item).
   - **Required:** Whether this field must be filled in before saving.
4. Click **Save**.

### Where Custom Fields Appear

Once created, the field automatically appears on the create and edit forms for the record type you chose. The value is stored alongside the record and appears in detail views and exports.

---

## 9. The Audit Trail

### What It Records

Every time a record is created, modified, or deleted in the system, the audit trail writes a permanent entry. This includes:

- The name and ID of the user who made the change
- The type of action (create, update, or delete)
- The type of record affected (e.g., dispatch, commodity, user)
- The ID of the specific record
- The exact timestamp
- The data before and after the change (for updates)

### Why It Matters

The audit trail serves two purposes. First, it provides accountability — you can always find out who made a change and when. Second, it provides a recovery reference — if data looks wrong, you can trace back through history to find where the problem was introduced.

The audit log is append-only, meaning entries can never be edited or deleted, even by an admin. This is by design to ensure its integrity.

### How to Access It

1. Navigate to **Audit Trail** in the sidebar. (This option is only visible to users with the **Can View Audit Log** permission.)
2. The log shows the most recent entries first.
3. Use the filters to narrow down:
   - **By user** — see all actions taken by a specific team member
   - **By date range** — see what happened during a specific period
   - **By action type** — filter to only creates, only updates, or only deletes
   - **By record type** — see changes to dispatches only, purchases only, etc.
4. Click on any entry to see the full before/after detail.

### Exporting the Audit Log

If you have the **Can Export Data** permission, you can export the filtered audit log as a CSV file for compliance reporting or external analysis.

---

## 10. Deploying to Production

Running the app on your own laptop (the "development server" from Section 5) is fine for testing. But to use it as a real business tool — accessible from anywhere, always on, and stable — you need to deploy it to the cloud.

The recommended setup is Vercel (for the application) and Supabase (for the database). Both have free tiers and take about 30 minutes to set up.

### What Vercel Does

Vercel hosts your Next.js application. It gives you:
- A public URL (e.g., `https://your-app.vercel.app`) that anyone with internet access can reach
- Automatic restarts if the app crashes
- Zero-downtime deploys when you push code changes
- HTTPS (secure connection) out of the box

### What Supabase Does

Supabase hosts your PostgreSQL database in the cloud. It gives you:
- A managed database that backs up automatically
- Authentication (login/signup) built in
- A visual dashboard for inspecting your data

### Step-by-Step Deployment

**Step 1: Push your code to GitHub**

The easiest way to deploy to Vercel is from a GitHub repository. If your code is already on GitHub, skip ahead.

1. Create a free account at [github.com](https://github.com).
2. Create a new repository (private is fine).
3. Follow GitHub's instructions to push your project folder to the repository.

**Step 2: Deploy to Vercel**

1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New Project**.
3. Connect your GitHub account and select your warehouse management repository.
4. Vercel will detect that this is a Next.js project automatically.
5. Before clicking Deploy, click **Environment Variables** and add the four variables from your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` — set this to your Vercel URL (e.g., `https://your-app.vercel.app`)
6. Click **Deploy**.

Vercel builds and deploys your app. This usually takes two to three minutes. When it finishes, you get a live URL.

**Step 3: Update your Supabase settings**

1. In your Supabase project dashboard, go to **Authentication > URL Configuration**.
2. Add your Vercel URL to the **Site URL** field.
3. Add your Vercel URL to the **Redirect URLs** list.

This ensures that login email links redirect correctly to your live app.

**Step 4: Run migrations on the production database**

Your production Supabase database starts empty. You need to apply the migrations, just like you did locally.

If you have the Supabase CLI installed locally:

```
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"
```

Replace the URL with your production database connection string, found in Supabase under **Settings > Database > Connection string**.

Alternatively, if you have the SQL editor open in Supabase, you can paste and run each migration file manually from the `supabase/migrations/` folder in order.

**Step 5: Test the live app**

Visit your Vercel URL in a browser. You should see the login page. Create your super admin account, set up your tenant, and verify that everything works.

---

## 11. Troubleshooting

### Problem 1: The app shows "Invalid API key" or a Supabase connection error

**Cause:** The `.env.local` file (or Vercel environment variables) are missing or incorrect.

**Fix:** Double-check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly and match what is shown in your Supabase project's API settings. Restart the development server after making changes to `.env.local`.

---

### Problem 2: The database shows "table not found" or similar errors

**Cause:** The database migrations have not been run yet, so the required tables do not exist.

**Fix:** Run `pnpm supabase db push` from the project folder. If you are on the live (production) database, run the migrations against the production connection string as described in Step 4 of Section 10.

---

### Problem 3: Data from one company appears in another company's account

**Cause:** The tenant schema is not being applied correctly. This usually means the `SUPABASE_SERVICE_ROLE_KEY` environment variable is missing or wrong, or the tenant slug is misconfigured.

**Fix:** Verify that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`. Verify that the tenant slug in the URL matches the slug stored in the `public.tenants` table in your database.

---

### Problem 4: A module is not visible in the sidebar

**Cause:** The module is not enabled for your tenant.

**Fix:** Log in as the super admin and navigate to `/admin`. Find your tenant and check which modules are enabled. Toggle on the module you need and save. The tenant user may need to refresh their browser.

---

### Problem 5: A user cannot see a feature they should have access to

**Cause:** The user does not have the required permission flag enabled.

**Fix:** As a tenant admin, go to **User Management > Users**, find the user, and click **Edit Permissions**. Enable the appropriate permission (e.g., "Can Purchase" to allow creating purchase records) and save.

---

### Problem 6: Stock levels look wrong or have not updated after a transaction

**Cause:** Stock is calculated from transactions. If a transaction was not saved correctly, or was saved to the wrong location, the stock total will be off.

**Fix:**
1. Go to **Inventory > Stock** and note the discrepancy.
2. Check the recent purchases, sales, and dispatches for that commodity at that location.
3. Look for a transaction saved with the wrong location, wrong commodity, or incorrect quantity.
4. Edit or delete the incorrect transaction.

If you cannot find the source of the discrepancy, use the **Audit Trail** to trace all recent changes to that commodity.

---

### Problem 7: Shortage figures are not appearing in the shortage tracking module

**Cause:** Shortage figures are calculated from dispatch receipt records. If dispatches have not had receipts recorded against them, or if the dispatch module is not enabled, shortage data will be empty.

**Fix:**
1. Confirm the Dispatch module and Shortage Tracking module are both enabled.
2. Go to **Dispatch** and find the relevant dispatch.
3. If the receipt has not been recorded yet, click **Record Receipt** and enter the received quantities.
4. Once saved, the shortage tracking module will reflect the new data.

---

### Problem 8: Users cannot log in or receive no confirmation email

**Cause:** Supabase email authentication is not configured, or the redirect URL is not set correctly.

**Fix:**
1. In Supabase, go to **Authentication > Email Templates** and ensure email confirmations are enabled.
2. Go to **Authentication > URL Configuration** and add your app's URL (both local and production) to the allowed redirect URLs list.
3. Check the **Logs** section in Supabase for authentication errors.

---

### Problem 9: Document numbers (DSP, PUR, SAL) are not incrementing correctly or appear to have reset

**Cause:** Sequence counters are stored in the `sequence_counters` table. If this table was accidentally cleared, or if migrations were re-run on a database with existing data, counters may reset.

**Fix:** Check the `sequence_counters` table in the Supabase SQL editor. You should see rows for `dispatch`, `purchase`, and `sale` with their current values. If the counter is lower than the number of existing records, update it manually:

```sql
UPDATE tenant_yourslug.sequence_counters
SET current_value = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(dispatch_number FROM '[0-9]+$') AS INTEGER)), 0)
  FROM tenant_yourslug.dispatches
)
WHERE name = 'dispatch';
```

Replace `yourslug` with your actual tenant slug, and repeat for `purchase` and `sale` as needed.

---

### Problem 10: A user cannot see a location or its data

**Cause:** The user has a location restriction applied. They are only assigned to specific locations, and the location they are looking for is not in their assigned list.

**Fix:** As a tenant admin, go to **User Management > Users**, find the user, and click **Edit Locations**. Add the location they should have access to and save. Alternatively, if the user should see all locations, clear their location restrictions entirely.

---

### Problem 11: The "Create Return" or "Accept Return" button is not visible on purchase/sale detail pages

**Cause:** The returns module is not enabled for your tenant.

**Fix:** Log in as the super admin and navigate to `/admin`. Find your tenant, and enable the **returns** module. Save your changes. The tenant user should refresh their browser — the button will now appear on purchase and sale detail pages.

Note: the button is completely hidden when the module is disabled, not greyed out. This is by design (module gating).

---

### Problem 12: The app looks different from what is described here (dark theme, different fonts)

**Cause:** You may be running an older version of the application from before the WareOS visual overhaul.

**Fix:** Pull the latest code from the repository and rebuild the application (`pnpm build`). The current design uses white backgrounds, orange (#F45F00) accents, and three Google Fonts (Hedvig Letters Serif, Rethink Sans, Space Mono). If you see dark backgrounds with amber accents, your codebase is out of date.

---

*For technical assistance, contact your system administrator or refer to the developer documentation in `README.md` and `docs/deployment.md`. WareOS is the brand name for the Warehouse Management System platform.*

---

## v2 Updates — New Modules and Enhancements

WareOS expanded from 9 to 15 modules in v2. Six new modules were released alongside a mobile-optimised receiving experience and six new permission flags. All existing functionality is unchanged — the sections below extend the manual with everything that is new.

---

### 4.10 Payments

**Module ID:** `payments` | **Required permission:** Can Manage Payments | **Depends on:** inventory

The Payments module lets you record money received or paid against any purchase or sale. It maintains a running balance — total document value minus total payments received — so you always know what is outstanding at a glance.

**What you can do:**
- Record a payment against a purchase or a sale from the detail page
- Enter payment date, amount, method (cash, bank transfer, cheque, etc.), and an optional reference number
- View the full payment history for any purchase or sale
- Void a payment if it was entered in error
- Each payment is automatically assigned a sequence number (PAY-000001, PAY-000002, …)

**Data it tracks:**
- Payment amount and currency
- Payment method and reference
- Date recorded and which user recorded it
- Outstanding balance (recalculated in real time)

---

### 4.11 Stock Alerts

**Module ID:** `stock-alerts` | **Required permission:** Can Manage Alerts | **Depends on:** inventory

The Stock Alerts module lets you define minimum-stock and reorder-point thresholds for any commodity at any location. The system continuously compares current stock against these thresholds and surfaces alerts when stock falls below the configured levels.

**What you can do:**
- Set a minimum-stock threshold and a reorder-point threshold per commodity + location combination
- Toggle any alert threshold active or inactive without deleting it
- View a dashboard summary widget showing the count of OK, WARNING, and CRITICAL commodities
- Receive a clear visual indicator for each state directly from the inventory view

**Alert states:**

| State | Meaning |
|---|---|
| **OK** | Current stock is above the reorder point |
| **WARNING** | Stock has fallen below the reorder point but is above the minimum |
| **CRITICAL** | Stock has fallen below the minimum threshold |

**Data it tracks:**
- Thresholds per commodity + location pair
- Current alert state (OK / WARNING / CRITICAL)
- Whether the threshold is active or paused

---

### 4.12 Document Generation

**Module ID:** `document-gen` | **Required permission:** Can Generate Documents | **Depends on:** inventory

The Document Generation module enables PDF downloads for three key business documents: Dispatch Challan, Goods Receipt Note (GRN), and Delivery Note. Before documents can be generated, you must configure your company branding in Settings.

**What you can do:**
- Configure company name, address, and logo in **Settings > Documents**
- Download a **Dispatch Challan** PDF from the dispatch detail page (summarises outbound goods)
- Download a **Goods Receipt Note (GRN)** PDF from the purchase detail page (confirms goods received from a supplier)
- Download a **Delivery Note** PDF from the sale detail page (accompanies goods sent to a customer)

**Data it tracks:**
- Company branding configuration (name, address, logo URL)
- Document metadata embedded in each generated PDF (reference number, date, parties, line items)

> **Note:** The PDF download button only appears if the module is enabled and document configuration has been saved. If you do not see the button, check both conditions.

---

### 4.13 Lot Tracking

**Module ID:** `lot-tracking` | **Required permission:** Can Manage Lots | **Depends on:** inventory, purchase

The Lot Tracking module adds batch/lot-level traceability to your stock. Lots are assigned when goods arrive (on purchase creation) and consumed FIFO (first in, first out) when goods leave via dispatch or sale.

**What you can do:**
- Assign a lot number and optional expiry date when creating a purchase
- Select from available lots using the FIFO-ordered lot selector on dispatch and sale items
- View current stock levels broken down by lot number
- View expiry dates and flag near-expiry lots
- Trace every movement (in and out) for a specific lot

**Data it tracks:**
- Lot number and expiry date per purchase line
- Quantity received, consumed, and remaining per lot
- Movement history per lot (which dispatches or sales consumed it)

---

### 4.14 Bulk Import / Export

**Module ID:** `bulk-import` | **Required permission:** Can Import Data | **Depends on:** inventory

The Bulk Import / Export module lets you upload CSV files to create records in bulk and export any entity list to CSV for use in external tools (spreadsheets, accounting software, etc.).

**What you can do:**
- Upload a CSV to bulk-create **commodities**, **contacts**, or **purchases**
- Receive row-level validation errors if any row fails (other rows are still imported)
- Export any entity list (commodities, contacts, dispatches, purchases, sales) to CSV
- Use exported CSVs as a template for future imports

**CSV requirements:**
- The first row must be a header row with the expected column names
- Codes used in CSV rows (commodity code, location code, contact code) must already exist in the system
- Rows with errors are skipped and reported; valid rows are imported successfully

**Data it tracks:**
- Import history (file name, date, rows processed, errors)
- All standard entity data as per the relevant module

---

### 4.15 Barcode & QR Codes

**Module ID:** `barcode` | **Required permission:** None — available to all users | **Depends on:** inventory

The Barcode & QR Codes module generates QR codes for every commodity and provides a print-ready 4-up label sheet. On mobile, scanning a QR code during receiving automatically filters the dispatch item list to the scanned commodity.

**What you can do:**
- View a QR code for any commodity from the commodity detail page
- Print a 4-up label sheet (four labels per A4 page) containing the commodity name, code, and QR code
- On the mobile receiving screen, tap **Scan QR** and point your device camera at a label to auto-filter the item list

**Data it tracks:**
- The QR code encodes the commodity code (no sensitive data is embedded)
- No additional database records are created; codes are generated on demand

---

### Mobile-Optimised Receiving (UX Enhancement)

The dispatch receiving screen (`/dispatches/[id]/receive`) has a dedicated mobile layout that activates automatically on screens narrower than the `md` Tailwind breakpoint (~768 px). No configuration is required — users on phones and tablets get the mobile experience automatically.

**Mobile receiving features:**
- **Card-per-item layout** — each dispatch line is shown as a full-width card with a large quantity input, making it easy to tap without zooming
- **Numeric keyboard** — the quantity field uses `inputMode="numeric"` so the phone keyboard shows only numbers
- **QR scan filter** — if the barcode module is enabled, a **Scan QR** button appears; scanning a commodity QR code scrolls directly to that item and highlights it
- **Real-time shortage badge** — as you type a received quantity lower than the dispatched quantity, a red shortage badge updates instantly
- **Sticky submit button** — the **Submit** button is fixed to the bottom of the screen so it is always reachable without scrolling back to the top

Desktop users continue to see the original table-based layout (`hidden md:block`).

---

### Updated Permissions (v2 Additions)

The following six permissions were added in v2. They appear in **User Management > Users > Edit Permissions** alongside the original permission flags.

| Permission | What It Allows |
|---|---|
| **Can Manage Payments** | Record, view, and void payments on purchases and sales |
| **Can Manage Alerts** | Create, edit, and deactivate stock alert thresholds |
| **Can Generate Documents** | Download Dispatch Challan, GRN, and Delivery Note PDFs |
| **Can Manage Lots** | Create lots, assign them to purchases, view lot stock and trace movements |
| **Can Manage Returns** | Create purchase returns and sale returns (requires returns module) |
| **Can Import Data** | Upload CSV files to bulk-import commodities, contacts, and purchases |

---

## v2 Workflows (H–M)

---

### Workflow H: Record a Payment on a Purchase or Sale

1. Navigate to the **Purchases** or **Sales** section from the sidebar.
2. Click the reference number of the purchase or sale you want to record payment for.
3. On the detail page, scroll to the **Payments** panel. You will see the total value, total paid to date, and outstanding balance.
4. Click **Record Payment**.
5. Fill in the payment date, amount, and payment method. Add an optional reference number (e.g., bank transaction ID).
6. Click **Save**. The payment appears in the history list and the outstanding balance updates immediately.

> To void a payment, click the three-dot menu next to the payment row and select **Void**. This cannot be undone.

---

### Workflow I: Set a Stock Alert Threshold

1. Navigate to **Stock Alerts** in the sidebar (visible when the stock-alerts module is enabled).
2. Click **New Threshold**.
3. Select the **Commodity** and **Location** you want to monitor.
4. Enter the **Reorder Point** (trigger for WARNING state) and the **Minimum Stock** (trigger for CRITICAL state).
5. Ensure the threshold is set to **Active** and click **Save**.
6. The commodity will now appear in the alerts dashboard with its current state colour-coded as OK, WARNING, or CRITICAL.

> To pause monitoring temporarily without deleting the threshold, toggle the threshold to **Inactive**.

---

### Workflow J: Download a Document (Challan / GRN / Delivery Note)

**One-time setup (admin only):**

1. Go to **Settings > Documents**.
2. Enter your company name, address, and optionally a logo URL.
3. Click **Save**.

**Downloading a document:**

- **Dispatch Challan** — open a dispatch detail page and click **Download Challan** (PDF).
- **Goods Receipt Note** — open a purchase detail page and click **Download GRN** (PDF).
- **Delivery Note** — open a sale detail page and click **Download Delivery Note** (PDF).

The PDF opens in a new browser tab and can be saved or printed from there.

---

### Workflow K: Import Records from a CSV File

1. Navigate to **Bulk Import** in the sidebar.
2. Select the entity type you want to import: **Commodities**, **Contacts**, or **Purchases**.
3. Download the **CSV template** for that entity type to see the required column headers.
4. Fill in your data in the template. Codes (commodity code, location code, contact code) must match records already in the system.
5. Click **Upload CSV** and select your file.
6. The system validates each row. A summary shows how many rows were imported successfully and lists any rows that failed with a reason.
7. Fix the failed rows in your spreadsheet and re-upload if needed.

---

### Workflow L: Print Barcode Labels for a Commodity

1. Navigate to **Inventory > Commodities**.
2. Click a commodity name to open its detail page.
3. Scroll to the **Barcode** section. A QR code is shown encoding the commodity code.
4. Click **Print Labels** to open a print-ready page with four labels per A4 sheet.
5. Use your browser's print dialog (Ctrl+P / Cmd+P) to send the page to a printer. For best results, set margins to **None** in the print settings.

---

### Workflow M: Receive a Dispatch on a Mobile Device

1. Open WareOS in your phone's browser and log in.
2. Navigate to **Dispatches** and tap the reference of the dispatch you are receiving.
3. Tap **Receive Goods**. The mobile card layout activates automatically.
4. For each item card, enter the quantity you physically counted in the **Received Qty** field. A numeric keyboard appears automatically.
5. If you have a QR code on the goods, tap **Scan QR** and point your camera at the label. The corresponding item card scrolls into view and is highlighted.
6. If the received quantity is less than dispatched, a red shortage badge appears on the card immediately — note this for your records.
7. When all items are entered, tap the sticky **Submit** button at the bottom of the screen.
8. A confirmation appears and the dispatch status updates to **Received**.

---

## v2 Troubleshooting (Problems 13–16)

---

### Problem 13: Payments panel not visible on purchase or sale detail page

**Cause:** The payments module is not enabled for your tenant.

**Fix:** Log in as the super admin and navigate to `/admin`. Find your tenant and enable the **payments** module. Save your changes. Users should refresh their browser — the Payments panel will appear on both purchase and sale detail pages.

---

### Problem 14: Stock alerts dashboard is empty

**Cause:** Either no alert thresholds have been configured, or the stock-alerts module is not enabled.

**Fix:**
- If the Stock Alerts sidebar item is missing: log in as super admin, navigate to `/admin`, and enable the **stock-alerts** module for your tenant.
- If the module is enabled but the dashboard is empty: no thresholds have been set yet. Follow **Workflow I** to create your first threshold.

---

### Problem 15: PDF download buttons are not appearing on dispatch, purchase, or sale detail pages

**Cause:** Either the document-gen module is not enabled, or the document settings (company name and address) have not been saved.

**Fix:**
1. Log in as the super admin and confirm the **document-gen** module is enabled for your tenant.
2. Log in as a tenant admin and go to **Settings > Documents**. Ensure your company name and address are filled in and saved.
3. Reload the detail page — the download button should now appear.

If only one of the three document types is missing (e.g., GRN appears but Delivery Note does not), check that you have the **Can Generate Documents** permission on your user account.

---

### Problem 16: CSV import fails with "location not found" or "commodity not found"

**Cause:** The CSV file references a location code or commodity code that does not exist in the database. Codes in the import CSV must exactly match codes already configured in the system (case-sensitive).

**Fix:**
1. Export your current commodities and locations to CSV (**Bulk Import > Export**) to get the exact codes used in the system.
2. Open your import file and find any rows flagged in the error summary.
3. Correct the codes in those rows to match the exported values exactly.
4. Re-upload the corrected file.

> If you need to import a commodity that does not yet exist, create it manually first (or include it in a commodities import), then reference its code in the purchases import.
