# WareOS 4-Week Launch Build — Ship Fast, Ship Clean

## Context

WareOS has a solid backend (15 modules, 60+ API endpoints, schema-per-tenant, audit trail, shortage tracking) but a frontend that makes it feel complicated. 15+ flat sidebar items, no search/sort/pagination on any table, forms that show every field at once, no mobile-optimized navigation. Zero paying customers yet.

**Goal:** Make WareOS feel as clean and effortless as Zoho Inventory — without the accounting layer — and ship it within 4 weeks. Everything else waits for real user feedback.

**Philosophy:** Stop planning, start shipping. Build only what makes the existing 18 features *usable*, plus the 3 features no warehouse can operate without (inventory adjustments, GST, items rename). Then get it in front of real warehouse operators.

---

## Week 1–2: UX Foundation

Make the existing app feel clean. This is the highest-leverage work — no new features, just making current features accessible.

### Step 1: Sidebar Restructure

**Problem:** 15+ nav items at equal visual weight. A floor worker sees "Audit Log" and "Analytics" alongside "Dispatch."

**Solution:** Group into 4 collapsible sections:

| Group | Items |
|---|---|
| **Operations** | Purchases, Dispatches, Sales, Returns |
| **Inventory** | Stock Levels, Lots, Shortages, Stock Alerts, Alert Thresholds, Adjustments (new) |
| **Reports** | Analytics, Payments, Audit Log, Import/Export, Barcodes |
| **Settings** | Locations, Items, Contacts, Users (admin-only) |

**Files:**
- `src/core/modules/types.ts` — Add `group?: 'operations' | 'inventory' | 'reports' | 'settings'` to `ModuleNavItem`
- `src/modules/*/manifest.ts` — All 15 manifests get `group` on each navItem
- `src/components/layout/sidebar.tsx` — Rewrite `SidebarContent` to render grouped collapsible sections with chevron toggle
- `src/components/layout/icon-map.tsx` — Add any missing icons (SlidersHorizontal, PackageCheck)

**No DB migration.** No API changes. Pure frontend.

**Checkpoints:**
- [ ] `ModuleNavItem` type updated with `group` field
- [ ] All 15 module manifests have `group` on every navItem
- [ ] `SidebarContent` renders 4 collapsible groups with chevron toggle
- [ ] Groups collapse/expand on click, persist state in localStorage
- [ ] Icon map has all required icons for grouped nav items
- [ ] `pnpm build` passes with zero type errors
- [ ] Visual check: sidebar at desktop (1280px) shows 4 groups, all collapsible
- [ ] Visual check: mobile sidebar (375px) shows same grouped layout in drawer

---

### Step 2: DataTable Component

**Problem:** Every list page is a static HTML table. No search, no sort, no pagination. Users can't find anything.

**Solution:** Build a reusable `DataTable` with @tanstack/react-table v8. Client-side search, sort, pagination (25 rows default). Column visibility toggle.

**Files:**
- Install: `pnpm add @tanstack/react-table`
- Create: `src/components/ui/data-table.tsx`
- Migrate 9 list pages, each gets a co-located `columns.tsx`:
  - `dispatches/page.tsx` + `dispatches/columns.tsx`
  - `purchases/page.tsx` + `purchases/columns.tsx`
  - `sales/page.tsx` + `sales/columns.tsx`
  - `inventory/stock-table.tsx` (inline columns)
  - `payments/page.tsx` + `payments/columns.tsx`
  - `lots/page.tsx` + `lots/columns.tsx`
  - `returns/page.tsx` + `returns/columns.tsx`
  - `stock-alerts/page.tsx` (inline columns)
  - `audit-log/audit-table.tsx` — uses `manualPagination` prop (already has server-side pagination)

**Key decisions:**
- Client-side filtering is fine — datasets are <1000 rows for launch. `manualPagination` prop exists as escape hatch for audit-log and future scale.
- Search input filters on a configurable `searchKey` column (e.g., dispatch_number, purchase_number)
- Style matches existing tokens: `--bg-off` header, `--text-dim` uppercase labels, `hover:bg-[var(--bg-off)]` rows

**No DB migration.** No API changes.

