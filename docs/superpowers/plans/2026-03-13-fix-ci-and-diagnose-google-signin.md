# Fix CI Typecheck + Diagnose Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 15 TypeScript errors blocking CI and create a reproducible diagnostic path for Google OAuth.

**Architecture:** Two independent problems. CI fix is pure test-fixture surgery (3 files, no logic changes). Google Sign-In diagnosis requires live log observation before any code change — prior code-only fixes have repeatedly failed because the root cause is almost certainly a Supabase redirect URL configuration mismatch, not application code.

**Tech Stack:** TypeScript strict mode, Vitest, Supabase SSR (`@supabase/ssr`), Next.js App Router, Vercel CLI

---

## Context

**CI failures** have been blocking the "Lint & Typecheck" job across multiple commits. Two type changes were never back-ported to backend test fixtures:
1. `type: "goods" | "service" | "composite"` became **required** on `CreateItemInput`
2. `TenantContext` gained `userId: string` and `userEmail: string`

**Google Sign-In** has been broken across multiple attempts. The auth callback route (`src/app/auth/callback/route.ts`) has been rewritten several times with cookie/session fixes, but no code change has worked. The logging added to the route will now reveal the actual failure mode — stream the logs while attempting sign-in before writing any more code.

---

## Files Modified

| File | Change |
|------|--------|
| `tests/backend/role-permissions.test.ts:14-19` | Add `userId`, `userEmail` to `makeCtx` helper |
| `tests/backend/audit-trail.test.ts` — 8 lines | Add `type: 'goods'` to item creation fixtures |
| `tests/backend/soft-delete.test.ts` — 6 lines | Add `type: 'goods'` to item creation fixtures |
| `src/app/auth/callback/route.ts` | Diagnostic only — no changes needed unless logs reveal a bug |

---

## Chunk 1: Fix CI TypeScript Errors

### Task 1: Fix `role-permissions.test.ts` — missing `userId`/`userEmail`

**Modify:** `tests/backend/role-permissions.test.ts:14-19`

**Error:**
```
TS2739: Type '{ tenantId: string; tenantSlug: string; role: Role; enabledModules: never[]; }'
is missing the following properties from type 'TenantContext': userId, userEmail
```

- [ ] **Step 1: Add required fields to `makeCtx`**

  Current code at lines 13–19:
  ```typescript
  function makeCtx(role: TenantContext['role']): TenantContext {
    return {
      tenantId: '00000000-0000-0000-0000-000000000001',
      tenantSlug: 'test',
      role,
      enabledModules: [],
    };
  }
  ```

  Replace with:
  ```typescript
  function makeCtx(role: TenantContext['role']): TenantContext {
    return {
      tenantId: '00000000-0000-0000-0000-000000000001',
      tenantSlug: 'test',
      role,
      userId: '00000000-0000-0000-0000-000000000099',
      userEmail: 'test@example.com',
      enabledModules: [],
    };
  }
  ```

- [ ] **Step 2: Verify fix compiles**
  ```bash
  pnpm tsc --noEmit 2>&1 | grep role-permissions
  ```
  Expected: no output (zero errors for that file)

---

### Task 2: Fix `audit-trail.test.ts` — missing `type` on 8 item fixtures

**Modify:** `tests/backend/audit-trail.test.ts` at lines 92, 110, 128, 185, 196, 207, 219, 233

**Note:** The `createItem` function signature uses `z.infer<typeof createItemSchema>` which is the Zod OUTPUT type — `.default('goods')` makes `type` required there. The actual `pnpm tsc --noEmit` output confirms this is a missing required property error.

**Error pattern:** `Property 'type' is missing` on every `createItem({...})` call

- [ ] **Step 1: Add `type: 'goods'` to every `createItem` call in the file**

  Each call follows this pattern:
  ```typescript
  // Before
  await createItem(db, ctx, { name: 'Widget' });
  // After
  await createItem(db, ctx, { name: 'Widget', type: 'goods' });
  ```

  If a call also has `defaultUnitId`:
  ```typescript
  // Before
  await createItem(db, ctx, { name: 'Widget', defaultUnitId: unitId });
  // After
  await createItem(db, ctx, { name: 'Widget', type: 'goods', defaultUnitId: unitId });
  ```

  Do NOT change any other logic — only add the missing `type` field.

- [ ] **Step 2: Verify**
  ```bash
  pnpm tsc --noEmit 2>&1 | grep audit-trail
  ```
  Expected: no output

---

### Task 3: Fix `soft-delete.test.ts` — missing `type` on 6 item fixtures

**Modify:** `tests/backend/soft-delete.test.ts` at lines 64, 83, 89, 110, 146, 182

- [ ] **Step 1: Add `type: 'goods'` to every `createItem` call** (same pattern as Task 2)

