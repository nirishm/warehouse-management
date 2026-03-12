# WMS New Feature Modules — Implementation Plan

**Date:** 2026-03-08
**Branch:** feature/new-modules
**Status:** Code complete, pending DB migration + E2E verification

## Context

The existing WMS is a production-ready MVP covering: multi-tenant inventory, purchase/sale/dispatch workflows, shortage tracking, audit trail, analytics, role-based permissions, and custom fields. After comparing against industry standards (Zoho Inventory, WMS checklists) and thinking from a warehouse owner's perspective, 7 additional modules were identified to close critical operational gaps.

The existing module system (manifest → registry → per-tenant activation) is the right pattern for all new features. Admins enable/disable each module per tenant.

**Scope:** All 4 Tier 1 modules in parallel + 3 Tier 2 features + mobile-optimized receiving.

---

## Pre-Work: Cross-Cutting Infrastructure

### 1. Extend `Permission` type — `src/core/auth/types.ts`

Added to the `Permission` union:
```typescript
| 'canManagePayments'
| 'canManageAlerts'
| 'canGenerateDocuments'
| 'canManageLots'
| 'canManageReturns'
| 'canImportData'
```

### 2. Update tenant provisioning template — `supabase/migrations/00002_tenant_template.sql`

In the `user_profiles` default JSONB, added 6 new permissions as `false`.
Added new sequence counter seeds: `('payment','PAY',0)`, `('lot','LOT',0)`, `('return','RET',0)`.

### 3. Module Migration Infrastructure — `src/core/db/module-migrations.ts`

```typescript
export type ModuleMigration = (schemaName: string) => Promise<void>;
const registry = new Map<string, ModuleMigration>();
export function registerModuleMigration(id: string, fn: ModuleMigration) { registry.set(id, fn); }
export async function applyModuleMigration(id: string, schema: string) {
  const fn = registry.get(id);
  if (fn) await fn(schema);
}
```

The admin `modules-manager.tsx` calls `applyModuleMigration(moduleId, schemaName)` when enabling a module. All DDL uses `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — fully idempotent.

### 4. npm packages added

```bash
pnpm add @react-pdf/renderer resend papaparse qrcode react-qr-code
pnpm add -D @types/papaparse @types/qrcode
```

---

## Module 1: `payments`

**Purpose:** Track payment status on purchases (paid to supplier?) and sales (received from customer?). Show outstanding balances.

### DB Schema (module migration)
```sql
CREATE TABLE {schema}.payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number   TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase','sale')),
  transaction_id   UUID NOT NULL,
  contact_id       UUID REFERENCES {schema}.contacts(id),
  amount           NUMERIC NOT NULL CHECK (amount > 0),
  payment_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method   TEXT NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash','bank_transfer','cheque','upi','other')),
  reference_number TEXT,
  notes            TEXT,
  recorded_by      UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX idx_payments_txn ON {schema}.payments(transaction_type, transaction_id) WHERE deleted_at IS NULL;
```

Outstanding balance = computed at query time (no denormalization). `total_value` computed from item `unit_price * quantity` sums.

### Files Created
```
src/modules/payments/
  manifest.ts
  migrations/apply.ts
  queries/payments.ts
  validations/payment.ts
src/app/api/t/[tenantSlug]/payments/route.ts
src/app/api/t/[tenantSlug]/payments/[id]/route.ts
src/app/api/t/[tenantSlug]/purchases/[id]/payments/route.ts
src/app/api/t/[tenantSlug]/sales/[id]/payments/route.ts
src/app/t/[tenantSlug]/payments/page.tsx
src/components/payments/payment-panel.tsx
src/components/payments/record-payment-dialog.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — `<PaymentPanel>` when module enabled
- `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — same
- `src/modules/index.ts` — manifest registered
- `src/core/auth/types.ts` — `canManagePayments` added

---

## Module 2: `stock-alerts`

**Purpose:** Min stock + reorder point thresholds per commodity+location. Alert states: OK / WARNING / CRITICAL. Real-time computed, never stale.

### DB Schema (module migration)
```sql
CREATE TABLE {schema}.stock_alert_thresholds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id  UUID NOT NULL REFERENCES {schema}.commodities(id),
  location_id   UUID NOT NULL REFERENCES {schema}.locations(id),
  unit_id       UUID NOT NULL REFERENCES {schema}.units(id),
  min_stock     NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(commodity_id, location_id, unit_id)
);
```

Alert state:
- `current_stock <= 0` OR `current_stock <= min_stock` → CRITICAL
- `current_stock <= reorder_point` → WARNING
- else → OK

### Files Created
```
src/modules/stock-alerts/
  manifest.ts
  migrations/apply.ts
  queries/alerts.ts
  validations/threshold.ts