**Checkpoints:**
- [ ] `@tanstack/react-table` installed and in `package.json`
- [ ] `data-table.tsx` component created with: search input, sortable headers (click to toggle), pagination controls (prev/next + page size selector), column visibility dropdown
- [ ] DataTable uses WareOS design tokens (no hardcoded colors)
- [ ] `dispatches/columns.tsx` + page migrated — search by dispatch_number works
- [ ] `purchases/columns.tsx` + page migrated — search by purchase_number works
- [ ] `sales/columns.tsx` + page migrated — search by sale_number works
- [ ] `inventory/stock-table.tsx` migrated — inline columns, search by commodity name
- [ ] `payments/columns.tsx` + page migrated
- [ ] `lots/columns.tsx` + page migrated
- [ ] `returns/columns.tsx` + page migrated
- [ ] `stock-alerts/page.tsx` migrated — inline columns
- [ ] `audit-log/audit-table.tsx` migrated with `manualPagination` (server-side pagination preserved)
- [ ] All 9 pages: sort by any column header, pagination at 25 rows default
- [ ] `pnpm build` passes
- [ ] Visual check: tables match existing header style (mono, uppercase, dim)

---

### Step 3: Collapsible Form Sections

**Problem:** Dispatch/purchase forms show 15+ fields on one screen. Transport details (optional) have same visual weight as required fields.

**Solution:** Wrap form sections in a `FormSection` component. Required sections open by default, optional sections collapsed.

**Files:**
- Create: `src/components/ui/form-section.tsx` — Uses `@radix-ui/react-collapsible` (already installed)
- Modify: `dispatches/new/page.tsx` — Wrap "Locations" (open), "Items" (open), "Transport" (collapsed, badge: "optional")
- Modify: `purchases/new/page.tsx` — Same pattern
- Modify: `sales/new/page.tsx` — Same pattern
- Modify: `returns/new/page.tsx` — Same pattern

**No DB migration.** No API changes.

**Checkpoints:**
- [ ] `form-section.tsx` created: title prop, `defaultOpen` prop, optional badge (e.g., "optional"), chevron animation on open/close
- [ ] `dispatches/new/page.tsx` — Locations section (open), Items section (open), Transport section (collapsed with "optional" badge)
- [ ] `purchases/new/page.tsx` — Same pattern applied
- [ ] `sales/new/page.tsx` — Same pattern applied
- [ ] `returns/new/page.tsx` — Same pattern applied
- [ ] Collapsed sections preserve form state when toggled open/closed
- [ ] `pnpm build` passes
- [ ] Visual check: transport section shows collapsed by default, expands on click
- [ ] Functional check: submit a dispatch with transport collapsed (empty) — should succeed
- [ ] Functional check: submit a dispatch with transport expanded and filled — data saves correctly

---

### Step 4: Global Search (Cmd+K)

**Problem:** Finding a specific dispatch or contact requires navigating to the right page and scrolling. No way to search across entities.

**Solution:** Command palette triggered by Cmd+K. Searches dispatches, purchases, sales, and items by number/name. `CommandDialog` component already exists in the codebase.

**Files:**
- Create: `src/app/api/t/[tenantSlug]/search/route.ts` — GET handler, `?q=` param, ILIKE across 4 entity tables, returns grouped results (max 5 per type)
- Create: `src/components/search/global-search.tsx` — Client component, keyboard listener, debounced 300ms fetch, renders CommandDialog with grouped CommandItems
- Modify: `src/components/layout/header.tsx` — Add GlobalSearch + visible search trigger button (magnifying glass + "Cmd+K" hint)

**Important:** Search route must check `tenant.enabled_modules` before querying each entity table. Must use `withTenantContext()` for auth.

