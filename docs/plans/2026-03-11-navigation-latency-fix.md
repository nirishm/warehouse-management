# WareOS Navigation Latency — Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the 600–900ms blank-screen delay users experience when clicking any link on the dashboard.

**Architecture:** Three independent fixes: (1) Add `loading.tsx` skeleton files for all routes that lack them so users get immediate visual feedback; (2) Upgrade React `cache()` to `unstable_cache` in `session.ts` and `page-guard.ts` so auth/tenant data is cached across RSC requests, not just within one render; (3) Add an in-memory TTL cache to middleware and re-enable link prefetching so the first click is pre-loaded.

**Tech Stack:** Next.js 14+ App Router, React Server Components, `next/cache` (`unstable_cache`, `revalidateTag`), Supabase (service role client for cache callbacks), TypeScript.

---

## Background: Why Navigation Is Slow

Every link click in Next.js App Router triggers a new RSC fetch. The following runs **on every single navigation**:

### 1. Middleware (Edge Runtime) — ~250ms
```
auth.getUser()   →  Supabase auth server round-trip  ~150ms
tenant query     →  DB: SELECT from tenants           ~50ms
membership query →  DB: SELECT from user_tenants      ~50ms
```

### 2. Page RSC render — ~250ms
`requirePageAccess` calls `getCurrentUser()` + `getTenantBySlug()` + `getMembership()` fresh.

**Why React `cache()` doesn't help here:** `cache()` deduplicates within one React render tree. When navigating, Next.js does partial rendering — the layout (`[tenantSlug]/layout.tsx`) is **not** re-rendered (it stays mounted). Only the page RSC is fetched as a new request with a new React tree. That tree has a fresh `cache()` context, so all three session functions execute again from scratch.

### 3. Missing `loading.tsx` — blank screen
The dashboard's Recent Transactions cards link to `dispatches/[id]`, `purchases/[id]`, `sales/[id]`. None of these have `loading.tsx`, so the browser shows nothing until the full RSC resolves (~700ms).

**Total wall-clock time per click: ~700–950ms of blank screen.**

---

## File Map

### New Files (loading skeletons — 17 files)
| File | Purpose |
|------|---------|
| `src/app/t/[tenantSlug]/dispatches/[id]/loading.tsx` | Detail page skeleton |
| `src/app/t/[tenantSlug]/dispatches/[id]/receive/loading.tsx` | Receive form skeleton |
| `src/app/t/[tenantSlug]/dispatches/new/loading.tsx` | New form skeleton |
| `src/app/t/[tenantSlug]/purchases/[id]/loading.tsx` | Detail page skeleton |
| `src/app/t/[tenantSlug]/purchases/new/loading.tsx` | New form skeleton |
| `src/app/t/[tenantSlug]/sales/[id]/loading.tsx` | Detail page skeleton |
| `src/app/t/[tenantSlug]/sales/new/loading.tsx` | New form skeleton |
| `src/app/t/[tenantSlug]/lots/loading.tsx` | List skeleton |
| `src/app/t/[tenantSlug]/lots/[id]/loading.tsx` | Detail skeleton |
| `src/app/t/[tenantSlug]/returns/loading.tsx` | List skeleton |
| `src/app/t/[tenantSlug]/returns/[id]/loading.tsx` | Detail skeleton |
| `src/app/t/[tenantSlug]/adjustments/loading.tsx` | List skeleton |
| `src/app/t/[tenantSlug]/payments/loading.tsx` | List skeleton |
| `src/app/t/[tenantSlug]/stock-alerts/loading.tsx` | List skeleton |
| `src/app/t/[tenantSlug]/bulk-import/loading.tsx` | Page skeleton |
| `src/app/t/[tenantSlug]/barcodes/loading.tsx` | Page skeleton |
| `src/app/t/[tenantSlug]/settings/users/[userId]/loading.tsx` | Detail skeleton |