src/app/api/t/[tenantSlug]/stock-alerts/route.ts
src/app/api/t/[tenantSlug]/stock-alerts/thresholds/route.ts
src/app/api/t/[tenantSlug]/stock-alerts/thresholds/[id]/route.ts
src/app/t/[tenantSlug]/stock-alerts/page.tsx
src/app/t/[tenantSlug]/stock-alerts/thresholds/page.tsx
src/components/stock-alerts/alert-badge.tsx
src/components/stock-alerts/alert-summary-widget.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/page.tsx` — `<AlertSummaryWidget>` when module enabled
- `src/modules/index.ts` — manifest registered

---

## Module 3: `document-gen`

**Purpose:** Generate printable PDFs — Dispatch Challan, GRN, Delivery Note. Company letterhead configuration.

### DB Schema (module migration)
```sql
CREATE TABLE {schema}.document_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT NOT NULL DEFAULT '',
  company_address  TEXT,
  company_phone    TEXT,
  company_email    TEXT,
  company_gstin    TEXT,
  logo_url         TEXT,
  footer_text      TEXT,
  updated_by       UUID,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO {schema}.document_config (company_name) VALUES ('');
```

### PDF Generation
Uses `@react-pdf/renderer` (SSR-compatible, no Chromium). Route handler streams PDF buffer.

**Key implementation note:** `renderToBuffer` requires `as never` cast due to TypeScript type mismatch when using wrapped React components. `new Uint8Array(buffer)` needed to convert Node `Buffer` to valid `BodyInit`.

### Files Created
```
src/modules/document-gen/
  manifest.ts
  migrations/apply.ts
  queries/config.ts
  templates/
    dispatch-challan.tsx
    grn.tsx
    delivery-note.tsx
    shared/letterhead.tsx
    shared/pdf-table.tsx
  validations/config.ts
src/app/api/t/[tenantSlug]/documents/config/route.ts
src/app/api/t/[tenantSlug]/documents/dispatch-challan/[id]/route.ts
src/app/api/t/[tenantSlug]/documents/grn/[id]/route.ts
src/app/api/t/[tenantSlug]/documents/delivery-note/[id]/route.ts
src/app/t/[tenantSlug]/settings/documents/page.tsx
src/components/document-gen/download-document-button.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/dispatches/[id]/page.tsx` — "Download Challan" button
- `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — "Download GRN" button
- `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — "Download Delivery Note" button
- `src/modules/index.ts` — manifest registered

---

## Module 4: `lot-tracking`

**Purpose:** Lot/batch numbers on purchase inwards. FIFO stock depletion on dispatch/sale. Expiry date tracking. Lot age reports.

**Key Design:** Additive nullable columns on existing item tables — no breaking changes.

### DB Schema (module migration)
```sql
CREATE TABLE {schema}.lots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number        TEXT NOT NULL UNIQUE,
  commodity_id      UUID NOT NULL REFERENCES {schema}.commodities(id),
  source_purchase_id UUID REFERENCES {schema}.purchases(id),
  received_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date       TIMESTAMPTZ,
  initial_quantity  NUMERIC NOT NULL CHECK (initial_quantity > 0),
  unit_id           UUID NOT NULL REFERENCES {schema}.units(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE {schema}.purchase_items  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES {schema}.lots(id);
ALTER TABLE {schema}.purchase_items  ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE {schema}.dispatch_items  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES {schema}.lots(id);
ALTER TABLE {schema}.dispatch_items  ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE {schema}.sale_items      ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES {schema}.lots(id);
ALTER TABLE {schema}.sale_items      ADD COLUMN IF NOT EXISTS lot_number TEXT;
```

**Important:** After running ALTER TABLE migration on Supabase, reload PostgREST schema cache via Supabase Management API or dashboard.

### Files Created
```
src/modules/lot-tracking/
  manifest.ts
  migrations/apply.ts
  queries/lots.ts
  queries/fifo.ts
  validations/lot.ts
src/app/api/t/[tenantSlug]/lots/route.ts
src/app/api/t/[tenantSlug]/lots/[id]/route.ts
src/app/api/t/[tenantSlug]/lots/[id]/movements/route.ts
src/app/t/[tenantSlug]/lots/page.tsx
src/app/t/[tenantSlug]/lots/[id]/page.tsx
src/components/lot-tracking/lot-number-input.tsx
src/components/lot-tracking/fifo-lot-selector.tsx
src/components/lot-tracking/lot-age-badge.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/purchases/new/page.tsx` — optional lot number field per item
- `src/app/t/[tenantSlug]/dispatches/new/page.tsx` — FIFO lot selector per item
- `src/app/t/[tenantSlug]/sales/new/page.tsx` — same
- `src/app/api/t/[tenantSlug]/purchases/route.ts` — accept optional `lot_number` per item
- `src/modules/index.ts` — manifest registered

---

## Module 5: `returns`

**Purpose:** Process purchase returns (send goods back to supplier) and sale returns (accept goods back from customer). Updates stock accordingly.

### DB Schema (module migration)
```sql
CREATE TABLE {schema}.returns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number    TEXT NOT NULL UNIQUE,
  return_type      TEXT NOT NULL CHECK (return_type IN ('purchase_return','sale_return')),
  original_txn_id  UUID NOT NULL,
  location_id      UUID NOT NULL REFERENCES {schema}.locations(id),
  contact_id       UUID REFERENCES {schema}.contacts(id),
  return_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','confirmed','cancelled')),
  notes            TEXT,
  created_by       UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE {schema}.return_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id    UUID NOT NULL REFERENCES {schema}.returns(id),
  commodity_id UUID NOT NULL REFERENCES {schema}.commodities(id),
  unit_id      UUID NOT NULL REFERENCES {schema}.units(id),
  quantity     NUMERIC NOT NULL CHECK (quantity > 0),
  lot_id       UUID REFERENCES {schema}.lots(id),
  notes        TEXT
);
```

Stock impact via negative purchase/sale entries — no view modification needed.

### Files Created
```
src/modules/returns/
  manifest.ts
  migrations/apply.ts
  queries/returns.ts
  validations/return.ts