**Checkpoints:**
- [ ] Search API route created at `/api/t/[tenantSlug]/search`
- [ ] API uses `withTenantContext()` for auth
- [ ] API checks `tenant.enabled_modules` before querying each table
- [ ] API returns grouped results: `{ dispatches: [...], purchases: [...], sales: [...], items: [...] }` (max 5 per type)
- [ ] ILIKE query is parameterized (no SQL injection)
- [ ] `global-search.tsx` created with keyboard listener (Cmd+K / Ctrl+K)
- [ ] Search input debounced at 300ms
- [ ] Results grouped by entity type in CommandDialog
- [ ] Clicking a result navigates to the entity detail page
- [ ] Header shows search trigger button with magnifying glass icon + "Cmd+K" hint text
- [ ] Empty state: "No results found" message
- [ ] Loading state: spinner or skeleton while fetching
- [ ] `pnpm build` passes
- [ ] Functional check: type a dispatch number → result appears → click → navigates correctly
- [ ] Functional check: search for an item name → items results appear

---

### Step 5: Bottom Mobile Navigation

**Problem:** Mobile nav is a hamburger drawer that slides in. For 4 core actions, a bottom tab bar is faster — one tap, thumb-reachable.

**Solution:** Fixed bottom nav bar, visible only on mobile (`md:hidden`). 5 tabs: Home, Receive, Dispatch, Stock, More.

**Files:**
- Create: `src/components/layout/mobile-bottom-nav.tsx` — Fixed bottom, 64px height, safe-area padding
- Modify: `src/components/layout/sidebar.tsx` — `MobileSidebar` accepts external `open`/`onOpenChange` props (for "More" tab to trigger it)
- Modify: `src/app/t/[tenantSlug]/layout.tsx` — Add `<MobileBottomNav>`, change main padding to `pb-20 md:pb-6`

**No DB migration.**

**Checkpoints:**
- [ ] `mobile-bottom-nav.tsx` created: 5 tabs (Home, Receive, Dispatch, Stock, More)
- [ ] Fixed to bottom, 64px height, `safe-area-inset-bottom` padding
- [ ] Visible only on mobile (`md:hidden`), hidden on desktop
- [ ] Active tab highlighted with accent color
- [ ] "More" tab opens the full sidebar drawer
- [ ] `MobileSidebar` accepts external `open`/`onOpenChange` props
- [ ] Layout adds bottom padding (`pb-20 md:pb-6`) so content isn't hidden behind nav
- [ ] `pnpm build` passes
- [ ] Visual check at 375px: bottom nav visible, tabs are thumb-reachable
- [ ] Visual check at 1280px: bottom nav hidden, desktop sidebar visible
- [ ] Functional check: tapping each tab navigates to correct page
- [ ] Functional check: "More" opens sidebar drawer with all grouped nav items

---

## Week 3: Core Features

### Step 6: Inventory Adjustments Module

**Problem:** Stock only changes via purchase/dispatch/sale/return. No way to record breakage, spillage, pest damage, or physical count corrections. Stock levels drift from reality within weeks.

**Solution:** New `adjustments` module following existing manifest + migration + CRUD pattern.

**DB Migration (tenant schema):**
```sql
-- adjustment_reasons table
CREATE TABLE "{schema}".adjustment_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('add','remove')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- adjustments table
CREATE TABLE "{schema}".adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number TEXT NOT NULL,
  location_id UUID REFERENCES "{schema}".locations(id),
  commodity_id UUID REFERENCES "{schema}".commodities(id),
  unit_id UUID REFERENCES "{schema}".units(id),
  reason_id UUID REFERENCES "{schema}".adjustment_reasons(id),
  quantity NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- RLS (service_role_only, matches existing pattern)
-- Sequence counter for ADJ-000001
```

**Stock levels integration:** The `stock_levels` view must include adjustment quantities. `CREATE OR REPLACE VIEW` with a UNION that sums adjustments (positive for 'add' direction, negative for 'remove').

**Files to create:**
- `src/modules/adjustments/manifest.ts` — id: 'adjustments', group: 'inventory', permission: canManageAdjustments
- `src/modules/adjustments/migrations/apply.ts` — Tables + RLS + sequence counter
- `src/modules/adjustments/validations/adjustment.ts` — Zod schemas
- `src/app/api/t/[tenantSlug]/adjustments/route.ts` — GET + POST
- `src/app/api/t/[tenantSlug]/adjustments/[id]/route.ts` — GET
- `src/app/api/t/[tenantSlug]/adjustment-reasons/route.ts` — GET + POST
- `src/app/t/[tenantSlug]/adjustments/page.tsx` — List with DataTable
- `src/app/t/[tenantSlug]/adjustments/new/page.tsx` — Form with FormSection

