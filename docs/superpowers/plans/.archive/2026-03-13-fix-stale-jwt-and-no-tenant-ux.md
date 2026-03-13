# Fix Stale JWT After Metadata Sync + No-Tenant Page UX

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix login still landing on `/no-tenant` despite `app_metadata` being synced, and add logout/retry buttons to the `/no-tenant` page so users aren't stuck.

**Architecture:** The auth callback calls `syncUserAppMetadata()` which writes `app_metadata` to the Supabase Auth user record via Admin API. But the JWT minted by `exchangeCodeForSession()` was issued *before* the sync — it's stale. We add `refreshSession()` after sync to re-mint the JWT with fresh `app_metadata`. Separately, the `/no-tenant` page needs a "Sign Out" button (client component) and a "Try Again" link.

**Tech Stack:** Next.js, Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`), Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/auth/callback/route.ts` | **Modify** (lines 44-48) | Add `refreshSession()` after metadata sync |
| `src/app/(auth)/no-tenant/page.tsx` | **Rewrite** | Server component with email display + client `NoTenantActions` |
| `src/app/(auth)/no-tenant/no-tenant-actions.tsx` | **Create** | Client component: "Sign Out" button + "Try Again" link |

**Existing files referenced (read-only):**
- `src/lib/supabase/client.ts` — `createClient()` browser client (used for `signOut()`)
- `src/components/layout/header.tsx` — existing logout pattern to follow

---

## Chunk 1: Fix Stale JWT

### Task 1: Add `refreshSession()` after metadata sync in callback

**Why:** `exchangeCodeForSession(code)` mints a JWT before `syncUserAppMetadata()` runs. That JWT has empty `app_metadata`. We need to call `refreshSession()` to force Supabase to mint a new JWT that includes the freshly-written `app_metadata`. The `setAll` cookie handler automatically captures the new cookies into `responseCookies`.

**Files:**
- Modify: `src/app/auth/callback/route.ts` (lines 44-48)

- [ ] **Step 1: Add `refreshSession()` call after sync**

Replace lines 44-48 of `src/app/auth/callback/route.ts`:

```typescript
        try {
          await syncUserAppMetadata(data.session.user.id);
        } catch (e) {
          console.error('Failed to sync app_metadata on login:', e);
        }
```

With:

```typescript
        try {
          await syncUserAppMetadata(data.session.user.id);
          // Force JWT re-mint so the redirect carries fresh app_metadata.
          // refreshSession() triggers setAll() internally, which overwrites
          // responseCookies with the new JWT containing updated claims.
          await supabase.auth.refreshSession();
        } catch (e) {
          console.error('Failed to sync app_metadata on login:', e);
        }
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "fix(auth): refresh session after metadata sync to get fresh JWT"
```

---

## Chunk 2: No-Tenant Page UX

### Task 2: Add logout and retry buttons to `/no-tenant` page

**Why:** Users who land on `/no-tenant` have no way to sign out or retry. If their access was just granted, they need a "Try Again" link. If they need to switch accounts, they need a "Sign Out" button.

**Files:**
- Create: `src/app/(auth)/no-tenant/no-tenant-actions.tsx`
- Modify: `src/app/(auth)/no-tenant/page.tsx`

- [ ] **Step 1: Create client component for actions**

Create `src/app/(auth)/no-tenant/no-tenant-actions.tsx`:

```typescript
'use client';

import { useState } from 'react';
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
      <a
        href="/"
        className="inline-flex h-[48px] items-center justify-center rounded-full text-[14px] font-bold text-white"
        style={{ background: 'var(--accent-color)' }}
      >
        Try Again
      </a>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-[48px] items-center justify-center rounded-full text-[14px] font-bold ring-1 ring-inset"
        style={{
          color: 'var(--text-muted)',
          background: 'var(--bg-base)',
          ringColor: 'var(--border-default)',
        }}
      >
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update the no-tenant page to include actions**

Replace `src/app/(auth)/no-tenant/page.tsx` with:

```typescript
import { headers } from 'next/headers';
import { NoTenantActions } from './no-tenant-actions';

export const dynamic = 'force-dynamic';

export default async function NoTenantPage() {
  const headersList = await headers();
  const userEmail = headersList.get('x-user-email') ?? '';

  return (
    <div className="text-center">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'var(--accent-tint)' }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent-color)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold mb-2">
        Access Pending
      </h2>
      <p style={{ color: 'var(--text-muted)' }} className="text-[14px] mb-4">
        Your account ({userEmail}) has been created, but you don&apos;t have access to any
        workspace yet.
      </p>
      <p style={{ color: 'var(--text-dim)' }} className="text-[13px]">
        An administrator will review your request and grant access shortly.
      </p>
      <NoTenantActions />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/no-tenant/no-tenant-actions.tsx src/app/\(auth\)/no-tenant/page.tsx
git commit -m "fix(auth): add sign-out and try-again buttons to no-tenant page"
```

---

## Verification

- [ ] `pnpm build` — clean, no type errors
- [ ] Login via Google OAuth as nirish.m2@gmail.com → redirected to `/t/shanti-elite/` (NOT `/no-tenant`)
- [ ] If manually navigating to `/no-tenant`, "Try Again" links to `/` and "Sign Out" signs out to `/login`