src/app/api/t/[tenantSlug]/returns/route.ts
src/app/api/t/[tenantSlug]/returns/[id]/route.ts
src/app/api/t/[tenantSlug]/returns/[id]/confirm/route.ts
src/app/t/[tenantSlug]/returns/page.tsx
src/app/t/[tenantSlug]/returns/new/page.tsx
src/app/t/[tenantSlug]/returns/[id]/page.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — "Create Return" button
- `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — "Accept Return" button
- `src/modules/index.ts` — manifest registered

---

## Module 6: `bulk-import`

**Purpose:** CSV import for commodities, contacts, and initial stock loading. CSV export for all entities.

### No new DB tables. Writes to existing tables via existing queries.

### CSV Schemas
- **Commodities:** `name*`, `code*`, `description`, `category`, `default_unit`
- **Contacts:** `name*`, `type*` (supplier/customer/both), `phone`, `email`, `address`
- **Initial Stock (as Purchase):** `location_code*`, `commodity_code*`, `quantity*`, `unit_abbreviation`, `bags`, `notes`

### Files Created
```
src/modules/bulk-import/
  manifest.ts
  schemas/
    commodities-csv.ts
    contacts-csv.ts
    purchases-csv.ts
  queries/
    import-commodities.ts
    import-contacts.ts
    import-purchases.ts
    export.ts
  utils/
    csv-parser.ts
    csv-exporter.ts
  validations/import.ts
src/app/api/t/[tenantSlug]/bulk-import/commodities/route.ts
src/app/api/t/[tenantSlug]/bulk-import/contacts/route.ts
src/app/api/t/[tenantSlug]/bulk-import/purchases/route.ts
src/app/api/t/[tenantSlug]/export/[entity]/route.ts
src/app/t/[tenantSlug]/bulk-import/page.tsx
src/components/bulk-import/import-dropzone.tsx
src/components/bulk-import/import-results.tsx
```

### Error Response Format
```json
{
  "summary": { "total": 50, "inserted": 47, "failed": 3 },
  "errors": [{ "row": 3, "field": "code", "message": "Duplicate code 'RICE-001'" }]
}
```

---

## Module 7: `barcode`

**Purpose:** Generate QR codes for commodities (printable labels). Optional: scan barcodes on mobile to autofill commodity search fields.

### No DB changes. Barcode data = commodity code (already unique).

### Libraries
```bash
pnpm add qrcode react-qr-code
pnpm add -D @types/qrcode
```

- `qrcode` — server-side PNG generation (`QRCode.toBuffer`)
- `react-qr-code` — client-side SVG for print sheets

### Files Created
```
src/modules/barcode/
  manifest.ts
  utils/generate-barcode.ts
