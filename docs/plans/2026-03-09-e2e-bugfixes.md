# E2E Bugfix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 13 functional bugs and 6 key design findings discovered during the E2E test run.

**Architecture:** Direct file edits — no new patterns needed. Most fixes are 1-5 line changes.

**Tech Stack:** Next.js App Router, Tailwind CSS, shadcn/ui, Supabase

---

### Task 1: Fix commodity-form.tsx UUID-instead-of-slug (F-07)

**Files:**
- Modify: `src/core/auth/types.ts` — add `tenantSlug` to TenantContext
- Modify: `src/app/t/[tenantSlug]/layout.tsx:70-79` — pass `tenantSlug` into ctx
- Modify: `src/app/t/[tenantSlug]/settings/commodities/commodity-form.tsx:85,117-118` — use `ctx.tenantSlug` instead of `ctx.tenantId`

**Note:** The `TenantContext` doesn't include `tenantSlug` — only `tenantId` (UUID). The layout.tsx has it but doesn't pass it. Fix: add `tenantSlug` to TenantContext, pass it from layout, use it in commodity-form.

Also remove the manual header-setting in commodity-form.tsx (lines 86-91, 124-128) — middleware already sets these headers, client-side fetch doesn't need them (they get ignored anyway for same-origin requests routed through middleware).

---

### Task 2: Fix shortage tracking sidebar link (F-11)

**Files:**
- Modify: `src/modules/shortage-tracking/manifest.ts:11` — change `href: 'shortages'` to `href: 'shortage-tracking'`
- Create: `src/app/t/[tenantSlug]/shortage-tracking/page.tsx` — new page using existing query functions

---

### Task 3: Fix sales page "confirmed" badge color (D-B2)

**Files:**
- Modify: `src/app/t/[tenantSlug]/sales/page.tsx:24` — change confirmed from orange to blue

---

### Task 4: Add "Receive" button to dispatch detail page (F-12)

**Files:**
- Modify: `src/app/t/[tenantSlug]/dispatches/[id]/page.tsx:131-137` — add Receive button next to Download Challan

---

### Task 5: Fix all primary CTA buttons to use variant="orange" (D-B1/M-B1)

**Files:** ~15 files with inline orange button styles → replace with `variant="orange"`

---

### Task 6: Fix detail page button overflow on mobile (M-B2)

**Files:**
- Modify: `src/app/t/[tenantSlug]/dispatches/[id]/page.tsx` — add `flex-wrap` to action buttons container
- Modify: `src/app/t/[tenantSlug]/purchases/[id]/page.tsx` — same
- Modify: `src/app/t/[tenantSlug]/sales/[id]/page.tsx` — same

---

### Task 7: Create shortage-tracking page

**Files:**
- Create: `src/app/t/[tenantSlug]/shortage-tracking/page.tsx`

---
