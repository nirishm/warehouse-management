# New Modules — Update Log

**Branch:** feature/new-modules
**Last updated:** 2026-03-08
**Status:** Code complete — DB migrations + E2E testing pending

---

## Summary

7 new modules + mobile receiving UX implemented. All TypeScript errors resolved (`pnpm tsc --noEmit` clean). Production build not yet run.

---

## What Has Been Changed

### Infrastructure / Pre-Work

| File | Change |
|---|---|
| `src/core/auth/types.ts` | Added 6 new `Permission` union members: `canManagePayments`, `canManageAlerts`, `canGenerateDocuments`, `canManageLots`, `canManageReturns`, `canImportData` |
| `src/core/db/module-migrations.ts` | New file — module migration registry with `registerModuleMigration` + `applyModuleMigration` |
| `supabase/migrations/00002_tenant_template.sql` | Added 6 new permissions as `false` in default JSONB; added sequence seeds for `payment`, `lot`, `return` |
| `src/modules/index.ts` | Registered all 7 new module manifests |

### Module 1: `payments`

**New files:**
- `src/modules/payments/manifest.ts`
- `src/modules/payments/migrations/apply.ts`
- `src/modules/payments/queries/payments.ts` — `listPayments`, `getPaymentsForTransaction`, `createPayment`, `voidPayment`, `getBalance`
- `src/modules/payments/validations/payment.ts`
- `src/app/api/t/[tenantSlug]/payments/route.ts` — GET list, POST create
- `src/app/api/t/[tenantSlug]/payments/[id]/route.ts` — GET, DELETE (void)
- `src/app/api/t/[tenantSlug]/purchases/[id]/payments/route.ts` — nested GET + POST
- `src/app/api/t/[tenantSlug]/sales/[id]/payments/route.ts` — nested GET + POST
- `src/app/t/[tenantSlug]/payments/page.tsx` — payments dashboard
- `src/components/payments/payment-panel.tsx` — embedded panel for detail pages
- `src/components/payments/record-payment-dialog.tsx` — dialog to record payment

**Modified files:**
- `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — added `<PaymentPanel>` when payments module enabled
- `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — same

**Bug fixed during implementation:**
- `record-payment-dialog.tsx`: base-ui `DialogTrigger` uses `render` prop, not `asChild`; `onValueChange` returns `string | null`, guarded with `v ?? 'cash'`

### Module 2: `stock-alerts`

**New files:**
- `src/modules/stock-alerts/manifest.ts`
- `src/modules/stock-alerts/migrations/apply.ts`
- `src/modules/stock-alerts/queries/alerts.ts` — alert states joined from `stock_levels` view
- `src/modules/stock-alerts/validations/threshold.ts`
- `src/app/api/t/[tenantSlug]/stock-alerts/route.ts` — GET alert states
- `src/app/api/t/[tenantSlug]/stock-alerts/thresholds/route.ts` — GET list, POST create
- `src/app/api/t/[tenantSlug]/stock-alerts/thresholds/[id]/route.ts` — PUT, DELETE
- `src/app/t/[tenantSlug]/stock-alerts/page.tsx` — alert dashboard with summary cards + table
- `src/app/t/[tenantSlug]/stock-alerts/thresholds/page.tsx` — threshold config page
- `src/app/t/[tenantSlug]/stock-alerts/thresholds/thresholds-manager.tsx` — client component
- `src/components/stock-alerts/alert-badge.tsx` — OK/WARNING/CRITICAL badge
- `src/components/stock-alerts/alert-summary-widget.tsx` — dashboard widget

**Modified files:**
- `src/app/t/[tenantSlug]/page.tsx` — added `<AlertSummaryWidget>` when module enabled

**Bug fixed during implementation:**
- `thresholds-manager.tsx`: three `Select` `onValueChange` handlers return `string | null`; guarded with `v ?? ''`

### Module 3: `document-gen`

**New files:**
- `src/modules/document-gen/manifest.ts`
- `src/modules/document-gen/migrations/apply.ts`
- `src/modules/document-gen/queries/config.ts`
- `src/modules/document-gen/templates/dispatch-challan.tsx`
- `src/modules/document-gen/templates/grn.tsx`
- `src/modules/document-gen/templates/delivery-note.tsx`
- `src/modules/document-gen/templates/shared/letterhead.tsx`
- `src/modules/document-gen/templates/shared/pdf-table.tsx`
- `src/modules/document-gen/validations/config.ts`
- `src/app/api/t/[tenantSlug]/documents/config/route.ts`
- `src/app/api/t/[tenantSlug]/documents/dispatch-challan/[id]/route.ts`
- `src/app/api/t/[tenantSlug]/documents/grn/[id]/route.ts`
- `src/app/api/t/[tenantSlug]/documents/delivery-note/[id]/route.ts`
- `src/app/t/[tenantSlug]/settings/documents/page.tsx`
- `src/components/document-gen/download-document-button.tsx`