src/app/api/t/[tenantSlug]/barcodes/[commodityId]/route.ts
src/app/t/[tenantSlug]/barcodes/page.tsx
src/app/t/[tenantSlug]/barcodes/barcode-print-manager.tsx
src/components/barcode/barcode-label.tsx
src/components/barcode/barcode-print-sheet.tsx
src/components/barcode/barcode-scanner-input.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/settings/commodities/page.tsx` — "QR" link per commodity when module enabled
- `src/app/t/[tenantSlug]/settings/commodities/commodities-client.tsx` — accepts `tenantSlug` + `barcodeEnabled` props

---

## Mobile-Optimized Receiving (Cross-Cutting UX)

Not a separate module — UX improvements to existing dispatch receive page.

### Strategy
CSS class-based responsive dual-form (no user-agent sniffing):
- Desktop: existing `<ReceiveForm>` wrapped in `hidden md:block`
- Mobile: new `<MobileReceiveForm>` wrapped in `block md:hidden`

### Key mobile UX features
- Card-per-item layout (no table)
- `h-12` minimum tap targets
- `inputMode="decimal"` for quantity, `inputMode="numeric"` for bags
- Optional barcode scan filter at top
- Green/red per-item status badges
- Sticky bottom submit: `fixed bottom-0 left-0 right-0 z-50 md:hidden`

### Files Created
```
src/components/mobile/mobile-receive-form.tsx
```

### Files Modified
- `src/app/t/[tenantSlug]/dispatches/[id]/receive/page.tsx` — dual-form with `hidden md:block` / `block md:hidden`

---

## Implementation Order

All modules were developed in parallel within the same branch. Dependency notes:
- Pre-work (permissions + module migration infra) was done first
- `returns` references `lot_id` (lot-tracking types used)
- `barcode` and `bulk-import` had no DB dependencies

---

## Pending Work (as of 2026-03-08)

1. **Apply DB migrations** — run each module's `apply.ts` against Supabase dev project
2. **Admin modules-manager integration** — wire `applyModuleMigration(moduleId, schemaName)` call in `modules-manager.tsx` when enabling a module
3. **`lot_stock_levels` view DDL** — needs to be completed in lot-tracking migration
4. **PostgREST schema cache reload** — required after lot-tracking ALTER TABLE runs on Supabase
5. **End-to-end testing** per verification checklist below
6. **Production build check** — `pnpm build` with zero TS errors
7. **Merge to main** after E2E verification

---

## Verification Checklist

1. Enable each new module for a test tenant via admin UI — confirm module migration runs without error
2. **payments**: Create a purchase, record a payment, verify outstanding balance decreases
3. **stock-alerts**: Set a threshold, dispatch stock below threshold, verify CRITICAL alert appears on dashboard
4. **document-gen**: Download Dispatch Challan PDF — verify company name, items, and quantities appear
5. **lot-tracking**: Create purchase with lot number, dispatch from that lot, verify FIFO depletion in lot stock view
6. **returns**: Create a sale return, confirm stock increases at location
7. **bulk-import**: Upload a commodities CSV, verify row-level errors reported, confirm inserted rows appear
8. **barcode**: Generate labels for 3 commodities, verify printable sheet renders, test scan fills commodity field
9. **Mobile receiving**: Open receive page on phone viewport, verify single-column layout and numeric keyboards
10. Run `pnpm build` — no TypeScript errors
11. Run `pnpm test` — existing tests still pass

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/core/auth/types.ts` | 6 new Permission union members added |
| `src/core/db/module-migrations.ts` | Module migration registry (new file) |
| `supabase/migrations/00002_tenant_template.sql` | New permission defaults + sequence counters |
| `src/modules/index.ts` | All 7 new manifests registered |
| `src/app/(platform)/admin/tenants/[id]/modules-manager.tsx` | PENDING: call applyModuleMigration on enable |
| `src/modules/lot-tracking/migrations/apply.ts` | Includes ALTER TABLE + PENDING: lot_stock_levels view |