**Files to modify:**
- `src/core/auth/types.ts` — Add `canManageAdjustments` to Permission type
- `src/modules/index.ts` — Register adjustments manifest
- Stock levels view DDL — Add adjustment sums

**Checkpoints:**
- [ ] `canManageAdjustments` added to Permission type in `types.ts`
- [ ] `manifest.ts` created: id 'adjustments', group 'inventory', navItem with icon
- [ ] Module registered in `src/modules/index.ts`
- [ ] Migration creates `adjustment_reasons` table with direction check constraint
- [ ] Migration creates `adjustments` table with all FKs and `deleted_at`
- [ ] RLS policy: `service_role_only` RESTRICTIVE on both tables
- [ ] Sequence counter initialized for `ADJ-000001`
- [ ] Zod validation schemas for create/get adjustment
- [ ] GET `/adjustments` — returns list (filtered by `deleted_at IS NULL`)
- [ ] POST `/adjustments` — creates adjustment + audit log entry
- [ ] GET `/adjustments/[id]` — returns single adjustment
- [ ] GET `/adjustment-reasons` — returns active reasons
- [ ] POST `/adjustment-reasons` — creates reason (admin only)
- [ ] `stock_levels` view updated: includes adjustment sums (add positive, remove negative)
- [ ] List page uses DataTable (from Step 2) with search by adjustment_number
- [ ] New page uses FormSection (from Step 3) with location, item, reason, quantity, notes
- [ ] `pnpm build` passes
- [ ] DB check: tables exist in tenant schema via Supabase Studio
- [ ] Functional check: create adjustment (add 10 bags) → stock level increases by 10
- [ ] Functional check: create adjustment (remove 5 bags, reason: breakage) → stock level decreases by 5
- [ ] Functional check: adjustment appears in audit log

---

### Step 7: GST Basics

**Problem:** PDFs are non-compliant without GSTIN, HSN codes, and tax rates. No Indian business will use WareOS for real transactions without this.

**Solution:** Add GST fields to existing tables. Display on forms and PDFs.

**DB Migration:**
```sql
ALTER TABLE "{schema}".commodities
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;

ALTER TABLE "{schema}".locations
  ADD COLUMN IF NOT EXISTS gstin TEXT;
```

Idempotent via `IF NOT EXISTS`. Add to latest supabase migration for new tenants + run one-off for existing tenants.

**Files to modify:**
- `src/app/t/[tenantSlug]/settings/commodities/commodity-form.tsx` — Add hsn_code (text) + tax_rate (number, 0-28) fields
- `src/app/t/[tenantSlug]/settings/locations/location-form.tsx` — Add gstin (text) field
- `src/modules/document-gen/` PDF templates — Display HSN and tax on line items

**Checkpoints:**
- [ ] Migration adds `hsn_code` and `tax_rate` to commodities table (idempotent)
- [ ] Migration adds `gstin` to locations table (idempotent)
- [ ] Migration runs successfully on existing tenant schemas
- [ ] Commodity form has HSN Code text field
- [ ] Commodity form has Tax Rate number field (0-28 range, step 0.25)
- [ ] Location form has GSTIN text field
- [ ] GSTIN field validates 15-character alphanumeric format (or empty)
- [ ] HSN and tax rate display on PDF line items (dispatch challan, GRN, delivery note)
- [ ] GSTIN displays on PDF headers (from/to location)
- [ ] `pnpm build` passes
- [ ] Functional check: save a commodity with HSN "10063090" and tax rate 5% → values persist on reload
- [ ] Functional check: save a location with GSTIN → value persists
- [ ] Functional check: generate a dispatch PDF → HSN, tax rate, and GSTIN visible

---

### Step 8: Rename Commodities → Items

**Problem:** "Commodities" is grain-specific language. "Items" is universal and prepares for multi-industry without any structural change.

**Solution:** Display-layer rename only. DB table stays `commodities`. API routes stay `/commodities`. Only user-visible labels change.