**Modified files:**
- `src/app/t/[tenantSlug]/dispatches/[id]/page.tsx` — "Download Challan" button
- `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — "Download GRN" button
- `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — "Download Delivery Note" button

**Bugs fixed during implementation:**
- All three PDF route handlers: `Buffer<ArrayBufferLike>` is not assignable to `BodyInit` — fixed with `new NextResponse(new Uint8Array(buffer), {...})`
- `renderToBuffer` TypeScript error: `FunctionComponentElement` not assignable to `ReactElement<DocumentProps>` — fixed with `renderToBuffer(React.createElement(...) as never)`
- `sale as Record<string, unknown>` strict TS check fails — fixed with `const s = sale as unknown as Record<string, unknown>` (double cast via `unknown`)
- `dispatch-challan/[id]/route.ts`: `DispatchItemWithNames` lacks `requested_quantity` but template requires it — fixed by mapping items to inject `requested_quantity: item.sent_quantity ?? 0`

### Module 4: `lot-tracking`

**New files:**
- `src/modules/lot-tracking/manifest.ts`
- `src/modules/lot-tracking/migrations/apply.ts` — creates `lots` table + ALTER TABLE on item tables
- `src/modules/lot-tracking/queries/lots.ts`
- `src/modules/lot-tracking/queries/fifo.ts` — FIFO lot allocation queries
- `src/modules/lot-tracking/validations/lot.ts`
- `src/app/api/t/[tenantSlug]/lots/route.ts`
- `src/app/api/t/[tenantSlug]/lots/[id]/route.ts`
- `src/app/api/t/[tenantSlug]/lots/[id]/movements/route.ts`
- `src/app/t/[tenantSlug]/lots/page.tsx`
- `src/app/t/[tenantSlug]/lots/[id]/page.tsx`
- `src/components/lot-tracking/lot-number-input.tsx`
- `src/components/lot-tracking/fifo-lot-selector.tsx`
- `src/components/lot-tracking/lot-age-badge.tsx`

**Modified files:**
- `src/app/t/[tenantSlug]/purchases/new/page.tsx` — optional lot number field per item
- `src/app/t/[tenantSlug]/dispatches/new/page.tsx` — FIFO lot selector per item
- `src/app/t/[tenantSlug]/sales/new/page.tsx` — same
- `src/app/api/t/[tenantSlug]/purchases/route.ts` — accepts optional `lot_number` per item

### Module 5: `returns`

**New files:**
- `src/modules/returns/manifest.ts`
- `src/modules/returns/migrations/apply.ts`
- `src/modules/returns/queries/returns.ts`
- `src/modules/returns/validations/return.ts`
- `src/app/api/t/[tenantSlug]/returns/route.ts`
- `src/app/api/t/[tenantSlug]/returns/[id]/route.ts`
- `src/app/api/t/[tenantSlug]/returns/[id]/confirm/route.ts`
- `src/app/t/[tenantSlug]/returns/page.tsx`
- `src/app/t/[tenantSlug]/returns/new/page.tsx`
- `src/app/t/[tenantSlug]/returns/[id]/page.tsx`

**Modified files:**
- `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — "Create Return" button
- `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — "Accept Return" button

### Module 6: `bulk-import`

**New files:**
- `src/modules/bulk-import/manifest.ts`
- `src/modules/bulk-import/schemas/commodities-csv.ts`
- `src/modules/bulk-import/schemas/contacts-csv.ts`
- `src/modules/bulk-import/schemas/purchases-csv.ts`
- `src/modules/bulk-import/queries/import-commodities.ts`
- `src/modules/bulk-import/queries/import-contacts.ts`
- `src/modules/bulk-import/queries/import-purchases.ts`
- `src/modules/bulk-import/queries/export.ts`
- `src/modules/bulk-import/utils/csv-parser.ts`
- `src/modules/bulk-import/utils/csv-exporter.ts`
- `src/modules/bulk-import/validations/import.ts`
- `src/app/api/t/[tenantSlug]/bulk-import/commodities/route.ts`
- `src/app/api/t/[tenantSlug]/bulk-import/contacts/route.ts`
- `src/app/api/t/[tenantSlug]/bulk-import/purchases/route.ts`
- `src/app/api/t/[tenantSlug]/export/[entity]/route.ts`
- `src/app/t/[tenantSlug]/bulk-import/page.tsx`
- `src/components/bulk-import/import-dropzone.tsx`
- `src/components/bulk-import/import-results.tsx`

**Bug fixed during implementation:**
- `contacts-csv.ts`: Zod v4 removed `errorMap` option from `z.enum()` — fixed with `.refine(v => [...].includes(v), { message: '...' })`

### Module 7: `barcode`