### Modified Files
| File | Change |
|------|--------|
| `src/core/auth/session.ts` | Wrap `getTenantBySlug` + `getMembership` with `unstable_cache` (cross-request cache, 5min/1min TTL) |
| `src/core/auth/page-guard.ts` | Cache `user_profiles.permissions` lookup with `unstable_cache` (1min TTL) |
| `src/middleware.ts` | Module-level in-memory TTL Map for tenant + membership (Edge-compatible) |
| `src/components/layout/sidebar.tsx` | Remove `prefetch={false}` from NavLink |
| `src/app/api/admin/tenants/[id]/route.ts` | Add `revalidateTag('tenant')` on tenant PATCH |
| `src/app/api/t/[tenantSlug]/settings/users/[userId]/route.ts` | Add `revalidateTag('user-membership', 'user-permissions')` on role/permission PATCH |

---

## Chunk 1: Loading Skeletons for All Missing Routes

### Task 1: Detail-page and form loading skeletons

**Design notes:**
- Detail pages (dispatches/[id], purchases/[id], sales/[id], lots/[id], returns/[id]) share a layout: back-link + title bar + content card(s)
- New/form pages share a layout: title + a large form card
- List pages (lots, returns, adjustments, payments, stock-alerts, bulk-import, barcodes) share the list layout: title + table

**Skeleton import:** `@/components/ui/skeleton` (wraps `animate-pulse` div)

**Files:**
- Create: 17 `loading.tsx` files listed in the File Map above

- [ ] **Step 1.1: Create detail-page skeleton template and apply to dispatches/[id]**

```tsx
// src/app/t/[tenantSlug]/dispatches/[id]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Main card */}
      <Skeleton className="h-64 w-full" />
      {/* Items table */}
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
```

- [ ] **Step 1.2: Create dispatches/[id]/receive/loading.tsx**

```tsx
// src/app/t/[tenantSlug]/dispatches/[id]/receive/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
```

- [ ] **Step 1.3: Create new-form skeletons (dispatches/new, purchases/new, sales/new)**

All three follow the same form skeleton pattern:

```tsx
// src/app/t/[tenantSlug]/dispatches/new/loading.tsx
// src/app/t/[tenantSlug]/purchases/new/loading.tsx
// src/app/t/[tenantSlug]/sales/new/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
```

- [ ] **Step 1.4: Create purchases/[id]/loading.tsx and sales/[id]/loading.tsx**

Same pattern as dispatches/[id]/loading.tsx from Step 1.1 — copy exactly.

- [ ] **Step 1.5: Create list-page skeletons (lots, returns, adjustments, payments, stock-alerts, bulk-import, barcodes)**

All list pages follow the same skeleton:

```tsx
// Apply to: lots/loading.tsx, returns/loading.tsx, adjustments/loading.tsx,
//           payments/loading.tsx, stock-alerts/loading.tsx,
//           bulk-import/loading.tsx, barcodes/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

- [ ] **Step 1.6: Create lots/[id]/loading.tsx and returns/[id]/loading.tsx**

Same pattern as dispatches/[id]/loading.tsx from Step 1.1.

- [ ] **Step 1.7: Create settings/users/[userId]/loading.tsx**

```tsx
// src/app/t/[tenantSlug]/settings/users/[userId]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
```

- [ ] **Step 1.8: Build check**

```bash
pnpm build
```

Expected: `✓ Compiled successfully` with zero errors. All 17 new files should appear in `.next/`.

- [ ] **Step 1.9: Visual smoke test**

With `pnpm dev` running:
1. Navigate to `/t/[slug]/dispatches` → click any dispatch row
2. Confirm: skeleton appears **immediately** on click (no blank flash)
3. Confirm: content appears after ~400ms
4. Repeat for a purchase and sale detail page

- [ ] **Step 1.10: Commit**

```bash
git add src/app/t/
git commit -m "perf: add loading.tsx skeletons for all detail and sub-pages

