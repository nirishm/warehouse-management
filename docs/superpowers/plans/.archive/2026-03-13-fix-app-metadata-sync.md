# Fix app_metadata Sync — "Access Pending" Bug

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where approved users see "Access Pending" because their JWT `app_metadata` is never populated with tenant info.

**Architecture:** Create a single `syncUserAppMetadata()` helper that reads `user_tenants` + `tenants` from the DB and writes `app_metadata` via the Supabase Admin API. Call it from two places: (1) access request approval, (2) auth callback on login. Also fix mismatched role values in the DB.

**Tech Stack:** Next.js, Supabase Auth Admin API, Drizzle ORM, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/core/auth/sync-metadata.ts` | **Create** | `syncUserAppMetadata(userId)` — queries DB, writes `app_metadata` |
| `src/app/api/v1/admin/access-requests/route.ts` | **Modify** (lines 46-52) | Call sync after inserting `user_tenants` |
| `src/app/auth/callback/route.ts` | **Modify** (lines 36-44) | Call sync after `exchangeCodeForSession` |
| `tests/core/auth/sync-metadata.test.ts` | **Create** | Unit tests for metadata builder |

**Existing files referenced (read-only):**
- `src/lib/supabase/admin.ts` — `createAdminClient()` singleton
- `src/core/db/drizzle.ts` — `db` instance
- `src/core/db/schema/public.ts` — `userTenants`, `tenants` tables
- `src/core/auth/types.ts` — `Role`, `AppJwtPayload` types

---

## Chunk 1: Core Implementation

### Task 1: Fix role data in DB (one-time)

**Why:** The DB has `tenant_admin` and `employee` which don't match the schema enum (`owner`, `admin`, `manager`, `operator`, `viewer`). Everything downstream will break on these values.

- [ ] **Step 1: Update `tenant_admin` → `admin`**

Run via Supabase REST API:
```bash
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2)
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)

curl -s -X PATCH "${SUPABASE_URL}/rest/v1/user_tenants?role=eq.tenant_admin" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"role": "admin"}'
```

Expected: Returns array of updated rows (4 records).

- [ ] **Step 2: Update `employee` → `operator`**

```bash
curl -s -X PATCH "${SUPABASE_URL}/rest/v1/user_tenants?role=eq.employee" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"role": "operator"}'
```

Expected: Returns array of updated rows (3 records).

- [ ] **Step 3: Verify no invalid roles remain**

```bash
curl -s "${SUPABASE_URL}/rest/v1/user_tenants?select=role&role=not.in.(owner,admin,manager,operator,viewer)" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}"
```

Expected: `[]` (empty array).

---

### Task 2: Create `syncUserAppMetadata()` helper

**Files:**
- Create: `src/core/auth/sync-metadata.ts`
- Test: `tests/core/auth/sync-metadata.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/core/auth/sync-metadata.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAppMetadata } from '@/core/auth/sync-metadata';

