# Fix Admin Panel + Sync Supabase DB to v2 Schema

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the production Supabase database to the v2 Drizzle schema, add a sign-out button to the admin panel, fix the PATCH handler that causes module toggles to fail, and add the missing access-request creation endpoint so the self-signup flow works end-to-end.

**Architecture:** The Supabase database is still running the old (v1) schema while the v2 app expects 23 tables + 1 view. We use `drizzle-kit push` to push the v2 schema directly (user confirmed no paying customers, all test accounts). The admin layout is a React Server Component that can't handle events — we extract an `AdminHeader` client component. The PATCH handler's `{ ...parsed }` spread causes jsonb serialization failures — fix with explicit field mapping. The self-signup flow is broken because nothing creates `access_requests` rows — we add a public API endpoint and call it from the no-tenant page.

**Tech Stack:** Next.js 16, Supabase Auth (service role admin client), Drizzle ORM, shadcn/ui, Tailwind v4

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| — | `drizzle.config.ts` | Verify DATABASE_URL config for push |
| Create | `src/app/admin/admin-header.tsx` | Client component: admin nav + user avatar + sign-out |
| Modify | `src/app/admin/layout.tsx` | Replace inline header with `<AdminHeader />` |
| Modify | `src/app/api/v1/admin/tenants/[id]/route.ts:42-45` | Fix PATCH: explicit field mapping, cast all jsonb |
| Modify | `src/app/admin/tenants/[id]/page.tsx:48,76,96` | Add `console.error` to catch blocks for debugging |
| Create | `src/app/api/v1/access-requests/route.ts` | Public endpoint to create access requests |
| Modify | `src/app/(auth)/no-tenant/no-tenant-actions.tsx` | Auto-create access request on mount |

---

## Chunk 0: Sync Supabase Database to v2 Schema

### Task 0: Push v2 Drizzle schema to production Supabase

**Context:** The user rebuilt the app as v2 from scratch, but the production Supabase database still has the old schema. The Drizzle schema (`src/core/db/schema/`) defines 23 tables. The existing migration file (`supabase/migrations/0000_lonely_lady_mastermind.sql`) is missing the `access_requests` table. Since there are no paying customers (all test accounts), we can safely push the schema directly.

**Approach:** Use `pnpm drizzle-kit push` which compares the Drizzle schema against the live database and applies the diff. After push, manually apply the `stock_levels` VIEW and RLS policies via SQL since Drizzle Kit doesn't manage those.

**Files:**
- Reference: `drizzle.config.ts` (connection config)
- Reference: `src/core/db/schema/index.ts` (all table exports)
- Reference: `supabase/migrations/0000_lonely_lady_mastermind.sql:326-502` (RLS + VIEW SQL)

- [ ] **Step 0a: Verify DATABASE_URL is set**

```bash
grep DATABASE_URL .env.local
```

