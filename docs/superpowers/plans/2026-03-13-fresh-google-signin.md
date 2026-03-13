# Fresh Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Google OAuth callback with a clean two-step flow that mirrors how email/password login already works, and ensure invited users can sign in with Google or email interchangeably.

**Architecture:** The current callback tries to call `refreshSession()` server-side immediately after `exchangeCodeForSession()`, but `cookieStore.getAll()` in a Next.js Route Handler only returns *incoming* request cookies — so `refreshSession()` finds no session, fails silently, and the JWT never gets `app_metadata`. The fix is to have the callback only exchange the code and set session cookies, then redirect to a new `/auth/post-oauth` page that calls the already-existing `POST /api/auth/sync` endpoint client-side — exactly mirroring the email/password login flow. Password reset and email confirmation flows are unchanged (they pass `?next=/set-password` and the callback forwards them there directly).

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` v0.9, Supabase Auth PKCE, Supabase Management API, TypeScript strict

---

## Context

### Root cause

```
Browser → Google → /auth/callback?code=...
  └─ exchangeCodeForSession()     ← sets session cookies in Set-Cookie headers
  └─ cookieStore.getAll()         ← returns ONLY incoming request cookies (bug!)
  └─ refreshSession()             ← finds no session → fails silently
  └─ JWT has no app_metadata      ← syncUserAppMetadata result is lost
  └─ middleware: no tenant_id     ← redirects to /login
```

### Target flow

```
Google OAuth
  Browser → /auth/callback → exchangeCodeForSession → redirect /auth/post-oauth (with cookies)
  /auth/post-oauth → POST /api/auth/sync → { tenant_slug } → router.replace(/t/{slug})

Password reset (unchanged)
  /auth/callback?code=...&next=/set-password → exchangeCodeForSession → redirect /set-password

Email/password login (unchanged)
  signInWithPassword → POST /api/auth/sync → { tenant_slug } → router.push(/t/{slug})

Invited user signs in with Google
  Same as Google OAuth above.
  Supabase auto-links the Google identity to the invited email account (same email, verified).
  /api/auth/sync finds the existing user_tenants row → tenant_slug returned → routes correctly.
```

### Files that will NOT change

- `src/app/(auth)/login/page.tsx` — Google button handler is correct, no changes needed
- `src/app/api/auth/sync/route.ts` — reused as-is
- `src/core/auth/sync-metadata.ts` — reused as-is
- `src/lib/supabase/` — all client files unchanged

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/config.toml` | Modify | Replace `**` glob with explicit redirect URLs for local dev |
| `src/app/auth/callback/route.ts` | Rewrite | Only: exchange code → set cookies → redirect |
| `src/app/(auth)/post-oauth/page.tsx` | Create | Client: call `/api/auth/sync`, navigate to dashboard |
| `src/middleware.ts` | Modify | Add `/auth/post-oauth` to `PUBLIC_ROUTES` |

---

## Chunk 1: Config + Callback Rewrite

### Task 1: Fix Supabase redirect URL config

**Files:**
- Modify: `supabase/config.toml` (line 152)

**Background:** The current `additional_redirect_urls = ["https://wareos.in/**", ...]` uses a `**` glob that may not behave as expected in all Supabase GoTrue versions. Explicit URLs are safer and easier to reason about.

- [ ] **Step 1: Update `supabase/config.toml`**

  Replace line 152:
  ```toml
  # Before
  additional_redirect_urls = ["https://wareos.in/**", "https://wareos.in/reset-password"]

  # After
  additional_redirect_urls = [
    "https://wareos.in/auth/callback",
    "https://wareos.in/set-password",
    "https://wareos.in/reset-password",
  ]
  ```

- [ ] **Step 2: Update production Supabase auth config via Management API**

  ```bash
  curl -s -X PATCH \
    "https://api.supabase.com/v1/projects/elmfdrflziuicgnmmcig/config/auth" \
    -H "Authorization: Bearer sbp_85b4d8fdd4ee027418cb1f21f6ef96ec6f5f8ae3" \
    -H "Content-Type: application/json" \
    -d '{"uri_allow_list": "https://wareos.in/auth/callback,https://wareos.in/set-password,https://wareos.in/reset-password"}' \
    | python3 -m json.tool | grep -E "(uri_allow|site_url)"
  ```

  Expected output contains: `"uri_allow_list": "https://wareos.in/auth/callback,https://wareos.in/set-password,https://wareos.in/reset-password"`

