# Fix Login Flow, CI Lint & Production Bugs — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all production bugs (broken password login, CI lint failure, missing API routes, broken manifest icons) and verify with a fresh test user login via Playwright on wareos.in.

**Architecture:** Password login (`signInWithPassword`) bypasses `/auth/callback` entirely — it authenticates client-side but never calls `syncUserAppMetadata()`, leaving the JWT without tenant info. The fix adds a server-side `/api/auth/sync` POST route that the login page calls after successful password auth. CI is blocked by a single lint error (`<a>` instead of `<Link>`) plus 19 warnings. Secondary fixes address missing onboarding endpoint and broken manifest icons. Final verification creates a fresh Supabase test user + tenant membership and logs in via Playwright MCP on production.

**Tech Stack:** Next.js 16, Supabase Auth (@supabase/ssr), Drizzle ORM, Playwright MCP, ESLint

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| **Create** | `src/app/api/auth/sync/route.ts` | POST endpoint: sync app_metadata + refresh JWT for password logins |
| **Create** | `src/app/api/v1/t/[tenantSlug]/onboarding/status/route.ts` | GET endpoint: check if tenant needs onboarding wizard |
| Modify | `src/app/(auth)/login/page.tsx` | Replace `router.refresh()` with sync call + redirect |
| Modify | `src/middleware.ts` | Add `/api/auth/sync` to PUBLIC_ROUTES |
| Modify | `src/app/(auth)/no-tenant/no-tenant-actions.tsx` | Replace `<a>` with `<Link>` (lint error) |
| Modify | `public/manifest.json` | Fix icon paths `.png` → `.svg` |
| Modify | 10 files with lint warnings | Remove unused imports/vars |

---

## Chunk 1: Fix CI lint errors (BLOCKING — must be first)

### Background

CI fails at `pnpm lint` with 1 error and 19 warnings. The single **error** blocks all downstream jobs (typecheck, build, E2E):

```
src/app/(auth)/no-tenant/no-tenant-actions.tsx:21:7
  error  Do not use an `<a>` element to navigate to `/`. Use `<Link />` from `next/link` instead.
```

The 19 warnings are unused imports/vars across multiple files. While they don't block CI individually, cleaning them prevents future noise and keeps the codebase tidy.

### Task 1: Fix the lint error in no-tenant-actions.tsx

**Files:**
- Modify: `src/app/(auth)/no-tenant/no-tenant-actions.tsx:1-42`

- [ ] **Step 1: Fix the `<a>` → `<Link>` lint error**