If missing, construct it from the Supabase project URL:
`postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

The user will need to provide the password if it's not in `.env.local`.

- [ ] **Step 0b: Run `drizzle-kit push` to sync schema**

```bash
pnpm drizzle-kit push
```

This will:
1. Compare Drizzle schema against live DB
2. Show the diff (tables to create/alter)
3. Apply changes after confirmation

**Expected:** Creates missing tables (at minimum `access_requests`, possibly all 23 v2 tables if DB is completely from v1). May alter existing tables if columns differ.

**Important:** If it asks to DROP tables/columns from the old schema, review carefully. The user confirmed all accounts are test data, so old v1-only tables can be dropped.

- [ ] **Step 0c: Apply RLS policies + stock_levels VIEW + extra indexes**

After `drizzle-kit push`, RLS policies and the `stock_levels` VIEW need to be applied manually. Run the following SQL against the production database (use Supabase SQL Editor or CLI).

The SQL is in `supabase/migrations/0000_lonely_lady_mastermind.sql` lines 326-502. Key sections:

**Self-referential FK constraints** (lines 329-333):
```sql
ALTER TABLE "locations" ADD CONSTRAINT IF NOT EXISTS "locations_parent_location_id_fk"
  FOREIGN KEY ("parent_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;

ALTER TABLE "units" ADD CONSTRAINT IF NOT EXISTS "units_base_unit_id_fk"
  FOREIGN KEY ("base_unit_id") REFERENCES "public"."units"("id") ON DELETE SET NULL;
```

**Additional composite indexes** (lines 338-340):
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "idx_locations_code" ON "locations"("tenant_id", "code") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts"("tenant_id", "email") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_payments_type_ref" ON "payments"("tenant_id", "type", "reference_id");
```

**RLS policies for 16 tenant-scoped tables** (lines 344-409):
```sql
-- For each of: items, locations, units, contacts, custom_field_definitions,
-- sales, purchases, transfers, adjustments, user_profiles, user_locations,
-- audit_log, sequence_counters, alert_thresholds, payments, user_tenants

ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "<table>" FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Use `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` pattern to make it idempotent if policies already exist.

**stock_levels VIEW** (lines 421-502):
```sql
CREATE OR REPLACE VIEW stock_levels AS
-- (full SQL from migration file lines 421-502)
```

- [ ] **Step 0d: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

Expected: 23 tables including `access_requests`.

- [ ] **Step 0e: Verify super_admin record exists**

```sql
SELECT * FROM super_admins;
```

If empty, insert (get user_id from Supabase Auth dashboard → Users):
```sql
INSERT INTO super_admins (user_id)
VALUES ('<user-uuid-from-supabase-auth>')
ON CONFLICT (user_id) DO NOTHING;
```

- [ ] **Step 0f: Verify tenant + user_tenants records**

```sql
SELECT id, name, slug, status, enabled_modules FROM tenants;
SELECT ut.user_id, t.name, ut.role FROM user_tenants ut JOIN tenants t ON t.id = ut.tenant_id;
```

If tenant data is missing, that's OK — the admin panel's "Access Requests" flow will handle it once all code fixes are applied.

---

## Chunk 1: Add Sign-Out Button to Admin Panel

### Task 1: Create AdminHeader client component + update layout

**Context:** The admin layout (`src/app/admin/layout.tsx`) is a React Server Component — it uses `headers()`, `redirect()`, and DB queries. Server Components cannot handle `onClick` or `useState`. Super-admins currently have no way to log out. We extract the header into a client component.

**Files:**
- Create: `src/app/admin/admin-header.tsx`
- Modify: `src/app/admin/layout.tsx:22-49`

**Reuse:** Sign-out pattern from `src/components/layout/header.tsx:31-37`. Design tokens from CLAUDE.md (400/700 weights, accent-color for active state, pill avatar).

- [ ] **Step 1a: Create `src/app/admin/admin-header.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/access-requests', label: 'Access Requests' },
];