**Files to modify:**
- `src/modules/inventory/manifest.ts` — navItem label: "Items"
- `src/app/t/[tenantSlug]/settings/commodities/commodities-client.tsx` — All heading/title text
- `src/app/t/[tenantSlug]/settings/commodities/commodity-form.tsx` — Dialog titles
- `src/app/t/[tenantSlug]/dashboard-home.tsx` — Filter label
- `src/app/t/[tenantSlug]/inventory/stock-table.tsx` — Filter label
- Any other files with user-visible "Commodit" strings in JSX

**Audit:** `grep -r "ommodit" src/ --include="*.tsx"` to find all occurrences. Change string literals only, not variable/function names.

**No DB migration.** No API changes.

**Checkpoints:**
- [ ] `grep -r "ommodit" src/ --include="*.tsx"` run — all user-visible occurrences identified
- [ ] Sidebar nav shows "Items" instead of "Commodities"
- [ ] Settings page heading says "Items" not "Commodities"
- [ ] Commodity form dialog titles say "Add Item" / "Edit Item"
- [ ] Dashboard filter label says "Item" not "Commodity"
- [ ] Stock table filter label says "Item" not "Commodity"
- [ ] All other user-visible strings updated (from grep audit)
- [ ] Variable names, function names, DB columns, API routes UNCHANGED
- [ ] `pnpm build` passes
- [ ] Visual check: no remaining "Commodity" / "Commodities" visible in the UI anywhere

---

## Week 4: Mobile Polish

### Step 9: Touch Targets + Quantity Stepper

**Files:**
- Create: `src/lib/hooks/use-is-mobile.ts` — `useIsMobile(breakpoint = 768)` hook
- Create: `src/components/ui/quantity-stepper.tsx` — Large +/- buttons (56x56px) flanking a number input. Long-press accelerates (+10).

**Checkpoints:**
- [ ] `useIsMobile` hook created: returns boolean, uses `matchMedia`, handles SSR (defaults false)
- [ ] `quantity-stepper.tsx` created: +/- buttons at 56x56px, number input between them
- [ ] Long-press on +/- accelerates to +10 after 500ms hold
- [ ] Stepper respects min/max props
- [ ] `pnpm build` passes
- [ ] Visual check at 375px: buttons are easily tappable (56x56px minimum)

---

### Step 10: Stepper Forms on Mobile

**Problem:** Transaction forms are long scrollable pages on mobile. Users lose context.

**Solution:** On mobile, wrap forms in a step wizard. Desktop unchanged.

**Files:**
- Create: `src/components/forms/transaction-stepper.tsx` — Generic stepper shell with progress dots, back/next, sticky bottom buttons
- Modify: `src/app/t/[tenantSlug]/dispatches/new/page.tsx` — Extract `useDispatchForm()` hook for shared state, render stepper on mobile (Step 1: From/To, Step 2: Items, Step 3: Transport, Step 4: Review)
- Modify: `src/app/t/[tenantSlug]/purchases/new/page.tsx` — Same pattern
- Modify: `src/app/t/[tenantSlug]/sales/new/page.tsx` — Same pattern

**Key:** Both desktop and mobile renderers share the same form hook → same validation → same submit handler. No state duplication.

**Checkpoints:**
- [ ] `transaction-stepper.tsx` created: progress dots, back/next buttons, sticky footer
- [ ] `useDispatchForm()` hook extracted — shared state between desktop and mobile renderers
- [ ] Desktop dispatch form unchanged (no visual regression)
- [ ] Mobile dispatch form shows 4 steps: From/To → Items → Transport → Review
- [ ] Step validation: can't proceed past step 1 without required fields
- [ ] Review step shows summary of all entered data
- [ ] Submit from review step works identically to desktop submit
- [ ] `usePurchaseForm()` hook extracted + mobile stepper applied
- [ ] `useSaleForm()` hook extracted + mobile stepper applied
- [ ] `pnpm build` passes
- [ ] Visual check at 375px: stepper dots visible, sticky next/back buttons
- [ ] Visual check at 1280px: desktop form unchanged
- [ ] Functional check: complete a dispatch on mobile via stepper → data saves correctly
- [ ] Functional check: navigate back through steps → data preserved