Replace the entire file content with:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NoTenantActions() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Link
        href="/"
        className="inline-flex h-[48px] items-center justify-center rounded-full text-[14px] font-bold text-white"
        style={{ background: 'var(--accent-color)' }}
      >
        Try Again
      </Link>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-[48px] items-center justify-center rounded-full text-[14px] font-bold"
        style={{
          color: 'var(--text-muted)',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
        }}
      >
        {signingOut ? 'Signing out\u2026' : 'Sign Out'}
      </button>
    </div>
  );
}
```

**What changed:** Added `import Link from 'next/link'`, replaced `<a href="/">` with `<Link href="/">`.

### Task 2: Fix all lint warnings

**Files to modify (one line each):**

- [ ] **Step 1: Fix unused imports and variables**

Each fix below is a single-line removal or replacement:

1. **`src/app/admin/access-requests/page.tsx`** — Remove unused `Badge` import
2. **`src/app/api/v1/admin/access-requests/route.ts`** — Remove unused `NextRequest` import
3. **`src/app/api/v1/admin/tenants/[id]/route.ts`** — Remove unused `NextRequest` import
4. **`src/app/api/v1/admin/tenants/route.ts`** — Remove unused `NextRequest` import
5. **`src/app/auth/callback/route.ts:17`** — Change `any` to `Record<string, string>` for responseCookies type
6. **`src/app/t/[tenantSlug]/settings/users/users-client.tsx:77`** — Remove unused `editUser` / `setEditUser` state
7. **`src/components/realtime/realtime-provider.tsx:3`** — Remove unused `useState` from import
8. **`src/components/realtime/stock-realtime-listener.tsx:3`** — Remove unused `useEffect` from import
9. **`src/modules/user-management/queries/users.ts:1`** — Remove unused `ilike` import
10. **`src/modules/user-management/queries/users.ts:71`** — Remove unused `userIds` variable
11. **`tests/core/auth/sync-metadata.test.ts:1`** — Remove unused `vi`, `beforeEach` imports

**Note:** The `data-table.tsx` TanStack Table warning (`react-hooks/incompatible-library`) and `no-empty-object-type` warnings on shadcn/ui files (`command.tsx`, `input.tsx`, `textarea.tsx`) are already downgraded to warnings in `eslint.config.mjs` and cannot be meaningfully fixed. Leave them as-is.

- [ ] **Step 2: Verify lint passes**

```bash
pnpm lint
```

Expected: `✔ No ESLint warnings or errors` (or warnings-only, zero errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/no-tenant/no-tenant-actions.tsx \
  src/app/admin/access-requests/page.tsx \
  src/app/api/v1/admin/access-requests/route.ts \
  src/app/api/v1/admin/tenants/\[id\]/route.ts \
  src/app/api/v1/admin/tenants/route.ts \
  src/app/auth/callback/route.ts \
  src/app/t/\[tenantSlug\]/settings/users/users-client.tsx \
  src/components/realtime/realtime-provider.tsx \
  src/components/realtime/stock-realtime-listener.tsx \
  src/modules/user-management/queries/users.ts \
  tests/core/auth/sync-metadata.test.ts
git commit -m "fix(lint): resolve all ESLint errors and warnings for CI

Replace <a> with <Link> in no-tenant-actions.tsx (the one error blocking CI).
Remove unused imports/variables across 10 files (19 warnings)."
```

---

## Chunk 2: Fix password login flow

### Background: Why password login is broken

Two bugs in `src/app/(auth)/login/page.tsx`:

1. **No redirect (line 44):** After `signInWithPassword()`, the code calls `router.refresh()`. Since `/login` is a public route, middleware passes through without redirect. User stays stuck on login with "Signing in..." forever.

2. **No metadata sync:** OAuth login goes through `/auth/callback` → `syncUserAppMetadata()` → JWT gets `tenant_id`, `tenant_slug`, `role`, etc. Password login skips all of this. The JWT has no tenant info → middleware redirects to `/no-tenant`.

**Fix:** Create `/api/auth/sync` POST route (mirrors what `/auth/callback` does for OAuth). The login page calls it after successful password auth, gets back the tenant slug, and redirects.

### Task 3: Create `/api/auth/sync` route

**Files:**
- Create: `src/app/api/auth/sync/route.ts`

- [ ] **Step 1: Create the sync route**

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 });
  }

  try {
    await syncUserAppMetadata(session.user.id);
    const { data: refreshData } = await supabase.auth.refreshSession();
    const tenantSlug =
      refreshData.session?.user?.app_metadata?.tenant_slug ?? null;

    return NextResponse.json({ tenant_slug: tenantSlug });
  } catch (e) {
    console.error('Failed to sync metadata on password login:', e);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
```

### Task 4: Add `/api/auth/sync` to middleware PUBLIC_ROUTES

**Files:**
- Modify: `src/middleware.ts:9-17`

- [ ] **Step 1: Add the route to PUBLIC_ROUTES**

Add `/api/auth/sync` to the array so the request isn't blocked by middleware (the session cookie is present but the JWT won't have tenant info yet):

```ts
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth/callback',
  '/api/auth/sync',
  '/reset-password',
  '/set-password',
  '/no-tenant',
  '/api/inngest',
];
```

### Task 5: Update login page to use sync + redirect

**Files:**
- Modify: `src/app/(auth)/login/page.tsx:28-45`

- [ ] **Step 1: Replace `router.refresh()` with sync call**

Replace the `handleLogin` function (lines 28-45):

**Before:**
```ts
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }
```

**After:**
```ts
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      const body = await res.json();

      if (body.tenant_slug) {
        router.push(`/t/${body.tenant_slug}`);
      } else {
        router.push('/no-tenant');
      }
    } catch {
      router.push('/');
    }
  }
