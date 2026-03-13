# Fix Missing DATABASE_URL — Production + CI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken production app (wareos.in) and harden CI by adding the missing `DATABASE_URL` environment variable everywhere it's needed.

**Architecture:** The Drizzle ORM client (`src/core/db/drizzle.ts`) requires `DATABASE_URL` at module load time. It's missing from Vercel, `.env.local`, and GitHub Actions — causing `syncUserAppMetadata()` to fail on every login. The GitHub secrets the user already added (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are necessary but insufficient — they don't provide a Postgres connection string.

**Tech Stack:** Supabase (Postgres), Drizzle ORM, Vercel, GitHub Actions

---

## Chunk 1: Fix production and local dev

### Background: Why it's broken

The login flow calls `syncUserAppMetadata()` in `/auth/callback` which imports `db` from `src/core/db/drizzle.ts`:

```ts
// src/core/db/drizzle.ts:5-6
const connectionString = process.env.DATABASE_URL!;  // undefined in production!
const client = postgres(connectionString);            // crashes here
```

Vercel logs show: `error λ GET /auth/callback 307 Failed to sync app_metadata on login: Error: Failed que…`

The user's JWT never gets tenant info → middleware redirects to `/no-tenant` → user stuck.

### Current Vercel env vars (from `vercel env ls`)

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Set |
| `RESEND_API_KEY` | Set |
| `NEXT_PUBLIC_APP_URL` | Set |
| **`DATABASE_URL`** | **MISSING — this is the bug** |

### Task 1: Get the DATABASE_URL from Supabase (manual — user step)

- [ ] **Step 1: Open Supabase Dashboard**

Go to: https://supabase.com/dashboard → select your project (`elmfdrflziuicgnmmcig` based on your anon key)

- [ ] **Step 2: Navigate to Database settings**

Go to: **Project Settings** (gear icon) → **Database** → scroll to **Connection string** section

- [ ] **Step 3: Copy the Transaction pooler URI**

Select the **"Transaction"** tab (NOT "Session", NOT "Direct").

The format looks like:
```
postgresql://postgres.elmfdrflziuicgnmmcig:[YOUR-DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Why Transaction pooler?** Vercel uses serverless functions that open/close connections on every request. The Transaction pooler (port 6543) via PgBouncer handles this correctly. The Direct connection (port 5432) would exhaust connection limits.

### Task 2: Add DATABASE_URL to Vercel

- [ ] **Step 1: Add the environment variable**

```bash
cd "/Users/nirish/Library/CloudStorage/GoogleDrive-nirish.m2@gmail.com/My Drive/_Coding/warehouse-management"
vercel env add DATABASE_URL
```

When prompted:
- **Value:** paste the Transaction pooler URI from Step 1
- **Environments:** select **Production**, **Preview**, and **Development**

- [ ] **Step 2: Verify it's listed**

```bash
vercel env ls
```

Expected: `DATABASE_URL` now appears alongside the other 5 variables.

- [ ] **Step 3: Redeploy to pick up the new env var**

```bash
vercel --prod
```

Or alternatively push any commit to trigger a Vercel deployment.

- [ ] **Step 4: Verify production works**

```bash
vercel logs
```

Expected:
- No more `Failed to sync app_metadata` errors on `/auth/callback`
- `GET /auth/callback` returns `307` (redirect) with `info` level (not `error`)
- Users who log in land on their tenant dashboard, not `/no-tenant`

### Task 3: Add DATABASE_URL to .env.local

- [ ] **Step 1: Add to local env file**

Add this line to `.env.local`:
```
DATABASE_URL=postgresql://postgres.elmfdrflziuicgnmmcig:[YOUR-DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

(Use the same Transaction pooler URI from Task 1.)

- [ ] **Step 2: Verify local dev works**

```bash
pnpm dev
```

Visit `http://localhost:3000` → login → should reach tenant dashboard.

## Chunk 2: Fix CI

### Task 4: Add DATABASE_URL to GitHub Actions secrets

The CI build and E2E jobs compile the Next.js app which bundles `src/core/db/drizzle.ts`. While the build currently passes without `DATABASE_URL` (because Next.js tree-shakes unused server code at build time), the E2E tests run the actual app with `pnpm start`, which WILL crash on any route that hits the DB.

- [ ] **Step 1: Add DATABASE_URL as a GitHub secret**

Go to: https://github.com/nirishm/warehouse-management/settings/secrets/actions

Click **New repository secret**:
- **Name:** `DATABASE_URL`
- **Secret:** paste the same Transaction pooler URI

Click **Add secret**.

- [ ] **Step 2: Update CI workflow to pass DATABASE_URL to build and E2E jobs**

**File:** `.github/workflows/ci.yml`

Add `DATABASE_URL` to the `build` job's env (line ~57-59):

```yaml
      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Add `DATABASE_URL` to BOTH the build step and E2E test step in the `e2e-tests` job (lines ~73-84):

```yaml
      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: pnpm test:e2e --project=chromium
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "fix(ci): add DATABASE_URL to build and E2E jobs"
git push
```

- [ ] **Step 4: Verify CI passes**

```bash
gh run list --limit 1
gh run watch <run-id> --exit-status
```

Expected: All 4 jobs pass (Lint & Typecheck, Unit Tests, Build, E2E Tests).

---

## Verification

1. **Production (wareos.in):**
   - `vercel logs` shows no `Failed to sync` errors
   - OAuth login → lands on tenant dashboard (not `/no-tenant`)
   - Admin panel at `/admin` loads (it also uses Drizzle)

2. **Local dev:**
   - `pnpm dev` → login → tenant dashboard works

3. **CI:**
   - All 4 GitHub Actions jobs pass
   - E2E tests can navigate authenticated routes

## Note: Optional future improvements

- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel for production rate limiting (currently gracefully skipped when missing)
- Add `.env.example` file documenting all required env vars so this doesn't happen again