Covers dispatches/[id], purchases/[id], sales/[id], lots/[id],
returns/[id], */new forms, lots/returns/adjustments/payments/
stock-alerts/bulk-import/barcodes list pages, and settings/users/[userId].
Eliminates blank-screen flash when navigating from dashboard cards."
```

---

## Chunk 2: Cross-Request Auth Caching

### Task 2: Upgrade `session.ts` to `unstable_cache`

**Context:** `session.ts` currently uses React `cache()` which only deduplicates within a single server render tree. On navigation, the page RSC is a new tree — cache is fresh, so `getTenantBySlug` and `getMembership` hit the DB every time. `unstable_cache` from `next/cache` persists data across requests in the Next.js Data Cache (backed by filesystem in dev, edge cache in prod).

**Important:** The `unstable_cache` callback runs in a standalone context without access to request cookies. Therefore, switch from `createServerSupabaseClient()` (cookie-dependent) to `createAdminClient()` (service-role, no cookies needed) inside the cached functions.

`getCurrentUser` calls `auth.getUser()` which MUST remain request-scoped (it validates the JWT live with the Supabase auth server — cannot cache this securely).

**File:** `src/core/auth/session.ts`

- [ ] **Step 2.1: Read the current file**

```bash
cat src/core/auth/session.ts
```

- [ ] **Step 2.2: Check `createAdminClient` import path**

```bash
grep -r "export function createAdminClient" src/lib/
```

Expected: `src/lib/supabase/admin.ts` exports `createAdminClient`.

- [ ] **Step 2.3: Rewrite `session.ts`**

Replace entire file with:

```ts
/**
 * Auth session helpers.
 *
 * getCurrentUser     — request-scoped (React cache only). Calls auth.getUser() which
 *                      validates the live JWT with the Supabase auth server. Cannot
 *                      be cached cross-request without a security regression.
 *
 * getTenantBySlug    — cross-request cache (unstable_cache, 5-min TTL) + within-render
 *                      dedup (React cache). Tenant data rarely changes.
 *
 * getMembership      — cross-request cache (unstable_cache, 60-s TTL) + within-render
 *                      dedup. Membership changes only when an admin updates a user's role.
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ── getCurrentUser ────────────────────────────────────────────────────────────
// Must stay request-scoped: auth.getUser() verifies the JWT live.
export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// ── getTenantBySlug ───────────────────────────────────────────────────────────
// Uses service-role client inside unstable_cache (no request cookies available there).
// Tagged 'tenant' so admin routes can call revalidateTag('tenant') on tenant mutations.
const _getTenantBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('tenants')
      .select('id, name, slug, schema_name, status, plan, enabled_modules, created_at')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();
    return data ?? null;
  },
  ['tenant-by-slug'],
  { revalidate: 300, tags: ['tenant'] }
);
export const getTenantBySlug = cache(_getTenantBySlug);

// ── getMembership ─────────────────────────────────────────────────────────────
// 60-second TTL: short enough to reflect role changes promptly.
const _getMembership = unstable_cache(
  async (userId: string, tenantId: string) => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    return data ?? null;
  },
  ['user-membership'],
  { revalidate: 60 }
);
export const getMembership = cache(_getMembership);
```

- [ ] **Step 2.4: Build check**

```bash
pnpm build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 2.5: Functional test**

With `pnpm dev`:
1. Hard-refresh `/t/[slug]/dispatches`
2. Open Supabase dashboard → Logs → API logs
3. Navigate to 5 different pages (purchases, sales, analytics, etc.)
4. Check Supabase logs: after the FIRST navigation, subsequent navigations should show **zero** `SELECT * FROM tenants` or `SELECT * FROM user_tenants` queries (these are now cache hits).

- [ ] **Step 2.6: Commit**

```bash
git add src/core/auth/session.ts
git commit -m "perf: cache tenant and membership lookups cross-request with unstable_cache

React cache() only deduplicates within one render tree. On navigation, the
page RSC is a new tree — session functions were re-running on every click.
unstable_cache persists tenant (5min) and membership (60s) across requests,
eliminating 2 DB round-trips per navigation after the first load."
```

---

### Task 3: Cache user-permissions query in `page-guard.ts`

**Context:** For non-admin users, `requirePageAccess` queries `user_profiles.permissions` on every page that specifies a `permission` option. This is an extra ~50ms DB call per navigation for non-admins.

**File:** `src/core/auth/page-guard.ts`

- [ ] **Step 3.1: Read the current file**

Full path: `src/core/auth/page-guard.ts`. The uncached permissions query is in the non-admin branch.

- [ ] **Step 3.2: Add `getCachedUserPermissions` helper and wire it in**

Replace the inline `user_profiles` query with a cached version. The cache key must include both `userId` and `schemaName` because permissions are tenant-schema-specific.

Full replacement for `page-guard.ts`:

```ts
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser, getTenantBySlug, getMembership } from './session';
import type { Permission } from './types';

interface PageGuardOptions {
  tenantSlug: string;
  moduleId?: string;
  permission?: Permission;
  adminOnly?: boolean;
}

// Cache user permissions for 60s.
// Tagged 'user-permissions' so the user-settings PATCH route can bust it.
const getCachedUserPermissions = unstable_cache(
  async (userId: string, schemaName: string) => {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .schema(schemaName)
      .from('user_profiles')
      .select('permissions')
      .eq('user_id', userId)
      .single();
    return (data?.permissions ?? {}) as Record<string, boolean>;
  },
  ['user-permissions'],
  { revalidate: 60, tags: ['user-permissions'] }
);

/**
 * Server-side page guard. Call at the top of any page.tsx.
 * Tenant/user/membership lookups are cross-request cached (unstable_cache).
 * Permission lookup is also cached.
 */