---

## Build Order & Dependencies

```
Step 1 (Sidebar)          ── no deps ──────────────────→ can start immediately
Step 2 (DataTable)         ── no deps ──────────────────→ can start immediately (parallel with Step 1)
Step 3 (Form Sections)     ── no deps ──────────────────→ can start immediately (parallel)
Step 4 (Global Search)     ── no deps ──────────────────→ can start immediately (parallel)
Step 5 (Mobile Bottom Nav) ── no deps ──────────────────→ can start immediately (parallel)
Step 6 (Adjustments)       ── depends on Step 2 (DataTable) + Step 3 (FormSection)
Step 7 (GST)               ── no deps ──────────────────→ can start immediately
Step 8 (Rename)            ── no deps ──────────────────→ can start immediately
Step 9 (Touch/Stepper)     ── depends on Step 5 (useIsMobile hook)
Step 10 (Stepper Forms)    ── depends on Step 3 (FormSection) + Step 9 (useIsMobile)
```

**Optimal parallel execution:** Steps 1-5 can all run in parallel. Steps 6-8 can run in parallel once Step 2+3 are done. Steps 9-10 run last.

---

## Verification

After each step:
1. `pnpm build` — no type errors
2. `pnpm dev` → navigate to affected pages at `http://localhost:3000/t/[testTenant]/`
3. Check at 375px viewport for mobile changes
4. Browser console: zero JS errors
5. For DB changes: verify via Supabase Studio that tables/columns exist in tenant schema

End-to-end smoke test after all steps:
- Create a new dispatch (desktop + mobile) → verify form sections collapse, DataTable shows it
- Search for the dispatch via Cmd+K → verify it appears
- Create an inventory adjustment → verify stock level updates
- Check a commodity form has HSN + tax fields
- Verify sidebar groups are collapsible and items are correctly categorized
- Verify bottom mobile nav works and "More" opens the full sidebar

---

## Prioritized Post-Launch Backlog

Build these ONLY after real users tell you they need them. Ordered by expected business value:

1. **Tally integration** — Export sales/purchases/payments as Tally XML vouchers. #1 blocker for adoption.
2. **Partial purchase receives** — Receive 50 of 100 bags now, rest later. Requires `received_quantity` per line item.
3. **Barcode scanning in transactions** — Wire existing `BarcodeScannerInput` into dispatch/purchase forms for item lookup.
4. **Stock movement report** — Unified ledger: all movements (purchase in, dispatch out, sale out, adjustment, return) per item.
5. **Role-based home screens / task queue** — Operator sees "3 dispatches arriving today" as cards, not a dashboard of charts.
6. **Smart defaults / frequency-sorted dropdowns** — Track recent selections per user, show them first in dropdowns.
7. **E-way bills** — Generate e-way bill for inter-state movements. Regulatory requirement. Depends on GST fields (Step 7).
8. **Photo capture on transactions** — Snap photos of goods/damage at receive/dispatch. Supabase Storage bucket.
9. **Offline-first with sync queue** — Service worker + IndexedDB for offline mutations. Large scope. Build after observing real connectivity issues.
10. **Cycle counting** — Physical count workflow with reconciliation. Depends on Adjustments module (Step 6).
11. **Approval workflows** — Gate dispatches/POs behind manager approval. Requires notification mechanism.
12. **Custom roles** — Named permission templates instead of per-user toggles.
13. **Bin/sub-location management** — Zone → rack → bin hierarchy. Significant DB change.
14. **WhatsApp notifications** — Business API via Gupshup/Wati for dispatch alerts, stock warnings.
15. **Location-aware auto-selection** — Auto-fill user's assigned location on forms. Quick win when users have single-location assignment.
16. **Bolder mobile status colors** — Increase tint opacity from 8% to 20% on mobile. CSS-only change.
17. **Vendor/customer portals** — Read-only access for suppliers/customers. New auth surface.
18. **Weighbridge data capture** — Gross/tare/net weight fields on receive forms.
19. **Kiosk mode** — Tablet dock station with locked single-location flow.
