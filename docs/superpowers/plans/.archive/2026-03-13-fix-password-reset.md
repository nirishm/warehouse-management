# Fix Password Reset Flow — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken password reset link so users (including superadmin) can reset their password successfully.

**Architecture:** Two targeted bug fixes — (1) the auth callback route drops session cookies when redirecting, causing the set-password page to have no session, and (2) the login page silently swallows callback error redirects. Plus a manual Supabase config verification.

**Tech Stack:** Next.js 16, Supabase SSR (`@supabase/ssr`), `next/navigation`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/app/auth/callback/route.ts` | Fix cookie propagation on redirect after code exchange |
| Modify | `src/app/(auth)/login/page.tsx` | Read URL error params and display user-friendly messages |
| Reference | `src/lib/supabase/middleware.ts` | Existing correct cookie-on-response pattern to mirror |
| Reference | `src/app/(auth)/set-password/page.tsx` | Downstream page — no changes needed, verify it works |

---

## Chunk 1: Fix Auth Callback Cookie Propagation

### Task 1: Fix callback route to propagate cookies on redirect

**Files:**
- Modify: `src/app/auth/callback/route.ts`
- Reference: `src/lib/supabase/middleware.ts` (correct pattern at lines 18-28)

**Bug:** `cookieStore.set()` writes to the route handler's internal cookie jar, but `NextResponse.redirect()` creates a **new** Response object that doesn't inherit those cookies. The session established by `exchangeCodeForSession()` is silently lost.

**Fix pattern:** Capture cookies from `setAll` into a local array, then explicitly copy them onto the `NextResponse.redirect()` before returning — the same pattern used in `src/lib/supabase/middleware.ts`.

- [ ] **Step 1: Replace the full callback route with cookie-propagating version**

Replace the entire content of `src/app/auth/callback/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    // Capture cookies that Supabase sets during code exchange so we can
    // copy them onto the redirect response (NextResponse.redirect creates
    // a new Response that does NOT inherit cookieStore.set() calls).
    let responseCookies: { name: string; value: string; options: any }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            responseCookies = cookiesToSet;
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(new URL(next, request.url));
      // Explicitly set session cookies on the redirect response
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with no type errors in `src/app/auth/callback/route.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "fix: propagate session cookies on redirect in auth callback

NextResponse.redirect() creates a new Response that doesn't inherit
cookies set via cookieStore.set(). Capture cookies from Supabase's
setAll and explicitly copy them onto the redirect response."
```

---

## Chunk 2: Show Callback Errors on Login Page

### Task 2: Display error messages from auth callback redirects

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Bug:** When the callback fails, it redirects to `/login?error=auth_callback_failed`, but the login page never reads the `error` query parameter. Users see the login form with zero feedback.

**Note:** `useSearchParams()` in Next.js 16 requires a `<Suspense>` boundary or the build will fail. We'll extract the search-params logic into the existing component but wrap the export.

- [ ] **Step 1: Add useSearchParams, useEffect, and Suspense wrapper**

In `src/app/(auth)/login/page.tsx`, make these changes:

1. Update imports:
```typescript
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
```
(Remove the existing standalone `import { useRouter } from 'next/navigation';`)

2. Rename the current `LoginPage` function to `LoginPageInner`:
```typescript
function LoginPageInner() {
  // ... all existing code stays the same
```

3. Inside `LoginPageInner()`, after `const supabase = createClient();`, add:
```typescript
const searchParams = useSearchParams();

useEffect(() => {
  const urlError = searchParams.get('error');
  if (urlError === 'auth_callback_failed') {
    setError('Password reset link has expired or is invalid. Please request a new one.');
  }
}, [searchParams]);
```

4. Add a new default export that wraps `LoginPageInner` in Suspense:
```typescript
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with no errors. The Suspense boundary prevents the `useSearchParams` bail-out warning.

- [ ] **Step 3: Manually verify error display**

Start dev server: `pnpm dev`
Visit: `http://localhost:3000/login?error=auth_callback_failed`
Expected: Red error text "Password reset link has expired or is invalid. Please request a new one." appears below the password field on the login form.

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "fix: display auth callback error on login page

Read the error query parameter from URL and show a user-friendly
message when redirected from a failed auth callback."
```

---

## Chunk 3: Supabase Redirect URL Configuration (via CLI)

### Task 3: Update Supabase auth redirect URLs using CLI

**Files:**
- Modify: `supabase/config.toml` (lines 149-152, auth section)

The `additional_redirect_urls` currently only has `["https://127.0.0.1:3000"]` — it's missing the production callback URL. Without it, Supabase refuses to redirect users after clicking the email reset link.

**Important:** `site_url` in `config.toml` stays as `http://127.0.0.1:3000` for local dev. We only update `additional_redirect_urls`. The production `site_url` is set separately in the Supabase Dashboard (or was already configured during project setup).

- [ ] **Step 1: Link the Supabase project**

```bash
SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_SERVICE_API_KEY .env.local | cut -d= -f2) \
  supabase link --project-ref elmfdrflziuicgnmmcig
```

Expected: "Finished supabase link."

- [ ] **Step 2: Pull current remote config to see what's already set**

```bash
SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_SERVICE_API_KEY .env.local | cut -d= -f2) \
  supabase config pull --project-ref elmfdrflziuicgnmmcig
```

Review the pulled `[auth]` section. Check if `additional_redirect_urls` already includes the production callback URL. If it does, skip Steps 3-5.

- [ ] **Step 3: Update `supabase/config.toml` auth redirect URLs**

In the `[auth]` section (~line 149-152), keep `site_url` unchanged and update only the redirect URLs:

```toml
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "https://wareos.in/auth/callback",
  "http://localhost:3000/auth/callback",
]
```

- [ ] **Step 4: Push the config to the remote project**

```bash
SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_SERVICE_API_KEY .env.local | cut -d= -f2) \
  supabase config push --project-ref elmfdrflziuicgnmmcig
```

Expected: Shows a diff of changes. Review and confirm. Only the `additional_redirect_urls` should change.

- [ ] **Step 5: Commit config.toml**

```bash
git add supabase/config.toml
git commit -m "fix: add production redirect URLs to Supabase auth config

Add wareos.in and localhost callback URLs to additional_redirect_urls
so password reset email links are accepted by Supabase."
```

---

## Verification

After all tasks are complete:

1. **Build check:** `pnpm build` passes clean
2. **Happy path:** Trigger "Forgot password?" → receive email → click link → land on `/set-password` with valid session → enter new password → `updateUser` succeeds → redirected to `/login`
3. **Error path:** Visit `/auth/callback?code=invalid&next=/set-password` → redirected to `/login` with error message displayed
4. **Direct error URL:** Visit `/login?error=auth_callback_failed` → error banner visible