export function AdminHeader({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : '??';

  return (
    <header
      className="border-b border-[var(--border)] px-6 py-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1
          style={{ color: 'var(--text-primary)' }}
          className="text-[17px] font-bold"
        >
          WareOS Admin
        </h1>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: pathname.startsWith(link.href)
                    ? 'var(--accent-color)'
                    : 'var(--text-muted)',
                }}
                className={`text-[14px] hover:underline ${
                  pathname.startsWith(link.href) ? 'font-bold' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-4">
            <span
              style={{
                backgroundColor: 'var(--accent-tint)',
                color: 'var(--accent-color)',
                borderRadius: '9999px',
                width: '36px',
                height: '36px',
              }}
              className="flex items-center justify-center text-[13px] font-bold shrink-0"
              title={email}
            >
              {initials}
            </span>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-[13px] gap-2"
            >
              <LogOut className="size-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 1b: Update `src/app/admin/layout.tsx`**

Replace the entire file with:

```tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/core/db/drizzle';
import { superAdmins } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { AdminHeader } from './admin-header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email') ?? '';

  if (!userId) {
    redirect('/login');
  }

  const result = await db.select().from(superAdmins).where(eq(superAdmins.userId, userId));
  if (result.length === 0) {
    redirect('/');
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-off)' }} className="min-h-screen">
      <AdminHeader email={userEmail} />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

Key changes:
- Remove `Link` import (no longer used in layout)
- Add `AdminHeader` import
- Read `x-user-email` from headers (line 12) — already set by middleware for super-admins (`src/middleware.ts:74`)
- Replace inline `<header>` JSX (old lines 24-48) with `<AdminHeader email={userEmail} />`

- [ ] **Step 1c: Type-check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 1d: Commit**

```bash
git add src/app/admin/admin-header.tsx src/app/admin/layout.tsx
git commit -m "feat(admin): add sign-out button to admin panel header

Admin layout is a server component, so extract AdminHeader as a client
component with nav links (active-state highlighting), user avatar, and
sign-out button. Matches tenant header sign-out pattern."
```

---

## Chunk 2: Fix Module Toggle PATCH Handler

### Task 2: Fix PATCH handler — explicit field mapping with jsonb casts

**Context:** The PATCH handler at `src/app/api/v1/admin/tenants/[id]/route.ts` spreads the Zod-parsed output into `setData` with `{ ...parsed }`. For jsonb columns (`enabledModules`, `settings`), this puts raw JS arrays/objects into the Drizzle `.set()` call. postgres.js binds JS arrays as Postgres native arrays (not JSON), causing "malformed array literal" errors. The current code only casts `enabledModules` via `sql` template and misses `settings`. Fix: don't spread — explicitly map each field.

**Files:**
- Modify: `src/app/api/v1/admin/tenants/[id]/route.ts:42-45`

- [ ] **Step 2a: Replace lines 42-45 in the PATCH handler**

Old code (lines 42-45):
```typescript
  const setData: Record<string, unknown> = { ...parsed, updatedAt: new Date() };
  if (parsed.enabledModules) {
    setData.enabledModules = sql`${JSON.stringify(parsed.enabledModules)}::jsonb`;
  }
```

New code:
```typescript
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) setData.name = parsed.name;
  if (parsed.status !== undefined) setData.status = parsed.status;
  if (parsed.plan !== undefined) setData.plan = parsed.plan;
  if (parsed.settings !== undefined) {
    setData.settings = sql`${JSON.stringify(parsed.settings)}::jsonb`;
  }
  if (parsed.enabledModules !== undefined) {
    setData.enabledModules = sql`${JSON.stringify(parsed.enabledModules)}::jsonb`;
  }
```

Why `!== undefined` instead of truthiness: `parsed.enabledModules` could be an empty array `[]` which is falsy-ish in some contexts. Using `!== undefined` ensures we only skip fields that weren't sent in the request body.

- [ ] **Step 2b: Type-check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 2c: Commit**

```bash
git add src/app/api/v1/admin/tenants/[id]/route.ts
git commit -m "fix(admin): explicit field mapping in tenant PATCH handler

Don't spread parsed Zod output into setData — this puts raw JS
arrays/objects for jsonb columns before the sql cast override.
Explicitly map each field and cast both enabledModules and settings
via sql template with ::jsonb."
```

---

## Chunk 3: Add Error Logging + Access Request Creation

### Task 3a: Add console.error to catch blocks on tenant detail page

**Context:** All three catch blocks in `src/app/admin/tenants/[id]/page.tsx` swallow errors silently — only showing a toast. Adding `console.error` makes production failures visible in browser DevTools.

**Files:**
- Modify: `src/app/admin/tenants/[id]/page.tsx:48,76,96`

- [ ] **Step 3a-1: Add error logging to all three catch blocks**

In `fetchTenant` (line 48):
```typescript
// OLD:
    } catch {
      toast.error('Failed to load tenant');

// NEW:
    } catch (err) {
      console.error('[admin/tenant] fetch failed:', err);
      toast.error('Failed to load tenant');
```

In `toggleModule` (line 76):
```typescript
// OLD:
    } catch {
      toast.error('Failed to update modules');

// NEW:
    } catch (err) {
      console.error('[admin/tenant] module toggle failed:', err);
      toast.error('Failed to update modules');
```

In `toggleStatus` (line 95):
```typescript
// OLD:
    } catch {
      toast.error('Failed to update status');

// NEW:
    } catch (err) {
      console.error('[admin/tenant] status toggle failed:', err);
      toast.error('Failed to update status');
```

- [ ] **Step 3a-2: Type-check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3a-3: Commit**

```bash
git add src/app/admin/tenants/[id]/page.tsx
git commit -m "fix(admin): add error logging to tenant detail catch blocks

Log actual errors in fetchTenant, toggleModule, toggleStatus catch
blocks so production failures are visible in browser console."
```

### Task 3b: Add access request creation endpoint

**Context:** The self-signup flow is broken in v2. When a new user signs up and lands on `/no-tenant`, no `access_requests` row is created — the admin panel's "Access Requests" page shows nothing. In v1, a POST endpoint handled this. We need to add it back.

The endpoint must be publicly accessible (no tenant context required) but must require a valid user session. It should be idempotent — calling it multiple times for the same user should not create duplicates.

**Files:**
- Create: `src/app/api/v1/access-requests/route.ts`
- Modify: `src/app/(auth)/no-tenant/no-tenant-actions.tsx`

- [ ] **Step 3b-1: Create `src/app/api/v1/access-requests/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db/drizzle';
import { accessRequests } from '@/core/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');

  if (!userId || !userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Idempotent: check if a pending request already exists
  const existing = await db
    .select()
    .from(accessRequests)
    .where(and(eq(accessRequests.userId, userId), eq(accessRequests.status, 'pending')));

  if (existing.length > 0) {
    return NextResponse.json({ id: existing[0].id, status: 'already_pending' });
  }

  const [created] = await db
    .insert(accessRequests)
    .values({ userId, email: userEmail })
    .returning();

  return NextResponse.json({ id: created.id, status: 'created' }, { status: 201 });
}
```

- [ ] **Step 3b-2: Ensure middleware passes headers for this route**

Check `src/middleware.ts` — the `/no-tenant` page is a public route but the user will have a session. The `/api/v1/access-requests` route is NOT in the public routes list, so middleware will process it. For users without tenant context but with a valid session, middleware sets `x-user-id` and `x-user-email` headers before redirecting to `/no-tenant` (see `src/middleware.ts:104-110`).

**However**, the API endpoint `/api/v1/access-requests` is not under `/api/v1/admin/` (no admin guard needed) and not under `/api/v1/t/[tenantSlug]/` (no tenant context needed). We need to verify middleware doesn't redirect API calls from no-tenant users.

Check middleware behavior for this path: the middleware should set `x-user-id` and `x-user-email` even when there's no tenant, as long as there's a valid JWT. Looking at `src/middleware.ts` — the redirect to `/no-tenant` only happens for page routes, not API routes. API routes without tenant context will still have `x-user-id` and `x-user-email` set from the JWT decode.

If middleware redirects this API call, add `/api/v1/access-requests` to the public routes list in `src/middleware.ts:9-18`.

- [ ] **Step 3b-3: Update `src/app/(auth)/no-tenant/no-tenant-actions.tsx`**

Add a `useEffect` to auto-create the access request when the page loads. Read the existing file first — it has "Try Again" and "Sign Out" buttons.

Add to the component:
```typescript
import { useEffect, useRef } from 'react';

// Inside the component, add:
const requested = useRef(false);

useEffect(() => {
  if (requested.current) return;
  requested.current = true;
  fetch('/api/v1/access-requests', { method: 'POST' }).catch(() => {});
}, []);
```

This fires once on mount and is idempotent (the endpoint checks for existing pending requests).

- [ ] **Step 3b-4: Type-check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3b-5: Commit**

```bash
git add src/app/api/v1/access-requests/route.ts src/app/(auth)/no-tenant/no-tenant-actions.tsx
git commit -m "feat(auth): add access request creation endpoint for self-signup

New users landing on /no-tenant now auto-create a pending access
request via POST /api/v1/access-requests. Endpoint is idempotent —
won't create duplicates. Admin panel can now see and approve these."
```

---

## Chunk 4: Build, Deploy, Verify

### Task 4: Production build + deploy + Playwright verification

- [ ] **Step 4a: Type-check + production build**

```bash
npx tsc --noEmit && pnpm build
```
Expected: Zero errors, successful build

- [ ] **Step 4b: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 4c: Playwright verification on production (wareos.in)**

1. **Sign-out button visible:** Navigate to `https://wareos.in/admin` → verify header has user avatar + "Sign out" button
2. **Active nav highlighting:** Click "Tenants" → verify accent-color highlight. Click "Access Requests" → verify that one highlights instead.
3. **Sign-out works:** Click "Sign out" → verify redirect to `/login` → verify navigating to `/admin` also redirects to `/login` (session cleared)
4. **Module toggle:** Navigate to `/admin/tenants/{id}` → click a module → verify "Modules updated" toast, no console errors → refresh → verify state persisted
5. **Console clean:** Check browser console for zero errors on admin pages

---

## Verification Summary

### Database Sync
- [ ] `pnpm drizzle-kit push` completes without errors
- [ ] All 23 tables exist in the public schema (including `access_requests`)
- [ ] `stock_levels` VIEW exists and returns results (or empty set)
- [ ] RLS policies enabled on all 16 tenant-scoped tables
- [ ] `super_admins` table has the user's record

### Automated
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `pnpm build` — production build succeeds

### Playwright MCP (wareos.in)
1. Sign-out button visible on `/admin`
2. Nav link active-state highlighting works
3. Sign-out redirects to `/login`
4. Module toggle on `/admin/tenants/{id}` works and persists
5. Browser console is clean (zero errors)
6. New user sign-up → lands on `/no-tenant` → access request appears in admin panel