---

### Task 2: Rewrite `src/app/auth/callback/route.ts`

**Files:**
- Rewrite: `src/app/auth/callback/route.ts`

**Background:** The new callback has ONE job: exchange the PKCE code for a session and copy the resulting cookies onto the redirect response. It no longer calls `syncUserAppMetadata` or `refreshSession` — those happen in `/auth/post-oauth` (for OAuth) or are already handled by `/api/auth/sync` (for password login).

Cookie copy is still needed because `NextResponse.redirect()` creates a new Response that doesn't inherit cookies written to `cookieStore` during the handler. The `pendingCookies` Map tracks all cookies emitted by Supabase's `setAll()` so they can be replayed onto the redirect.

For password reset / email confirmation, the callback passes `?next=` through to the destination directly (e.g. `/set-password`), skipping `/auth/post-oauth`.

- [ ] **Step 1: Replace the entire file with the clean implementation**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createServerClient } from '@supabase/ssr';
  import { cookies } from 'next/headers';

  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawNext = searchParams.get('next') ?? '';
    // Only allow relative paths to prevent open-redirect attacks
    const next = rawNext.startsWith('/') ? rawNext : '';

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
    }

    const cookieStore = await cookies();

    // Collect cookies emitted by Supabase so we can copy them onto the redirect
    // response. NextResponse.redirect() creates a new Response that does not
    // inherit cookies written to cookieStore, so we must replay them manually.
    // Use a Map keyed by cookie name so later setAll() calls overwrite earlier
    // values for the same cookie rather than duplicating them.
    const pendingCookies = new Map<
      string,
      { name: string; value: string; options: Record<string, unknown> }
    >();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => pendingCookies.set(c.name, c));
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', {
        code: error.code,
        message: error.message,
      });
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }

    // For password reset and email confirmation (?next=/set-password etc.)
    // go directly to the destination. For all other flows (OAuth, invite
    // acceptance) go to /auth/post-oauth which handles metadata sync.
    const destination = next || '/auth/post-oauth';

    const response = NextResponse.redirect(new URL(destination, request.url));
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(
        name,
        value,
        options as Parameters<typeof response.cookies.set>[2]
      );
    });

    return response;
  }
  ```

- [ ] **Step 2: Typecheck the file**

  ```bash
  cd "/Users/nirish/Library/CloudStorage/GoogleDrive-nirish.m2@gmail.com/My Drive/_Coding/warehouse-management"
  pnpm tsc --noEmit 2>&1 | grep "auth/callback"
  ```

  Expected: no output (zero errors for this file)

- [ ] **Step 3: Commit**

  ```bash
  git add supabase/config.toml src/app/auth/callback/route.ts
  git commit -m "fix(auth): simplify OAuth callback — exchange only, no server-side refresh"
  ```

---

## Chunk 2: Post-OAuth Page + Middleware

### Task 3: Create `src/app/(auth)/post-oauth/page.tsx`

**Files:**
- Create: `src/app/(auth)/post-oauth/page.tsx`

**Background:** This page is the client-side equivalent of what the login page does after `signInWithPassword`. It calls `POST /api/auth/sync` which:
1. Reads the session from cookies (set by the callback's `exchangeCodeForSession`)
2. Calls `syncUserAppMetadata` — writes tenant/role from DB into Supabase `app_metadata`
3. Calls `refreshSession()` — re-mints the JWT with the new `app_metadata`
4. Returns `{ tenant_slug, is_super_admin }`

The page is rendered inside the `(auth)` layout (centered white card), so it inherits the correct visual wrapper automatically. It shows a "Signing you in…" spinner while the sync runs.

- [ ] **Step 1: Create the file**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';

  export default function PostOAuthPage() {
    const router = useRouter();
    const [error, setError] = useState('');

    useEffect(() => {
      async function syncAndRedirect() {
        try {
          const res = await fetch('/api/auth/sync', { method: 'POST' });
          if (!res.ok) {
            throw new Error(`sync returned ${res.status}`);
          }
          const body = await res.json();

          if (body.tenant_slug) {
            router.replace(`/t/${body.tenant_slug}`);
          } else if (body.is_super_admin) {
            router.replace('/admin');
          } else {
            router.replace('/no-tenant');
          }
        } catch (e) {
          console.error('[post-oauth] sync failed:', e);
          setError('Sign-in failed. Please try again.');
        }
      }

      syncAndRedirect();
    }, [router]);

    if (error) {
      return (
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <a
            href="/login"
            className="text-orange-500 hover:text-orange-600 text-sm font-medium"
          >
            Back to login
          </a>
        </div>
      );
    }

    return (
      <p className="text-center text-stone-500 text-sm">
        Signing you in…
      </p>
    );
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  pnpm tsc --noEmit 2>&1 | grep "post-oauth"
  ```

  Expected: no output