- [ ] **Step 2: Verify all errors cleared**
  ```bash
  pnpm tsc --noEmit 2>&1
  ```
  Expected: **no output at all**

- [ ] **Step 3: Run lint and unit tests**
  ```bash
  pnpm lint && pnpm test
  ```
  Expected: lint passes, all unit tests pass

- [ ] **Step 4: Commit**
  ```bash
  git add tests/backend/role-permissions.test.ts \
          tests/backend/audit-trail.test.ts \
          tests/backend/soft-delete.test.ts
  git commit -m "fix(tests): add missing type field and TenantContext fields to test fixtures"
  ```

- [ ] **Step 5: Push and verify CI**
  ```bash
  git push
  ```
  Expected: GitHub Actions "Lint & Typecheck" job goes green

---

## Chunk 2: Diagnose Google Sign-In

**Important:** Do NOT write any code until you have observed the actual failure via logs. Prior code-only attempts failed because the root cause is unknown. This chunk is diagnostic-first.

### Task 4: Observe the failure in real-time via Vercel logs

- [ ] **Step 1: Open a terminal and stream production logs**
  ```bash
  vercel logs --follow https://wareos.in
  ```

- [ ] **Step 2: Open `https://wareos.in/login` in a fresh incognito browser window**
  (Incognito avoids cached session state which can mask the real error)

- [ ] **Step 3: Click "Sign in with Google" and complete Google authentication**

- [ ] **Step 4: Identify which scenario you're in by checking the logs**

---

### Task 5: Act on what the logs show

**Scenario A — You see NO `/auth/callback` log entry at all:**

The request never reached your server. Supabase rejected the `redirectTo` URL.

- [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Authentication → URL Configuration → **Redirect URLs**
- [ ] Verify `https://wareos.in/auth/callback` is present (exact URL, no trailing slash)
- [ ] If missing, add it and retry — no code change needed

---

**Scenario B — You see `[auth/callback] exchangeCodeForSession: { success: false, errorCode: "...", errorMessage: "..." }`:**

Note the exact `errorCode` and `errorMessage`, then:

- [ ] **If `otp_expired`:** The PKCE code verifier cookie was lost between pages.
  - Check: Does your middleware's Supabase client (`src/middleware.ts` → `createMiddlewareClient`) use `getAll`/`setAll` pattern correctly? It must NOT clear unrecognized cookies.
  - Also check: Is there any redirect between `signInWithOAuth` and the Google page that could clear cookies?

- [ ] **If `provider_disabled`:** Google OAuth not enabled in Supabase.
  - Go to Supabase Dashboard → Authentication → Providers → Google → Enable it with valid Client ID and Client Secret from Google Cloud Console

- [ ] **If `invalid_grant`:** Authorization code expired (>5 minutes) or already used.
  - Check: Is the Google Cloud Console OAuth 2.0 client's **Authorized redirect URIs** set to `https://<your-project-ref>.supabase.co/auth/v1/callback` (NOT `wareos.in/auth/callback`)?

---

**Scenario C — You see `[auth/callback] exchangeCodeForSession: { success: true, userId: "..." }` but user ends up back at `/login`:**

The code exchange worked but the session cookies aren't being read by the middleware on the subsequent request.

- [ ] **Step 1: Add cookie detail logging to the callback route**

  In `src/app/auth/callback/route.ts`, after the existing line 92 (`console.log('[auth/callback] redirecting to:', ...)`), add a new log line:
  ```typescript
  console.log('[auth/callback] cookie details:',
    Array.from(responseCookieMap.values()).map(c => ({
      name: c.name,
      valueLength: c.value.length,
      options: c.options,
    }))
  );
  ```
  (Line 92 already logs cookie key names — this new line adds value length and options, which tells you if `HttpOnly`, `Secure`, `Path=/`, `SameSite` are set correctly.)

- [ ] **Step 2: Commit and deploy**
  ```bash
  git add src/app/auth/callback/route.ts
  git commit -m "debug(auth): log cookie options for OAuth callback investigation"
  git push
  ```

- [ ] **Step 3: Retry Google Sign-In and check logs for cookie options**
  - Expect to see cookies like `sb-<ref>-auth-token.0`, `sb-<ref>-auth-token.1` with `HttpOnly`, `Secure`, `Path=/`, `SameSite=Lax`
  - If any cookie has `value.length === 0` or `options` is missing required fields, that's the bug

---

## Verification

After completing both chunks:

- [ ] `pnpm tsc --noEmit` → zero errors
- [ ] `pnpm lint` → zero errors
- [ ] `pnpm test` → all unit tests pass
- [ ] Push to `main` → CI "Lint & Typecheck" job passes (green checkmark)
- [ ] Google Sign-In on `wareos.in` → user reaches `/t/<tenant-slug>` dashboard