export async function requirePageAccess({
  tenantSlug,
  moduleId,
  permission,
  adminOnly,
}: PageGuardOptions): Promise<void> {
  const [user, tenant] = await Promise.all([
    getCurrentUser(),
    getTenantBySlug(tenantSlug),
  ]);

  if (!user) redirect('/login');
  if (!tenant) redirect('/');

  const membership = await getMembership(user.id, tenant.id);
  if (!membership) redirect('/');

  const role = membership.role;

  if (adminOnly && role !== 'tenant_admin') redirect(`/t/${tenantSlug}`);
  if (moduleId && !tenant.enabled_modules?.includes(moduleId)) redirect(`/t/${tenantSlug}`);

  if (permission && role !== 'tenant_admin') {
    const permissions = await getCachedUserPermissions(user.id, tenant.schema_name);
    if (!permissions[permission]) redirect(`/t/${tenantSlug}`);
  }
}
```

**Note on `.schema()`:** The Supabase JS admin client supports `.schema(schemaName)` chaining. If your version doesn't, replace the query with a raw SQL RPC call. Verify during implementation.

- [ ] **Step 3.3: Build check**

```bash
pnpm build
```

Fix any TypeScript errors (likely the `.schema()` chain).

- [ ] **Step 3.4: Commit**

```bash
git add src/core/auth/page-guard.ts
git commit -m "perf: cache user permission lookups in requirePageAccess (unstable_cache, 60s)"
```

---

### Task 4: Add cache-invalidation `revalidateTag` calls

**Context:** The 5-min tenant cache and 60-s permission cache need to be busted when admins actually change data. Without invalidation, a removed user could still access pages for up to the TTL duration.

- [ ] **Step 4.1: Find and read the tenant PATCH route**

```bash
cat src/app/api/admin/tenants/[id]/route.ts
```

- [ ] **Step 4.2: Add `revalidateTag('tenant')` to tenant PATCH handler**

Inside the successful PATCH response block, add:

```ts
import { revalidateTag } from 'next/cache';
// ... after successful DB update:
revalidateTag('tenant');
```

- [ ] **Step 4.3: Find and read the user settings PATCH route**

```bash
cat "src/app/api/t/[tenantSlug]/settings/users/[userId]/route.ts"
```

- [ ] **Step 4.4: Add `revalidateTag` calls to user PATCH handler**

```ts
import { revalidateTag } from 'next/cache';
// ... after successful update (always revalidate both):
revalidateTag('user-membership');
revalidateTag('user-permissions');
```

- [ ] **Step 4.5: Build check and commit**

```bash
pnpm build
git add src/app/api/
git commit -m "perf: invalidate tenant/membership/permission caches on admin mutations

