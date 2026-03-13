# Fix Super-Admin Login Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow super-admins (who may have zero tenant memberships) to log in and reach the `/admin` panel.

**Architecture:** Add `is_super_admin: boolean` to Supabase `app_metadata` (embedded in JWT) during login sync. The middleware uses this flag to route super-admins to `/admin` without a DB call — preserving the zero-DB-calls-in-middleware rule. The login page checks the flag to redirect appropriately.

**Tech Stack:** Next.js middleware, Supabase Auth app_metadata, Drizzle ORM, Vitest

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/core/auth/types.ts` | Add `is_super_admin?` to JWT type |
| Modify | `src/core/auth/sync-metadata.ts` | Query `super_admins` table, set flag in app_metadata |
| Modify | `src/app/api/auth/sync/route.ts` | Return `is_super_admin` in sync response |
| Modify | `src/app/(auth)/login/page.tsx` | Redirect super-admins to `/admin` |
| Modify | `src/middleware.ts` | Allow super-admins on `/admin` routes without tenant; redirect to `/admin` |
| Modify | `tests/core/auth/sync-metadata.test.ts` | Update + add tests for `buildAppMetadata` with super-admin flag |

No new files created. OAuth callback (`src/app/auth/callback/route.ts`) needs no changes — middleware handles the redirect after sync.

---

## Chunk 1: Core Auth Layer (types + sync-metadata + tests)

### Task 1: Add `is_super_admin` to JWT type

**Files:**
- Modify: `src/core/auth/types.ts:6-16`

- [ ] **Step 1: Add `is_super_admin` field to `AppJwtPayload.app_metadata`**

```typescript
// src/core/auth/types.ts — add after enabled_modules (line 10)
    is_super_admin?: boolean;
```

The field is optional so existing JWTs without it read as `undefined`/falsy (backward-compatible).

- [ ] **Step 2: Run type-check to verify no breakage**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 2: Write failing tests for super-admin metadata

**Files:**
- Modify: `tests/core/auth/sync-metadata.test.ts`

- [ ] **Step 3: Add test — super-admin with no memberships returns minimal metadata**

```typescript
  it('returns minimal metadata with is_super_admin for admin with no memberships', () => {
    const result = buildAppMetadata([], [], true);
    expect(result).toEqual({
      tenant_id: '',
      tenant_slug: '',
      role: 'viewer',
      enabled_modules: [],
      is_super_admin: true,
      memberships: [],
    });
  });
```

- [ ] **Step 4: Add test — super-admin WITH memberships includes flag**

```typescript
  it('includes is_super_admin flag alongside tenant context', () => {
    const memberships = [
      { userId: 'u1', tenantId: 't1', role: 'owner' as const, isDefault: true },
    ];
    const tenantRows = [{ id: 't1', slug: 'acme', enabledModules: ['inventory'] }];
    const result = buildAppMetadata(memberships, tenantRows, true);
    expect(result?.is_super_admin).toBe(true);
    expect(result?.tenant_id).toBe('t1');
    expect(result?.tenant_slug).toBe('acme');
  });
