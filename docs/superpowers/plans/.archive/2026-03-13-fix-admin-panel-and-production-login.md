# Fix Admin Panel Bugs + Production Login Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three blocking issues: (1) module toggle 500 error on admin tenant page, (2) production OAuth login redirecting to `/no-tenant` instead of `/admin`, (3) hydration mismatch warnings from CSS `background` shorthand in inline styles.

**Architecture:** Issue 1 is a Drizzle/postgres.js serialization bug — JS arrays passed to `jsonb` columns are misinterpreted as Postgres native arrays. Fix with `JSON.stringify()` + `::jsonb` cast. Issue 2 is the OAuth callback silently swallowing `syncUserAppMetadata()` failures in production (likely missing env vars). Fix with structured error logging + env var verification. Issue 3 is CSS `background` shorthand expanding differently on server vs client. Fix by replacing with `backgroundColor` (a non-shorthand property) across all affected files.

**Tech Stack:** Next.js 16, Drizzle ORM, postgres.js, Supabase Auth, Tailwind v4, Vitest, Vercel

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/api/v1/admin/tenants/[id]/route.ts:32-48` | Fix jsonb serialization in PATCH handler |
| Modify | `src/app/auth/callback/route.ts:39-53` | Add structured error logging for sync failures |
| Modify | `src/app/admin/layout.tsx:23,26` | Fix hydration: `background` → `backgroundColor` |
| Modify | `src/app/admin/tenants/page.tsx:60` | Same hydration fix |
| Modify | `src/app/admin/tenants/new/page.tsx:69` | Same hydration fix |
| Modify | `src/app/admin/access-requests/page.tsx:115,135` | Same hydration fix |
| Modify | `src/app/(auth)/no-tenant/page.tsx:14` | Same hydration fix |
| Modify | `src/app/(auth)/no-tenant/no-tenant-actions.tsx:25,35` | Same hydration fix |
| Modify | `src/app/not-found.tsx:6,32` | Same hydration fix |
| Modify | `src/app/error.tsx:18,52` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/error.tsx:18,38` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/loading.tsx:6,16,29` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/dashboard-client.tsx:252,278,290` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/inventory/page.tsx:9` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/purchases/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/sales/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/transfers/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/adjustments/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/payments/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/stock-alerts/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/audit-log/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/shortage-tracking/page.tsx:8` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/settings/items/page.tsx:9` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/settings/locations/page.tsx:9` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/settings/contacts/page.tsx:9` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/settings/units/page.tsx:9` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/settings/users/page.tsx:9` | Same hydration fix |
| Modify | `src/components/pwa/offline-banner.tsx:25` | Same hydration fix |
| Modify | `src/components/keyboard-shortcuts/shortcuts-help.tsx:50` | Same hydration fix |
| Modify | `src/components/layout/sidebar.tsx:98,118` | Same hydration fix |
| Modify | `src/components/layout/header.tsx:48,79,117,141` | Same hydration fix |
| Modify | `src/components/layout/mobile-bottom-nav.tsx:34` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/purchases/purchase-form-dialog.tsx:425` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/sales/sale-form-dialog.tsx:439` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/settings/items/items-client.tsx:143` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/inventory/stock-client.tsx:205` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/transfers/transfer-receive-dialog.tsx:180,229` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/shortage-tracking/shortage-client.tsx:195` | Same hydration fix |
| Modify | `src/app/t/[tenantSlug]/stock-alerts/stock-alerts-client.tsx:382` | Same hydration fix |
| Modify | `src/app/admin/tenants/[id]/page.tsx:186` | Same hydration fix |
| Check | Vercel env vars | Verify `DATABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set |

---

## Chunk 1: Fix JSONB Serialization in Admin Tenant PATCH

### Task 1: Fix enabledModules jsonb serialization

**Files:**
- Modify: `src/app/api/v1/admin/tenants/[id]/route.ts:32-48`

**Root cause:** postgres.js driver sees a JS `Array` and binds it as a Postgres native array literal (`{a,b,c}`). But the `enabled_modules` column is `jsonb`, which expects a JSON string (`'["a","b","c"]'`). Fix: `JSON.stringify()` + `::jsonb` explicit cast.

- [ ] **Step 1: Update PATCH handler to cast enabledModules as jsonb**

Replace the PATCH handler (lines 32-48) with:

```typescript
export const PATCH = withAdminContext(async (req) => {
  const id = req.url.split('/tenants/')[1]?.split('/')[0]?.split('?')[0];
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json();
  const parsed = updateTenantSchema.parse(body);

  // Build the set data, handling jsonb serialization for enabledModules.
  // postgres.js binds JS arrays as Postgres native arrays, not JSON.
  // Explicit JSON.stringify + ::jsonb cast fixes "malformed array literal".
  const setData: Record<string, unknown> = { ...parsed, updatedAt: new Date() };
  if (parsed.enabledModules) {
    setData.enabledModules = sql`${JSON.stringify(parsed.enabledModules)}::jsonb`;
  }

  const result = await db
    .update(tenants)
    .set(setData)
    .where(eq(tenants.id, id))
    .returning();

  if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(result[0]);
});
```

Note: `sql` is already imported at line 5: `import { eq, sql } from 'drizzle-orm';`

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run unit tests**

Run: `pnpm test --run`
Expected: All tests pass

- [ ] **Step 4: Manual test — toggle a module**

1. Start dev server: `pnpm dev`
2. Login as super-admin, navigate to `/admin/tenants/{any-tenant-id}`
3. Click a module button (e.g., "purchase") → should toggle without error
4. Refresh the page → toggled state should persist
5. Check terminal → no `malformed array literal` errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/admin/tenants/[id]/route.ts
git commit -m "fix(admin): cast enabledModules as jsonb in tenant PATCH

postgres.js binds JS arrays as native Postgres arrays, not JSON.
Explicit ::jsonb cast fixes 'malformed array literal' on module toggle."
```

---

## Chunk 2: Fix Production Login (Structured Error Logging + Env Verification)

### Task 2: Verify Vercel environment variables

**Context:** On production (wareos.in), OAuth login sends super-admins to `/no-tenant` instead of `/admin`. The OAuth callback at `src/app/auth/callback/route.ts` calls `syncUserAppMetadata()` which requires:
1. `DATABASE_URL` — for Drizzle queries to `super_admins` and `user_tenants` tables
2. `SUPABASE_SERVICE_ROLE_KEY` — for `createAdminClient()` to update user's `app_metadata`

If either is missing, `syncUserAppMetadata()` throws, the catch block swallows it, and the user gets redirected with a stale JWT that lacks `is_super_admin: true`.

**Files:**
- Check: Vercel environment variables (dashboard or CLI)

- [ ] **Step 6: Check Vercel environment variables**

Run: `vercel env ls`

Verify both are present for Production environment:
- `DATABASE_URL` — full Supabase Postgres connection string (e.g., `postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres`)
- `SUPABASE_SERVICE_ROLE_KEY` — starts with `eyJ...` (a JWT)

If either is missing, add it:
```bash
vercel env add DATABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

After adding, a new deployment is required:
```bash
vercel --prod
```

---

### Task 3: Add structured error logging to OAuth callback

**Files:**
- Modify: `src/app/auth/callback/route.ts:39-53`

- [ ] **Step 7: Replace the try/catch block with structured logging**

Replace lines 39-53 with:

```typescript
    if (!error) {
      // Sync app_metadata from DB on every login — catches stale JWTs,
      // role changes, and manually-added user_tenants records.
      if (data.session?.user?.id) {
        try {
          await syncUserAppMetadata(data.session.user.id);
          // Force JWT re-mint so the redirect carries fresh app_metadata.
          // refreshSession() triggers setAll() internally, which overwrites
          // responseCookies with the new JWT containing updated claims.
          await supabase.auth.refreshSession();
        } catch (e) {
          // Log with enough context to diagnose production failures.
          // This is the #1 suspect when users land on /no-tenant unexpectedly.
          console.error('[auth/callback] syncUserAppMetadata failed:', {
            userId: data.session.user.id,
            error: e instanceof Error ? e.message : String(e),
            hasDbUrl: !!process.env.DATABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          });
        }
      }
```