---

### Task 4: Add `/auth/post-oauth` to middleware PUBLIC_ROUTES

**Files:**
- Modify: `src/middleware.ts` (lines 9–18)

**Background:** Without this, the middleware will see an unauthenticated request to `/auth/post-oauth` (the session cookies are present but `getSession()` runs before the page calls `/api/auth/sync` + `refreshSession`). Actually the cookies ARE set by the callback redirect — so `getSession()` should succeed. But the JWT `app_metadata` has no `tenant_id` yet (sync hasn't happened client-side), so middleware would redirect to `/no-tenant` before the page can call `/api/auth/sync`. Adding it to `PUBLIC_ROUTES` lets the page load and call sync freely.

- [ ] **Step 1: Add `/auth/post-oauth` to the array**

  In `src/middleware.ts`, change:
  ```typescript
  const PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/auth/callback',
    '/reset-password',
    '/set-password',
    '/no-tenant',
    '/api/inngest',
    '/api/auth/sync',
  ];
  ```

  To:
  ```typescript
  const PUBLIC_ROUTES = [
    '/login',
    '/register',
    '/auth/callback',
    '/auth/post-oauth',
    '/reset-password',
    '/set-password',
    '/no-tenant',
    '/api/inngest',
    '/api/auth/sync',
  ];
  ```

- [ ] **Step 2: Typecheck and lint**

  ```bash
  pnpm tsc --noEmit 2>&1 && echo "TS OK"
  pnpm lint 2>&1 | grep -v "offline-banner" | grep -E "(error|warning)" | head -20
  ```

  Expected: `TS OK`, no new lint errors (one pre-existing `offline-banner.tsx` warning is ignored)

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/\(auth\)/post-oauth/page.tsx src/middleware.ts
  git commit -m "feat(auth): add post-oauth page for Google OAuth metadata sync"
  ```

---

## Chunk 3: Verification

### Task 5: End-to-end verification

- [ ] **Step 1: Full typecheck**

  ```bash
  pnpm tsc --noEmit 2>&1
  ```

  Expected: no output (zero errors)

- [ ] **Step 2: Run unit tests**

  ```bash
  pnpm test 2>&1 | tail -10
  ```

  Expected: all tests pass

- [ ] **Step 3: Push to production**

  ```bash
  git push
  ```

  Then check GitHub Actions "Lint & Typecheck" passes.

- [ ] **Step 4: Live test — Google OAuth login**

  In an incognito browser, go to `https://wareos.in/login`:
  1. Click "Sign in with Google"
  2. Complete Google consent
  3. Expected: land at `/t/{tenant-slug}` dashboard (not `/login`, not `/no-tenant`)

- [ ] **Step 5: Live test — password reset still works**

  1. Click "Forgot password?" → enter email → Send Reset Link
  2. Click link in email
  3. Expected: land at `/set-password` (not `/auth/post-oauth`)

- [ ] **Step 6: Live test — email/password login still works**

  1. Sign in with email + password
  2. Expected: land at `/t/{tenant-slug}` dashboard

- [ ] **Step 7: Verify Supabase redirect URL config**

  ```bash
  curl -s "https://api.supabase.com/v1/projects/elmfdrflziuicgnmmcig/config/auth" \
    -H "Authorization: Bearer sbp_85b4d8fdd4ee027418cb1f21f6ef96ec6f5f8ae3" \
    | python3 -m json.tool | grep uri_allow_list
  ```

  Expected: `"uri_allow_list": "https://wareos.in/auth/callback,https://wareos.in/set-password,https://wareos.in/reset-password"`