```

- [ ] **Step 5: Add test — regular user gets `is_super_admin: false`**

```typescript
  it('sets is_super_admin false for regular users', () => {
    const memberships = [
      { userId: 'u1', tenantId: 't1', role: 'viewer' as const, isDefault: true },
    ];
    const tenantRows = [{ id: 't1', slug: 'acme', enabledModules: [] }];
    const result = buildAppMetadata(memberships, tenantRows, false);
    expect(result?.is_super_admin).toBe(false);
  });
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm test -- tests/core/auth/sync-metadata.test.ts`
Expected: 3 new tests FAIL (buildAppMetadata doesn't accept 3rd arg yet)

---

### Task 3: Update `buildAppMetadata` and `syncUserAppMetadata`

**Files:**
- Modify: `src/core/auth/sync-metadata.ts`

- [ ] **Step 7: Add `superAdmins` import**

Change line 2 from:
```typescript
import { userTenants, tenants } from '@/core/db/schema';
```
to:
```typescript
import { userTenants, tenants, superAdmins } from '@/core/db/schema';
```

- [ ] **Step 8: Update `buildAppMetadata` to accept `isSuperAdmin` parameter**

Replace the function (lines 24–54) with:

```typescript
export function buildAppMetadata(
  memberships: MembershipRow[],
  tenantRows: TenantRow[],
  isSuperAdmin: boolean = false,
) {
  if (memberships.length === 0) {
    if (isSuperAdmin) {
      return {
        tenant_id: '',
        tenant_slug: '',
        role: 'viewer' as Role,
        enabled_modules: [] as string[],
        is_super_admin: true,
        memberships: [],
      };
    }
    return null;
  }

  const tenantMap = new Map(tenantRows.map((t) => [t.id, t]));

  const primary =
    memberships.find((m) => m.isDefault) ?? memberships[0];
  const primaryTenant = tenantMap.get(primary.tenantId);

  if (!primaryTenant) return null;

  const enabledModules = Array.isArray(primaryTenant.enabledModules)
    ? (primaryTenant.enabledModules as string[])
    : [];

  return {
    tenant_id: primary.tenantId,
    tenant_slug: primaryTenant.slug,
    role: primary.role,
    enabled_modules: enabledModules,
    is_super_admin: isSuperAdmin,
    memberships: memberships.map((m) => ({
      tenantId: m.tenantId,
      slug: tenantMap.get(m.tenantId)?.slug ?? '',
      role: m.role,
    })),
  };
}
```

- [ ] **Step 9: Update `syncUserAppMetadata` to query super_admins and pass flag**

Replace the function (lines 64–97) with:

```typescript
export async function syncUserAppMetadata(userId: string): Promise<void> {
  // Check super-admin status (single indexed lookup on user_id unique column)
  const adminRows = await db
    .select({ userId: superAdmins.userId })
    .from(superAdmins)
    .where(eq(superAdmins.userId, userId));
  const isSuperAdmin = adminRows.length > 0;

  // Fetch all tenant memberships for this user
  const memberships = await db
    .select({
      userId: userTenants.userId,
      tenantId: userTenants.tenantId,
      role: userTenants.role,
      isDefault: userTenants.isDefault,
    })
    .from(userTenants)
    .where(eq(userTenants.userId, userId));

  // Only early-return if not a super-admin AND has no memberships
  if (memberships.length === 0 && !isSuperAdmin) return;

  // Fetch tenant details (skip query if no memberships)
  let tenantRows: TenantRow[] = [];
  if (memberships.length > 0) {
    const tenantIds = memberships.map((m) => m.tenantId);
    tenantRows = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        enabledModules: tenants.enabledModules,
      })
      .from(tenants)
      .where(inArray(tenants.id, tenantIds));
  }

  const appMetadata = buildAppMetadata(memberships, tenantRows, isSuperAdmin);
  if (!appMetadata) return;

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  });
}
```

- [ ] **Step 10: Update existing test to include `is_super_admin` in expected output**

The "single tenant membership" test at line 29 uses `toEqual()` (strict deep equality). It will fail because the returned object now includes `is_super_admin: false`. Add this field to the expected object:

```typescript
    expect(result).toEqual({
      tenant_id: 'tenant-1',
      tenant_slug: 'acme',
      role: 'admin',
      enabled_modules: ['inventory', 'purchases'],
      is_super_admin: false,
      memberships: [
        { tenantId: 'tenant-1', slug: 'acme', role: 'admin' },
      ],
    });
```

Note: The other existing tests use field-level assertions (`result?.tenant_id`) so they don't need updating.

- [ ] **Step 11: Run tests to verify they all pass**

Run: `pnpm test -- tests/core/auth/sync-metadata.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 12: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 13: Commit**

```bash
git add src/core/auth/types.ts src/core/auth/sync-metadata.ts tests/core/auth/sync-metadata.test.ts
git commit -m "feat(auth): add is_super_admin flag to JWT app_metadata

Query super_admins table during login sync. Super-admins with zero
tenant memberships now get minimal app_metadata with is_super_admin: true
instead of being silently skipped."
```

---

## Chunk 2: Routing Layer (sync route + login page + middleware)

### Task 4: Return `is_super_admin` from sync API

**Files:**
- Modify: `src/app/api/auth/sync/route.ts:35-41`

- [ ] **Step 14: Update sync route to return `is_super_admin`**

Replace lines 35-41 with:

```typescript
  try {
    await syncUserAppMetadata(session.user.id);
    const { data: refreshData } = await supabase.auth.refreshSession();
    const appMeta = refreshData.session?.user?.app_metadata ?? {};
    const tenantSlug = appMeta.tenant_slug ?? null;
    const isSuperAdmin = appMeta.is_super_admin === true;

    return NextResponse.json({ tenant_slug: tenantSlug, is_super_admin: isSuperAdmin });
  } catch (e) {
```

---

### Task 5: Update login page redirect logic

