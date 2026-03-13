# Fix CI Build Failure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the CI build step that fails because auth pages try to prerender without Supabase env vars, and fix the `themeColor` viewport warnings.

**Architecture:** Add `export const dynamic = 'force-dynamic'` to auth layout (these pages always need runtime cookies, so prerendering is pointless). Move `themeColor` from `metadata` to `viewport` export per Next.js 16 API. Set GitHub secrets so the build has valid env vars for any remaining static analysis.

**Tech Stack:** Next.js 16, Supabase, GitHub Actions

---

## Chunk 1: Fix build failures

### Task 1: Add `force-dynamic` to auth layout

**Files:**
- Modify: `src/app/(auth)/layout.tsx:1`

Auth pages (login, register, reset-password, set-password) are `'use client'` but still get server-prerendered during `next build`. They create a Supabase client which fails without env vars. Adding `force-dynamic` to the layout skips prerendering for all auth routes.

- [ ] **Step 1: Add dynamic export to auth layout**

Add at the top of `src/app/(auth)/layout.tsx`:

```ts
export const dynamic = 'force-dynamic';
```

- [ ] **Step 2: Also add to no-tenant page**

`src/app/(auth)/no-tenant/page.tsx` is an async server component using `headers()` — it also needs `force-dynamic`.

Add at the top (after imports):

```ts
export const dynamic = 'force-dynamic';
```

- [ ] **Step 3: Verify build locally**

Run: `pnpm build`
Expected: Build succeeds (or fails on different issue, not Supabase client)

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/layout.tsx src/app/(auth)/no-tenant/page.tsx
git commit -m "fix(ci): skip prerendering auth pages that need runtime env vars"
```

### Task 2: Fix themeColor viewport warning

**Files:**
- Modify: `src/app/layout.tsx:10`

Next.js 16 moved `themeColor` from `metadata` to `viewport` export.

- [ ] **Step 1: Move themeColor to viewport export**

In `src/app/layout.tsx`, remove `themeColor: '#F27B35'` from the `metadata` export and add a separate `viewport` export:

```ts
export const viewport: Viewport = {
  themeColor: '#F27B35',
};
```

Add the `Viewport` import:
```ts
import type { Metadata, Viewport } from 'next';
```

- [ ] **Step 2: Verify build locally**

Run: `pnpm build`
Expected: No themeColor warnings

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: move themeColor to viewport export per Next.js 16 API"
```

### Task 3: Set GitHub secrets

**Manual step — not automatable by agent.**

- [ ] **Step 1: Add secrets to GitHub repo**

Go to https://github.com/nirishm/warehouse-management/settings/secrets/actions and add:

- `NEXT_PUBLIC_SUPABASE_URL` — copy from `.env.local`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — copy from `.env.local`

These are already referenced in `.github/workflows/ci.yml` but are currently empty.

### Task 4: Push and verify CI

- [ ] **Step 1: Push to main**

```bash
git push
```

- [ ] **Step 2: Watch CI**

Run: `gh run list --limit 1` then `gh run watch <run-id> --exit-status`
Expected: All 4 jobs pass

## Verification

1. `pnpm build` succeeds locally
2. No `themeColor` warnings in build output
3. CI pipeline passes all jobs after push + secrets are set