```

- [ ] **Step 2: Verify locally**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/login` → enter credentials → click "Sign In".
Expected: redirects to `/t/demo` (not stuck on login).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/sync/route.ts src/middleware.ts src/app/\(auth\)/login/page.tsx
git commit -m "fix(auth): add metadata sync for password login and fix redirect

Password login bypassed /auth/callback so syncUserAppMetadata() was never
called — JWT had no tenant info. Added /api/auth/sync POST route that syncs
metadata and returns tenant_slug. Login page now calls it after
signInWithPassword and redirects to /t/{slug}."
```

---

## Chunk 3: Fix manifest.json + add onboarding status endpoint

### Task 6: Fix manifest.json icon references

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Update icon paths from .png to .svg**

The icons exist as SVGs (`public/icons/icon-192.svg`, `public/icons/icon-512.svg`) but manifest references `.png`.

Replace the full file:

```json
{
  "name": "WareOS",
  "short_name": "WareOS",
  "description": "Inventory & Warehouse Management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F3EF",
  "theme_color": "#F27B35",
  "icons": [
    { "src": "/icons/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "/icons/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "fix(pwa): update manifest.json icon paths from .png to .svg"
```

### Task 7: Create onboarding status endpoint

**Files:**
- Create: `src/app/api/v1/t/[tenantSlug]/onboarding/status/route.ts`

**Background:** The `OnboardingWizard` component (`src/components/onboarding/onboarding-wizard.tsx:579`) fetches `/api/v1/t/{slug}/onboarding/status` on every tenant page load. This route doesn't exist → 404 in console. The wizard catches the error silently, but the 404 is noisy.

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/core/auth/guards';
import { errorResponse } from '@/core/api/error-handler';
import { db } from '@/core/db/drizzle';
import { locations, units, items } from '@/core/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const GET = withTenantContext(
  async (_req: NextRequest, ctx) => {
    try {
      const [locationCount, unitCount, itemCount] = await Promise.all([
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(locations)
          .where(
            and(eq(locations.tenantId, ctx.tenantId), isNull(locations.deletedAt))
          ),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(units)
          .where(eq(units.tenantId, ctx.tenantId)),
        db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(items)
          .where(
            and(eq(items.tenantId, ctx.tenantId), isNull(items.deletedAt))
          ),
      ]);

      const hasLocations = Number(locationCount[0]?.count ?? 0) > 0;
      const hasUnits = Number(unitCount[0]?.count ?? 0) > 0;
      const hasItems = Number(itemCount[0]?.count ?? 0) > 0;

      return NextResponse.json({
        needed: !hasLocations || !hasUnits || !hasItems,
        hasLocations,
        hasUnits,
        hasItems,
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
  { permission: 'inventory:read' },
);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/t/\[tenantSlug\]/onboarding/status/route.ts
git commit -m "feat(onboarding): add /onboarding/status API route

Returns whether tenant needs onboarding (has locations, units, items).
Previously returned 404 on every page load."
```

---

## Chunk 4: Create test user + Playwright login verification on production

### Background

To verify the full login flow works end-to-end on production (wareos.in), we need:
1. A fresh Supabase user with a known password
2. A `user_tenants` record linking them to the "demo" tenant
3. `syncUserAppMetadata()` called to populate their JWT
4. Playwright MCP to navigate to wareos.in, login, and verify redirect to `/t/demo`

### Task 8: Create test tenant-admin user via Supabase Admin API

- [ ] **Step 1: Deploy all code changes first**

```bash
vercel --prod
```

Wait for deployment to complete (should take ~60s).

- [ ] **Step 2: Create user via Supabase Admin API**

Use the Supabase admin client (service role key from `.env.local`) to:

1. Create a new user with `admin.auth.admin.createUser()`:
   - Email: `testadmin2@wareos.in`
   - Password: `TestAdmin2026x`
   - `email_confirm: true` (skip email verification)

2. Insert a `user_tenants` record:
   - `userId`: the new user's ID
   - `tenantId`: the demo tenant ID (query `tenants` table for `slug = 'demo'`)
   - `role`: `'admin'`
   - `isDefault`: `true`

3. Call `syncUserAppMetadata(userId)` to populate the JWT.

This can be done with a Node.js script:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://elmfdrflziuicgnmmcig.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
(async () => {
  // Create user
  const { data: user, error: createErr } = await client.auth.admin.createUser({
    email: 'testadmin2@wareos.in',
    password: 'TestAdmin2026x',
    email_confirm: true,
  });
  if (createErr) { console.error('Create failed:', createErr); return; }
  console.log('Created user:', user.user.id);

  // Get demo tenant ID
  const { data: tenant } = await client.from('tenants').select('id').eq('slug', 'demo').single();
  if (!tenant) { console.error('No demo tenant found'); return; }
  console.log('Demo tenant:', tenant.id);

  // Link user to tenant
  const { error: linkErr } = await client.from('user_tenants').insert({
    user_id: user.user.id,
    tenant_id: tenant.id,
    role: 'admin',
    is_default: true,
  });
  if (linkErr) console.error('Link failed:', linkErr);
  else console.log('Linked user to tenant');

  // Sync metadata
  const { error: metaErr } = await client.auth.admin.updateUserById(user.user.id, {
    app_metadata: {
      tenant_id: tenant.id,
      tenant_slug: 'demo',
      role: 'admin',
      enabled_modules: [],
      memberships: [{ tenantId: tenant.id, slug: 'demo', role: 'admin' }],
    },
  });
  if (metaErr) console.error('Metadata sync failed:', metaErr);
  else console.log('Metadata synced');
})();
" 2>&1
```

**Note:** If the user `testadmin2@wareos.in` already exists, skip creation and just ensure the `user_tenants` record and `app_metadata` are correct.

### Task 9: Verify login via Playwright MCP on production

- [ ] **Step 1: Navigate to wareos.in login page**

Use Playwright MCP tool: `mcp__plugin_playwright_playwright__browser_navigate` to `https://wareos.in/login`

- [ ] **Step 2: Fill in credentials**

Use `mcp__plugin_playwright_playwright__browser_fill_form`:
- Email field: `testadmin2@wareos.in`
- Password field: `TestAdmin2026x`

- [ ] **Step 3: Click "Sign In"**

Use `mcp__plugin_playwright_playwright__browser_click` on the "Sign In" button.

- [ ] **Step 4: Wait for redirect**

Use `mcp__plugin_playwright_playwright__browser_wait_for` — wait for URL to contain `/t/demo`.

- [ ] **Step 5: Take screenshot of dashboard**

Use `mcp__plugin_playwright_playwright__browser_take_screenshot` — save to `screenshots/login-test-dashboard.png`.

- [ ] **Step 6: Check console for errors**

Use `mcp__plugin_playwright_playwright__browser_console_messages` — verify no errors related to:
- `manifest.json` parse error
- `onboarding/status` 404
- `analytics` 500

**Expected result:**
- User redirects from `/login` to `/t/demo` within 3-5 seconds
- Dashboard loads with KPI cards
- Console shows no errors (warnings about React compiler / TanStack Table are acceptable)

---

## Verification Checklist

1. **CI passes:** Push to main → `gh run list --limit 1` shows success for all 4 jobs
2. **Password login works:** Login with email/password → redirects to `/t/{slug}`
3. **OAuth login still works:** Google OAuth → redirects to `/t/{slug}` (regression check)
4. **No-tenant page works:** User without tenant → lands on `/no-tenant` with working "Try Again" (Link) and "Sign Out" buttons
5. **manifest.json:** No console error about missing `.png` icons
6. **Onboarding status:** No 404 in console for `/onboarding/status`
7. **Analytics:** Dashboard KPIs load (or gracefully show 0s for empty tenant)
