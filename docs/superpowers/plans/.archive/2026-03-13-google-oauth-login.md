# Google OAuth Login Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Sign in with Google" / "Sign up with Google" buttons to the login and register pages, connecting to the already-configured Supabase Google OAuth provider.

**Architecture:** Supabase handles all OAuth complexity (token exchange, user creation). The app calls `signInWithOAuth({ provider: 'google' })` which redirects to Google, then back to `/auth/callback` which already handles `exchangeCodeForSession`. New Google users without a tenant get redirected to `/no-tenant` by the existing middleware logic.

**Tech Stack:** Supabase Auth (`signInWithOAuth`), Next.js client components, existing design system tokens.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(auth)/login/page.tsx` | Modify | Add Google sign-in button + divider |
| `src/app/(auth)/register/page.tsx` | Modify | Add Google sign-up button + divider |

No new files needed. The callback route (`src/app/auth/callback/route.ts`) and middleware (`src/middleware.ts`) require zero changes.

---

## Chunk 1: Login Page — Google OAuth Button

### Task 1: Add Google OAuth to Login Page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add `googleLoading` state**

In `LoginPage`, after `const [error, setError] = useState('');` (line 16), add:

```tsx
const [googleLoading, setGoogleLoading] = useState(false);
```

- [ ] **Step 2: Add `handleGoogleLogin` function**

After the `handleForgot` function (after line 56), add:

```tsx
async function handleGoogleLogin() {
  setGoogleLoading(true);
  setError('');

  const { error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (oauthError) {
    setError(oauthError.message);
    setGoogleLoading(false);
  }
  // If successful, browser redirects to Google — no further action needed.
}
```

- [ ] **Step 3: Add divider and Google button to the login view JSX**

In the login view's return (the final `return` block), after the closing `</form>` tag (line 160) and before the `<div className="mt-4 flex items-center justify-between text-sm">` (line 161), add:

```tsx
{/* Divider */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-stone-300" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="bg-white px-3 text-stone-400">or</span>
  </div>
</div>

{/* Google OAuth */}
<button
  type="button"
  onClick={handleGoogleLogin}
  disabled={googleLoading || loading}
  className="flex w-full h-12 items-center justify-center gap-3 rounded-full border-[1.5px] border-stone-300 bg-white text-sm font-bold text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-60 disabled:cursor-not-allowed"
>
  {googleLoading ? (
    'Redirecting...'
  ) : (
    <>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </>
  )}
</button>
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: No type errors related to login page.

- [ ] **Step 5: Visual verification**

1. Navigate to `http://localhost:3000/login`
2. Verify: divider with "or" text appears between the form and the new button
3. Verify: Google button is pill-shaped, 48px tall, white bg, stone border, Google "G" icon
4. Verify: at 375px mobile width, button is full-width and looks good
5. Take screenshot: `screenshots/login-google-oauth.png`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): add Google OAuth sign-in button to login page"
```

---

## Chunk 2: Register Page — Google OAuth Button

### Task 2: Add Google OAuth to Register Page

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Add `googleLoading` state**

In `RegisterPage`, after `const [error, setError] = useState('');` (line 15), add:

```tsx
const [googleLoading, setGoogleLoading] = useState(false);
```

- [ ] **Step 2: Add `handleGoogleLogin` function**

After the `handleRegister` function (after line 51), add:

```tsx
async function handleGoogleLogin() {
  setGoogleLoading(true);
  setError('');

  const { error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (oauthError) {
    setError(oauthError.message);
    setGoogleLoading(false);
  }
}
```

- [ ] **Step 3: Add divider and Google button to the register view JSX**

In the register view's return, after the closing `</form>` tag (line 126) and before the `<p className="mt-4 text-center text-sm text-stone-500">` (line 127), add the same divider + button markup from Task 1 Step 3, except change the label from `"Sign in with Google"` to `"Sign up with Google"`.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: No type errors.

- [ ] **Step 5: Visual verification**

1. Navigate to `http://localhost:3000/register`
2. Verify: same layout as login — divider + Google button after the form
3. Verify: button says "Sign up with Google"
4. Take screenshot: `screenshots/register-google-oauth.png`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(auth\)/register/page.tsx
git commit -m "feat(auth): add Google OAuth sign-up button to register page"
```

---

## Verification Checklist

- [ ] `pnpm build` passes with zero errors
- [ ] Login page: "Sign in with Google" button renders correctly
- [ ] Register page: "Sign up with Google" button renders correctly
- [ ] Clicking Google button redirects to Google consent screen (requires valid Supabase config)
- [ ] After Google auth, user is redirected back to the app via `/auth/callback`
- [ ] New Google users (no tenant) land on `/no-tenant`
- [ ] Existing Google users (with tenant) land on their dashboard
- [ ] Mobile viewport (375px) looks correct on both pages
- [ ] No hardcoded hex colors — uses design system tokens (stone-300, stone-400, etc. are Tailwind defaults, acceptable)