**Files:**
- Modify: `src/app/(auth)/login/page.tsx:48-52`

- [ ] **Step 15: Add super-admin redirect case**

Replace lines 48-52 with:

```typescript
      if (body.tenant_slug) {
        router.push(`/t/${body.tenant_slug}`);
      } else if (body.is_super_admin) {
        router.push('/admin');
      } else {
        router.push('/no-tenant');
      }
```

---

### Task 6: Update middleware for super-admin routing

**Files:**
- Modify: `src/middleware.ts:61-113`

- [ ] **Step 16: Add super-admin bypass for admin routes and smart redirect**

After `const { app_metadata } = jwt;` (line 61), replace lines 62–113 with:

```typescript
  const isSuperAdmin = app_metadata.is_super_admin === true;

  // Super-admins accessing /admin routes: allow without tenant context
  if (isSuperAdmin && (pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin'))) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', jwt.sub);
    requestHeaders.set('x-user-email', jwt.email);

    const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie);
    });
    return finalResponse;
  }

  // Determine which tenant context to use for this request.
  // Default to the primary tenant from app_metadata.
  let tenantId = app_metadata.tenant_id;
  let tenantSlug = app_metadata.tenant_slug;
  let role = app_metadata.role;
  let enabledModules = app_metadata.enabled_modules ?? [];

  // If the URL contains a [tenantSlug] segment that differs from the primary
  // tenant, check the memberships array for a matching entry and switch context.
  const urlSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  if (urlSlugMatch) {
    const urlSlug = urlSlugMatch[1];
    if (urlSlug !== tenantSlug) {
      const membership = (app_metadata.memberships ?? []).find(
        (m) => m.slug === urlSlug,
      );
      if (membership) {
        tenantId = membership.tenantId;
        tenantSlug = membership.slug;
        role = membership.role;
        // Memberships do not carry module lists; fall back to an empty array.
        enabledModules = [];
      }
    }
  }

  // No tenant at all → super-admins go to /admin, others to /no-tenant.
  if (!tenantId) {
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/no-tenant', request.url));
  }

  // Inject tenant + user context as request headers so API routes can read
  // them via withTenantContext() without touching the database.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);
  requestHeaders.set('x-tenant-slug', tenantSlug);
  requestHeaders.set('x-tenant-role', role);
  requestHeaders.set('x-tenant-modules', JSON.stringify(enabledModules));
  requestHeaders.set('x-user-id', jwt.sub);
  requestHeaders.set('x-user-email', jwt.email);

  // Build the final response, propagating Supabase cookie refreshes and our
  // new request headers.
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Copy any Supabase-set cookies from the session-refresh response.
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
```

- [ ] **Step 17: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 18: Run all tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 19: Commit**

```bash
git add src/app/api/auth/sync/route.ts src/app/\(auth\)/login/page.tsx src/middleware.ts
git commit -m "feat(auth): route super-admins to /admin panel on login

Sync route returns is_super_admin flag. Login page redirects super-admins
to /admin. Middleware allows super-admins on /admin routes without tenant
context, and redirects tenant-less super-admins to /admin instead of
/no-tenant."
```

---

## Verification

### Automated
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `pnpm test -- tests/core/auth/sync-metadata.test.ts` — all unit tests pass
- [ ] `pnpm test` — full test suite passes
- [ ] `pnpm build` — production build succeeds

### Manual Testing (with dev server running)
1. **Super-admin with no tenant memberships:**
   - Log in with super-admin credentials → should redirect to `/admin`
   - Navigate to `/admin/tenants` → should load tenant list
   - Navigate to `/admin/access-requests` → should load requests
2. **Super-admin with tenant memberships:**
   - Log in → should redirect to `/t/{slug}` (primary tenant)
   - Navigate to `/admin` directly → should load admin panel
3. **Regular user with no tenant:**
   - Log in → should redirect to `/no-tenant` (unchanged behavior)
4. **Regular user with tenant:**
   - Log in → should redirect to `/t/{slug}` (unchanged behavior)
5. **OAuth login as super-admin:**
   - Sign in with Google → should end up at `/admin`

### Edge Cases
| Scenario | Expected |
|----------|----------|
| Super-admin with empty `tenant_id: ''` in JWT | Middleware treats empty string as falsy via `!tenantId` → redirects to `/admin` |
| Stale JWT without `is_super_admin` field | `undefined === true` is `false` → normal flow, fixed on next login |
| Non-admin hitting `/admin` URL | Falls through to tenant check → admin layout does DB check → redirects away |