revalidateTag('tenant') on tenant PATCH, revalidateTag('user-membership')
and revalidateTag('user-permissions') on user settings PATCH. Ensures
stale cached auth data is never served after admin role/permission changes."
```

---

## Chunk 3: Middleware Cache + Prefetch Re-enablement

### Task 5: In-memory TTL cache in middleware

**Context:** Next.js middleware runs in Edge Runtime. `unstable_cache` (Node.js Data Cache) is not available there. A module-level `Map` is Edge-compatible and effectively caches within a single Edge worker instance. This eliminates 2 of the 3 middleware DB queries for repeated requests.

TTLs:
- Tenant: 5 minutes (low-change data)
- Membership: 60 seconds (role changes should reflect promptly)

**File:** `src/middleware.ts`

- [ ] **Step 5.1: Read current middleware**

```bash
cat src/middleware.ts
```

The tenant + membership queries are in the tenant-route section.

- [ ] **Step 5.2: Add cache infrastructure at top of file**

Add after the imports, before `middleware()`:

```ts
// ── Edge-compatible in-memory TTL cache ───────────────────────────────────────
// Module-level Maps survive across requests within one Edge worker instance.
// This avoids redundant DB queries for tenant/membership lookups.

interface CacheEntry<T> {
  data: T;
  exp: number;
}

const _tenantCache = new Map<string, CacheEntry<TenantRow>>();
const _memberCache = new Map<string, CacheEntry<{ role: string }>>();
const TTL_TENANT = 5 * 60 * 1000;   // 5 minutes
const TTL_MEMBER = 60 * 1000;        // 60 seconds

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) { map.delete(key); return null; }
  return entry.data;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
  map.set(key, { data, exp: Date.now() + ttl });
}

// Inline type for tenant row (mirrors what we select from `tenants`)
type TenantRow = {
  id: string;
  schema_name: string;
  status: string;
  enabled_modules: string[] | null;
};
```

- [ ] **Step 5.3: Replace the tenant + membership queries with cache-first logic**

Find the block that queries `tenants` and `user_tenants` tables and replace with:

```ts
// CACHE-FIRST: tenant
let tenant: TenantRow | null = cacheGet(_tenantCache, slug);
if (!tenant) {
  const { data } = await supabase
    .from('tenants')
    .select('id, schema_name, status, enabled_modules')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
  tenant = data ?? null;
  if (tenant) cacheSet(_tenantCache, slug, tenant, TTL_TENANT);
}
if (!tenant) return NextResponse.redirect(new URL('/', request.url));

// CACHE-FIRST: membership
const memberKey = `${user.id}:${tenant.id}`;
let membership: { role: string } | null = cacheGet(_memberCache, memberKey);
if (!membership) {
  const { data } = await supabase
    .from('user_tenants')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .single();
  membership = data ?? null;
  if (membership) cacheSet(_memberCache, memberKey, membership, TTL_MEMBER);
}
if (!membership) return NextResponse.redirect(new URL('/', request.url));
```

- [ ] **Step 5.4: Build check**

```bash
pnpm build
```

TypeScript may complain about `TenantRow` vs. the existing inline object type. Adjust `TenantRow` definition to match exactly what the `select()` returns. Fix any errors.

- [ ] **Step 5.5: Functional test**

With `pnpm dev`, check Network tab:
1. Hard refresh a tenant page → middleware makes DB queries (cold)
2. Click through 10 different pages rapidly
3. Open Supabase dashboard → API logs — confirm that after the first load, `SELECT ... FROM tenants WHERE slug = ...` appears at most once per 5 minutes

- [ ] **Step 5.6: Commit**

```bash
git add src/middleware.ts
git commit -m "perf: add in-memory TTL cache for tenant/membership in middleware

