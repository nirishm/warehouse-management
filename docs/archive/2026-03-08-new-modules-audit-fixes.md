# New-Modules Audit Fixes — 2026-03-08

**Branch:** `feature/new-modules`
**Scope:** Targeted fixes from a parallel-agent code audit of the new-modules implementation

---

## Background

A code audit of the `feature/new-modules` branch identified 3 implementation gaps across the
payments and returns module integrations. This document records which fixes were applied, how
they were implemented, and what remains blocked.

---

## Fixes Applied

### Fix 2 — Purchase detail page: "Create Return" button

**File:** `src/app/t/[tenantSlug]/purchases/[id]/page.tsx`

**Problem:** The returns module was never wired into the purchase detail page. No "Create Return"
entry point existed, so users could not initiate a purchase return from a purchase record.

**Implementation:**

1. Extended the Supabase tenant query to fetch `enabled_modules` alongside `schema_name`:

   ```ts
   .select('schema_name, enabled_modules')
   ```

2. Derived a boolean flag after the tenant null-check:

   ```ts
   const returnsModuleEnabled = (tenant.enabled_modules ?? []).includes('returns');
   ```

3. Replaced the standalone "Back to purchases" `<Link>` in the page header with a wrapping
   `<div className="flex items-center gap-2">` containing a conditional "Create Return" link
   followed by the existing "Back" link:

   ```tsx
   <div className="flex items-center gap-2">
     {returnsModuleEnabled && (
       <Link
         href={`/t/${tenantSlug}/returns/new?from=purchase&id=${id}`}
         className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 border border-zinc-700
                    px-3 py-1.5 text-xs font-mono font-medium text-zinc-200 hover:bg-zinc-700
                    hover:text-zinc-100 transition-colors"
       >
         Create Return
       </Link>
     )}
     <Link href={`/t/${tenantSlug}/purchases`} ...>
       Back to purchases
     </Link>
   </div>
   ```

**Behaviour:** When the `returns` module is disabled for a tenant, the button is completely absent
(not disabled). When enabled, clicking navigates to `/t/{slug}/returns/new?from=purchase&id={id}`.

---

### Fix 3 — Sale detail page: "Accept Return" button

**File:** `src/app/t/[tenantSlug]/sales/[id]/page.tsx`

**Problem:** Same gap as Fix 2, on the sale detail page. No way to initiate a sale return from
a sale record.

**Implementation:** Identical pattern to Fix 2:

1. Extended tenant query: `.select('schema_name, enabled_modules')`

2. Module flag:

   ```ts
   const returnsModuleEnabled = (tenant.enabled_modules ?? []).includes('returns');
   ```

3. Wrapped the "Back to sales" link in a flex container and added the conditional button:

   ```tsx
   <div className="flex items-center gap-2">
     {returnsModuleEnabled && (
       <Link
         href={`/t/${tenantSlug}/returns/new?from=sale&id=${id}`}
         className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 border border-zinc-700
                    px-3 py-1.5 text-xs font-mono font-medium text-zinc-200 hover:bg-zinc-700
                    hover:text-zinc-100 transition-colors"
       >
         Accept Return
       </Link>
     )}
     <Link href={`/t/${tenantSlug}/sales`} ...>
       Back to sales
     </Link>
   </div>
   ```

**Behaviour:** Same as Fix 2 — hidden unless the `returns` module is enabled, navigates to
`/t/{slug}/returns/new?from=sale&id={id}`.

---

## Blocked Fix

### Fix 1 — `record-payment-dialog.tsx`: button label missing

**File:** `src/components/payments/record-payment-dialog.tsx` (does not exist)

**Problem described by audit:** The "Record Payment" text was a child of `<DialogTrigger>` rather
than being inside the `<Button>` passed to the `render` prop. Because `render` receives the Button
element, text placed outside it is discarded, producing a button with no visible label.

**Status: BLOCKED — file does not exist.**

The payments module (`src/modules/payments/`) has not been created yet. The audit assumed the
module was already implemented and was flagging a bug in it. Before this fix can be applied, the
following minimum set of files must be created:

- `src/modules/payments/manifest.ts`
- `src/modules/payments/migrations/apply.ts`
- `src/modules/payments/queries/payments.ts`
- `src/modules/payments/validations/payment.ts`
- `src/app/api/t/[tenantSlug]/payments/route.ts`
- `src/components/payments/payment-panel.tsx`
- `src/components/payments/record-payment-dialog.tsx`

The correct structure for the dialog trigger (once the file is created) is:

```tsx
// WRONG — label is outside Button, gets discarded
<DialogTrigger
  render={<Button size="sm" className="..." />}
>
  Record Payment
</DialogTrigger>

// CORRECT — label is inside Button, rendered as button text
<DialogTrigger
  render={
    <Button size="sm" className="...">
      Record Payment
    </Button>
  }
/>
```

---

## Verification

```
pnpm tsc --noEmit   →   0 errors
```

---

## Pattern Reference

The module-gating pattern used in Fixes 2 and 3 is consistent with the rest of the codebase:

- `src/app/t/[tenantSlug]/page.tsx` — reads `enabled_modules` for the dashboard stats widget
- `src/app/t/[tenantSlug]/settings/commodities/page.tsx` — reads `enabled_modules` for
  barcode/document-gen feature flags
- `src/middleware.ts` — propagates `enabled_modules` as a request header for client-side use

All module checks use `(tenant.enabled_modules ?? []).includes('module-id')`. The `?? []`
guard is required because `enabled_modules` is nullable in the database.