**New files:**
- `src/modules/barcode/manifest.ts`
- `src/modules/barcode/utils/generate-barcode.ts` — server-side QR PNG via `qrcode.toBuffer()`
- `src/app/api/t/[tenantSlug]/barcodes/[commodityId]/route.ts` — GET → PNG with 24h cache
- `src/app/t/[tenantSlug]/barcodes/page.tsx` — server component, passes commodities to manager
- `src/app/t/[tenantSlug]/barcodes/barcode-print-manager.tsx` — client: checkbox select, print
- `src/components/barcode/barcode-label.tsx` — SVG QR label via `react-qr-code`
- `src/components/barcode/barcode-print-sheet.tsx` — 4-col print grid
- `src/components/barcode/barcode-scanner-input.tsx` — `BarcodeDetector` Web API with camera fallback

**Modified files:**
- `src/app/t/[tenantSlug]/settings/commodities/page.tsx` — fetches `slug`, passes `tenantSlug` + `barcodeEnabled` to client
- `src/app/t/[tenantSlug]/settings/commodities/commodities-client.tsx` — added `tenantSlug?` + `barcodeEnabled?` props; conditional "QR" link per row

### Mobile-Optimized Receiving

**New files:**
- `src/components/mobile/mobile-receive-form.tsx` — card-per-item layout, `h-12` tap targets, `inputMode="decimal"`, barcode scan filter, sticky bottom submit

**Modified files:**
- `src/app/t/[tenantSlug]/dispatches/[id]/receive/page.tsx` — added `barcodeEnabled` from `enabled_modules`; wraps `<ReceiveForm>` in `hidden md:block`; adds `block md:hidden` `<MobileReceiveForm>`

---

## What Is Pending

### Must-do before merging

| Task | Status | Notes |
|---|---|---|
| `lot_stock_levels` view DDL | DONE | Already in `lot-tracking/migrations/apply.ts` (lines 29-58) |
| Admin modules-manager integration | DONE | `api/admin/tenants/[id]/route.ts` already calls `applyModuleMigration` for newly enabled modules |
| `pnpm build` | DONE | 90+ routes compiled, zero errors (2026-03-08) |
| Apply DB migrations to Supabase | PENDING | Run each `apply.ts` against dev project; confirm idempotent |
| PostgREST schema cache reload | PENDING | Required after lot-tracking ALTER TABLEs run on Supabase |
| E2E verification | PENDING | See checklist below |

### E2E Verification Checklist

- [ ] Enable each new module via admin UI — migration runs without error
- [ ] **payments**: Record a payment on a purchase; outstanding balance decreases
- [ ] **stock-alerts**: Set threshold; dispatch below threshold; CRITICAL alert on dashboard
- [ ] **document-gen**: Download Dispatch Challan PDF; company name + items visible
- [ ] **lot-tracking**: Purchase with lot number; dispatch FIFO; lot stock view depletes correctly
- [ ] **returns**: Sale return confirmed; stock increases at location
- [ ] **bulk-import**: Upload commodities CSV; row-level errors reported; inserts appear
- [ ] **barcode**: Print sheet renders; scan fills commodity field on mobile
- [ ] **mobile receiving**: Phone viewport; single-column layout; numeric keyboards; sticky submit
- [ ] `pnpm build` — DONE (2026-03-08)
- [ ] `pnpm test` — existing tests pass

---

## Technical Notes for Future Sessions

### Key gotchas encountered

1. **base-ui `DialogTrigger`** — does not use `asChild`. Use `render` prop:
   ```tsx
   <DialogTrigger render={<Button />}>Label</DialogTrigger>
   ```

2. **base-ui `Select` `onValueChange`** — returns `string | null`, not `string`. Always guard:
   ```tsx
   onValueChange={(v) => setField(v ?? 'default')}
   ```

3. **`@react-pdf/renderer` + TypeScript** — `renderToBuffer` expects `ReactElement<DocumentProps>` but wrapped components fail type check. Use:
   ```typescript
   renderToBuffer(React.createElement(MyDoc, props) as never)
   ```

4. **Node `Buffer` → `NextResponse`** — `Buffer` is not `BodyInit`. Convert:
   ```typescript
   new NextResponse(new Uint8Array(buffer), { headers: {...} })
   ```

5. **Zod v4 enum validation** — `errorMap` option removed. Use `.refine()` instead:
   ```typescript
   z.enum(['a','b']).refine(v => ['a','b'].includes(v), { message: '...' })
   ```

6. **Double cast for incompatible types** — `obj as Record<string, unknown>` fails strict TS when source type has incompatible fields. Use:
   ```typescript
   const typed = original as unknown as TargetType
   ```

7. **Responsive dual-form (no user-agent)** — CSS classes only:
   ```tsx
   <div className="hidden md:block"><DesktopForm /></div>
   <div className="block md:hidden"><MobileForm /></div>
   ```

8. **Print-only sections** — Use `hidden print:block` to show only during `window.print()`.

9. **Glob tool fails with spaces in paths** — Use Bash with double-quoted paths for file discovery in this repo (Google Drive path contains spaces).