This logs:
- Which user was affected
- The actual error message
- Whether the critical env vars are present (boolean, not values — don't leak secrets)

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "fix(auth): add structured error logging to OAuth callback

Log userId, error message, and env var presence when syncUserAppMetadata
fails. Diagnoses production /no-tenant redirects from Vercel function logs."
```

- [ ] **Step 10: Deploy and verify production login**

1. Push to main or deploy: `vercel --prod`
2. Navigate to wareos.in, sign in with Google (super-admin account)
3. Expected: redirect to `/admin` (not `/no-tenant`)
4. If still failing: check Vercel function logs (`vercel logs --follow`) for the `[auth/callback]` message — it will show exactly which env var is missing

---

## Chunk 3: Fix Hydration Mismatch (CSS background → backgroundColor)

### Task 4: Global find-and-replace background shorthand in inline styles

**Context:** CSS `background` is a shorthand that expands to 8+ individual properties (`background-image`, `background-position-x`, `background-size`, etc.). React's server renderer and the browser expand it differently when CSS custom properties like `var(--bg-off)` are involved. This produces a hydration mismatch warning:

```
Prop `style` did not match. Server: "background:var(--bg-off)" Client: "background-image:initial;background-position-x:initial;..."
```

**Fix:** Replace `background:` with `backgroundColor:` in all inline `style={{ }}` objects. `backgroundColor` is a non-shorthand property that serializes identically on server and client.

**Files:** ~40 files (see File Structure table above). All have the same mechanical change.

- [ ] **Step 11: Replace all inline `background:` with `backgroundColor:` in style objects**

In every file listed in the File Structure table, replace:
```typescript
background: 'var(--bg-off)'
background: 'var(--bg-base)'
background: 'var(--accent-color)'
background: 'var(--accent-tint)'
background: 'var(--green)'
background: 'var(--red-bg)'
background: 'var(--orange-bg)'
background: 'transparent'
```
with:
```typescript
backgroundColor: 'var(--bg-off)'
backgroundColor: 'var(--bg-base)'
backgroundColor: 'var(--accent-color)'
backgroundColor: 'var(--accent-tint)'
backgroundColor: 'var(--green)'
backgroundColor: 'var(--red-bg)'
backgroundColor: 'var(--orange-bg)'
backgroundColor: 'transparent'
```

**Important exceptions — do NOT change:**
- `background: "none"` in `src/components/onboarding/onboarding-wizard.tsx:675` — this intentionally resets all background sub-properties (image, color, etc.)
- Any `background` in CSS files or Tailwind classes — only change JSX `style={{ }}` objects

**Quick approach:** Use editor find-and-replace with regex:
- Find: `background: (['"]var\(--`
- Replace: `backgroundColor: $1var(--`

Then manually handle the `'transparent'` case.

- [ ] **Step 12: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors (`backgroundColor` is a valid `CSSProperties` key)

- [ ] **Step 13: Run full test suite**

Run: `pnpm test --run`
Expected: All tests pass

- [ ] **Step 14: Verify no hydration warnings**

1. Start dev server: `pnpm dev`
2. Open Chrome → navigate to `/admin`
3. Open DevTools → Console tab
4. Verify: no "Prop `style` did not match" warnings
5. Navigate to a tenant page (e.g., `/t/{slug}/inventory`) → same check

- [ ] **Step 15: Visual spot-check**

Verify backgrounds still render correctly:
1. `/admin` page — should have off-white background, white header
2. `/admin/tenants` — white cards on off-white page
3. `/t/{slug}/inventory` — off-white background
4. Mobile bottom nav — white background
5. Sidebar — white background with accent-tint on active item

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "fix(ui): replace background shorthand with backgroundColor

CSS background shorthand expands differently on server vs client when
using CSS custom properties, causing React hydration mismatch warnings.
backgroundColor is a non-shorthand property that serializes identically."
```

---

## Verification

### Automated
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `pnpm test --run` — all unit tests pass
- [ ] `pnpm build` — production build succeeds

### End-to-End (Manual)
1. **Module toggle:** `/admin/tenants/{id}` → click module → no 500, state persists on refresh
2. **Production login:** wareos.in → Google sign-in → super-admin reaches `/admin`
3. **Hydration:** DevTools Console → no style mismatch warnings on any page
4. **Visual regression:** backgrounds render correctly across admin + tenant pages

### If Production Login Still Fails After Deploy
1. Run `vercel logs --follow`
2. Look for `[auth/callback] syncUserAppMetadata failed:` entries
3. The log shows `hasDbUrl` and `hasServiceKey` booleans — if either is `false`, add the missing env var in Vercel dashboard and redeploy
4. If both are `true`, the error message itself will point to the actual DB/Supabase issue
