# Plan: WareOS UI Overhaul — Full Application Theme Migration

## Context

The app currently uses a **dark zinc+amber theme** (zinc-950 backgrounds, amber-500 accents, Geist Sans/Mono fonts). The approved WareOS design system (`tmp/final/DESIGN_SYSTEM.md`) establishes a **Swiss-editorial light theme** with:
- White backgrounds + orange `#F45F00` accent
- 3 Google Fonts: Hedvig Letters Serif, Rethink Sans, Space Mono
- Pill-shaped buttons, refined cards, editorial typography
- Brand rename: `Warehouse.mgmt` → `WareOS`

This plan transforms every visual surface in the application to match the WareOS design language demonstrated in `tmp/final/tenant-dashboard.html` and `tmp/final/operator-view.html`.

**Design System Reference:** `tmp/final/DESIGN_SYSTEM.md`
**Visual References:** `tmp/final/tenant-dashboard.html`, `tmp/final/operator-view.html`

---

## Batch 1: Foundation Layer (MUST run first) ✅ COMPLETED

### Task 1.1: Replace fonts in `src/app/layout.tsx` ✅
- Removed `Geist` and `Geist_Mono` imports
- Added `Hedvig_Letters_Serif`, `Rethink_Sans`, `Space_Mono` from `next/font/google`
- Set CSS variables: `--font-serif`, `--font-sans`, `--font-mono`
- Applied variables to `<body>` className
- Updated metadata title to "WareOS" and description

### Task 1.2: Rewrite CSS variables in `src/app/globals.css` ✅
- Rewrote `@theme inline {}` block with WareOS semantic tokens
- Rewrote `:root` block with WareOS hex values (no OKLCH)
- Removed `.dark` block entirely — light-mode only
- Removed `@custom-variant dark` line
- Added WareOS custom properties
- Updated `@layer base` body

### Task 1.3: Build verification ✅
- `pnpm build` passes with zero errors

---

## Batch 2: Layout Shell Components (depends on Batch 1) ✅ COMPLETED

### Task 2.1: Sidebar — `src/components/layout/sidebar.tsx`
- `<aside>`: `bg-white border-r border-border`
- Brand: WareOS logotype (orange dot + Space Mono)
- Nav styling: accent-tint active states, muted inactive

### Task 2.2: Header — `src/components/layout/header.tsx`
- `bg-white/80 backdrop-blur-sm border-b border-border`
- Mobile brand: WareOS with orange dot
- Role badge: border-border styling

### Task 2.3: Tenant layout — `src/app/t/[tenantSlug]/layout.tsx`
- `bg-[var(--bg-off)]` wrapper

### Task 2.4: Auth layout — `src/app/(auth)/layout.tsx`
- `bg-[var(--bg-off)]`, WareOS brand

### Task 2.5: Platform admin layout — `src/app/(platform)/layout.tsx`
- `bg-[var(--bg-off)]`, white header, WareOS brand + Admin badge

---

## Batch 3: UI Primitive Components (parallel with Batch 2) ✅ COMPLETED

### Task 3.1-3.8: All 18 shadcn/ui components + 3 business components
- Remove all `dark:` prefixed classes
- Add WareOS-specific variants (orange button, status badges)
- Update hardcoded zinc/amber classes to semantic tokens

---

## Batch 4: Page-Level Updates (depends on Batches 2 & 3) ✅ COMPLETED

All 30 page files need their hardcoded Tailwind classes updated:
- `zinc-*` → semantic equivalents or WareOS variables
- `amber-*` → `[var(--accent)]` or semantic `primary`
- `Warehouse.mgmt` text → `WareOS`
- Font classes: add `font-serif` to page titles, `font-mono` to sequence numbers

### Task 4.1: Auth pages (2 files)
### Task 4.2: Platform admin pages (4 files)
### Task 4.3: Root & utility pages (2 files)
### Task 4.4: Tenant dashboard (1 file)
### Task 4.5: Inventory & dispatches (5 files)
### Task 4.6: Purchases & sales (6 files)
### Task 4.7: Analytics, audit, shortage (3 files)
### Task 4.8: Settings pages (7 files)

---

## Batch 5: Build Verification & Playwright Screenshots ✅ COMPLETED

### Task 5.1: Build check ✅
- `pnpm build` passes with zero errors

### Task 5.2: Playwright MCP screenshots & functional verification ✅
- 18 screenshots captured in `screenshots/` directory
- Visual verification: all pages show white/light backgrounds, orange accents, WareOS brand
- Functional checks: form filling, dropdown interactions, filter functionality, sidebar navigation
- Pages verified: Dashboard, Inventory, Dispatches (list + detail + new form), Purchases, Sales, Analytics, Settings, Locations, Commodities, Contacts, Shortage Tracking, Audit Log, User Management, User Detail
- Known pre-existing bug: dispatch form combobox shows UUID instead of location name after selection (not caused by theme migration)

---

## Class Replacement Cheatsheet

```
zinc-950 → bg-background / bg-[var(--bg-base)]
zinc-900 → bg-[var(--bg-off)] / bg-secondary
zinc-800 → border-border
zinc-800/50 → bg-muted/50
zinc-700 → border-border
zinc-600 → text-[var(--text-dim)]
zinc-500 → text-muted-foreground / text-[var(--text-muted)]
zinc-400 → text-[var(--text-muted)]
zinc-300 → text-[var(--text-body)]
zinc-200 → text-foreground
zinc-100 → text-foreground
amber-500 → text-[var(--accent)] / text-primary
amber-500/10 → bg-[var(--accent-tint)]
amber-500/20 → border-[var(--accent)]/20
emerald-500 → text-[var(--green)]
```

---

## Files Modified (Complete List — 58 files)

**Foundation (2):** globals.css, layout.tsx
**Layouts (4):** auth layout, platform layout, tenant layout
**Layout Components (3):** sidebar, header, realtime-status
**UI Components (18):** button, badge, card, input, table, select, dialog, sheet, tabs, dropdown-menu, popover, command, separator, label, textarea, sonner, calendar, input-group
**Business Components (3):** module-gate, custom-field-input, custom-field-display
**Pages (30):** all app pages