Edge Runtime doesn't support unstable_cache (Node.js only). Module-level
Map caches with 5min (tenant) and 60s (membership) TTLs eliminate 2 of the
3 middleware DB queries on repeated navigations within the same edge worker."
```

---

### Task 6: Re-enable link prefetching on sidebar

**Context:** `prefetch={false}` was added to prevent a "prefetch storm" when 16 nav items load simultaneously. With Fixes 2–5 in place, prefetch requests now hit the Next.js Data Cache (tenant/membership served from memory, no DB). Re-enabling prefetch means hovering or scrolling a nav link into view triggers the RSC fetch ahead of time — the click feels instant.

Next.js default behaviour: prefetches links that are **visible in the viewport** using Intersection Observer. On mobile, this means only visible bottom-nav items. On desktop, only sidebar items in view. No storm risk with warm caches.

**File:** `src/components/layout/sidebar.tsx`

- [ ] **Step 6.1: Read the NavLink component**

```bash
grep -n "prefetch" src/components/layout/sidebar.tsx
```

Locate the `prefetch={false}` prop on the `<Link>` component.

- [ ] **Step 6.2: Remove `prefetch={false}`**

```tsx
// BEFORE:
<Link
  href={href}
  prefetch={false}
  className={...}
>

// AFTER:
<Link
  href={href}
  className={...}
>
```

- [ ] **Step 6.3: Build check**

```bash
pnpm build
```

- [ ] **Step 6.4: Interaction test**

With `pnpm dev`:
1. Open DevTools → Network → filter by `Fetch/XHR`
2. Hover over "Dispatches" in the sidebar
3. Confirm: an RSC prefetch request fires (URL will contain `_rsc=` or the pathname)
4. Click "Dispatches" — page should load near-instantly (RSC already fetched)
5. Hover over "Purchases" → click → instant load
6. Confirm no network errors or 429s (rate limiting)

- [ ] **Step 6.5: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "perf: re-enable Next.js link prefetch on sidebar nav items

prefetch=false was preventing pre-loading of page RSC payloads, forcing
users to wait the full round-trip on every click. With unstable_cache
now serving tenant/membership from disk, prefetch requests are cheap
(no DB) and navigation feels instant."
```

---

## Verification Checklist

After all tasks complete:

- [ ] `pnpm build` passes with zero errors
- [ ] Navigate from dashboard to a dispatch detail → skeleton appears **immediately** on click (no blank flash)
- [ ] Navigate through 10+ sidebar pages rapidly → no blank screens, each page shows skeleton then content
- [ ] Open Supabase API logs → after first page load, confirm zero `tenants` or `user_tenants` DB queries for subsequent navigations
- [ ] Change a user's role in admin settings → wait 65 seconds → navigate to their page → confirm new role reflected (cache invalidated correctly)
- [ ] `pnpm build && pnpm start` → verify production build behaves same as dev
- [ ] Mobile (375px): tap sidebar → confirm no prefetch storm (no 16 simultaneous requests)

## Expected Outcome

| Scenario | Before | After |
|----------|--------|-------|
| Click dispatch from dashboard | ~800ms blank screen | Skeleton in <50ms, data in ~400ms |
| Sidebar hover → click (warm cache) | ~750ms (no prefetch) | Near-instant |
| Repeat navigation (same user) | ~700ms (fresh DB each time) | ~150ms (only getUser() uncached) |
| First load (cold cache) | ~700ms | ~450ms (one getUser() + page data) |