describe('buildAppMetadata', () => {
  it('returns null when user has no tenant memberships', () => {
    const result = buildAppMetadata([], []);
    expect(result).toBeNull();
  });

  it('builds correct metadata for single tenant membership', () => {
    const memberships = [
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'admin' as const,
        isDefault: true,
      },
    ];
    const tenants = [
      {
        id: 'tenant-1',
        slug: 'acme',
        enabledModules: ['inventory', 'purchases'],
      },
    ];

    const result = buildAppMetadata(memberships, tenants);

    expect(result).toEqual({
      tenant_id: 'tenant-1',
      tenant_slug: 'acme',
      role: 'admin',
      enabled_modules: ['inventory', 'purchases'],
      memberships: [
        { tenantId: 'tenant-1', slug: 'acme', role: 'admin' },
      ],
    });
  });

  it('uses first default membership as primary tenant', () => {
    const memberships = [
      { userId: 'user-1', tenantId: 't-1', role: 'viewer' as const, isDefault: false },
      { userId: 'user-1', tenantId: 't-2', role: 'admin' as const, isDefault: true },
    ];
    const tenants = [
      { id: 't-1', slug: 'org-a', enabledModules: ['inventory'] },
      { id: 't-2', slug: 'org-b', enabledModules: ['inventory', 'sales'] },
    ];

    const result = buildAppMetadata(memberships, tenants);

    expect(result?.tenant_id).toBe('t-2');
    expect(result?.tenant_slug).toBe('org-b');
    expect(result?.role).toBe('admin');
    expect(result?.memberships).toHaveLength(2);
  });

  it('falls back to first membership if none is default', () => {
    const memberships = [
      { userId: 'user-1', tenantId: 't-1', role: 'operator' as const, isDefault: false },
    ];
    const tenants = [
      { id: 't-1', slug: 'org-a', enabledModules: null },
    ];

    const result = buildAppMetadata(memberships, tenants);

    expect(result?.tenant_id).toBe('t-1');
    expect(result?.enabled_modules).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/core/auth/sync-metadata.test.ts`
Expected: FAIL — module `@/core/auth/sync-metadata` not found.

- [ ] **Step 3: Write the implementation**

Create `src/core/auth/sync-metadata.ts`:

```typescript
import { db } from '@/core/db/drizzle';
import { userTenants, tenants } from '@/core/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq, inArray } from 'drizzle-orm';
import type { Role } from './types';

interface MembershipRow {
  userId: string;
  tenantId: string;
  role: Role;
  isDefault: boolean;
}

interface TenantRow {
  id: string;
  slug: string;
  enabledModules: unknown;
}

/**
 * Pure function: builds the app_metadata object from DB rows.
 * Exported separately for unit testing without DB/Supabase dependencies.
 */
export function buildAppMetadata(
  memberships: MembershipRow[],
  tenantRows: TenantRow[],
) {
  if (memberships.length === 0) return null;

  const tenantMap = new Map(tenantRows.map((t) => [t.id, t]));

  // Primary tenant: first default, or first membership
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
    memberships: memberships.map((m) => ({
      tenantId: m.tenantId,
      slug: tenantMap.get(m.tenantId)?.slug ?? '',
      role: m.role,
    })),
  };
}

/**
 * Reads user_tenants + tenants from DB and updates the user's
 * Supabase Auth app_metadata so the JWT reflects current tenant access.
 *
 * Call this:
 * 1. After approving an access request
 * 2. On every login (auth callback) to catch stale metadata
 */
export async function syncUserAppMetadata(userId: string): Promise<void> {
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

  if (memberships.length === 0) return;

  // Fetch tenant details for all memberships
  const tenantIds = memberships.map((m) => m.tenantId);
  const tenantRows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      enabledModules: tenants.enabledModules,
    })
    .from(tenants)
    .where(inArray(tenants.id, tenantIds));

  const appMetadata = buildAppMetadata(memberships, tenantRows);
  if (!appMetadata) return;

  // Update Supabase Auth user's app_metadata
  const admin = createAdminClient();
  await admin.auth.admin.updateUser(userId, {
    app_metadata: appMetadata,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/core/auth/sync-metadata.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/auth/sync-metadata.ts tests/core/auth/sync-metadata.test.ts
git commit -m "feat(auth): add syncUserAppMetadata helper to sync JWT app_metadata from DB"
```

---

### Task 3: Call sync after access request approval

**Files:**
- Modify: `src/app/api/v1/admin/access-requests/route.ts` (lines 1-4 imports, lines 46-58 approval block)

- [ ] **Step 1: Add import and sync call**

Add to imports (after existing imports, line 7):
```typescript
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';
```

After the `user_tenants` insert (line 52) and before the `access_requests` update (line 55), add:
```typescript
    // Sync app_metadata so the user's JWT reflects their new tenant access
    await syncUserAppMetadata(ar.userId);
```

The approval block should now read:
```typescript
    // Create user_tenants membership
    await db.insert(userTenants).values({
      userId: ar.userId,
      tenantId: parsed.tenantId,
      role: parsed.role ?? 'viewer',
      isDefault: true,
    });

    // Sync app_metadata so the user's JWT reflects their new tenant access
    await syncUserAppMetadata(ar.userId);

    // Update request status
    await db
      .update(accessRequests)
      .set({ status: 'approved', reviewedBy: ctx.userId, reviewedAt: new Date() })
      .where(eq(accessRequests.id, parsed.requestId));
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: No type errors, clean build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/admin/access-requests/route.ts
git commit -m "fix(auth): sync app_metadata after access request approval"
```

---

### Task 4: Call sync on login (auth callback)

**Files:**
- Modify: `src/app/auth/callback/route.ts` (lines 1-3 imports, lines 36-44 success block)

- [ ] **Step 1: Add import and sync call**

Add to imports (after line 3):
```typescript
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';
```

Replace line 36 and the success block (lines 36-44) with:
```typescript
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sync app_metadata from DB on every login — catches stale JWTs,
      // role changes, and manually-added user_tenants records.
      // Wrapped in try/catch so sync failure doesn't block login.
      if (data.session?.user?.id) {
        try {
          await syncUserAppMetadata(data.session.user.id);
        } catch (e) {
          console.error('Failed to sync app_metadata on login:', e);
        }
      }

      const response = NextResponse.redirect(new URL(next, request.url));
      // Explicitly set session cookies on the redirect response
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: No type errors, clean build.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "fix(auth): sync app_metadata on every login to catch stale JWTs"
```

---

## Chunk 2: Verification

### Task 5: End-to-end verification

- [ ] **Step 1: Verify DB roles are fixed**

```bash
curl -s "${SUPABASE_URL}/rest/v1/user_tenants?select=role,user_id" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}"
```

Expected: All roles are one of `owner`, `admin`, `manager`, `operator`, `viewer`.

- [ ] **Step 2: Start dev server and test login**

Run: `pnpm dev`

1. Open `http://localhost:3000/login`
2. Sign in as nirish.m2@gmail.com (Google OAuth)
3. Expected: Redirected to `/t/shanti-elite/` dashboard (NOT `/no-tenant`)

- [ ] **Step 3: Verify app_metadata was written**

```bash
curl -s "${SUPABASE_URL}/auth/v1/admin/users/f154fc1b-0197-4c5d-be97-fd85ea8911eb" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | python3 -c "
import sys, json
u = json.load(sys.stdin)
meta = u.get('app_metadata', {})
print('tenant_id:', meta.get('tenant_id'))
print('tenant_slug:', meta.get('tenant_slug'))
print('role:', meta.get('role'))
print('memberships:', meta.get('memberships'))
"
```

Expected:
```
tenant_id: cecf6060-9f46-4a27-ba9f-1702d117fe86
tenant_slug: shanti-elite
role: admin
memberships: [{'tenantId': 'cecf6060-...', 'slug': 'shanti-elite', 'role': 'admin'}]
```

- [ ] **Step 4: Run unit tests**

Run: `pnpm vitest run tests/core/auth/sync-metadata.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full build**

Run: `pnpm build`
Expected: Clean build, no errors.
