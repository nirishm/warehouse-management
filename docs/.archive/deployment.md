# Deployment Guide: Vercel + Supabase

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) project (already created)
- A GitHub repository connected to this codebase (for automatic deployments)

---

## Environment Variables

Set the following environment variables in your Vercel project settings (**Settings > Environment Variables**):

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJI...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | `eyJhbGciOiJI...` |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL | `https://your-app.vercel.app` |

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is a secret and must never be exposed to the client. Vercel will keep it server-side only since it does not have the `NEXT_PUBLIC_` prefix.

---

## Supabase Setup

### 1. Run the public schema migration

In the Supabase SQL Editor, run the contents of:

```
supabase/migrations/00001_public_schema.sql
```

This creates the public schema tables (`tenants`, `tenant_users`, `super_admins`, etc.).

### 2. Enable the `exec_sql` RPC function

The `exec_sql` function is required for tenant schema provisioning. Verify it exists by running:

```sql
SELECT proname FROM pg_proc WHERE proname = 'exec_sql';
```

If it does not exist, create it as part of your migration.

### 3. Configure Authentication

In **Supabase Dashboard > Authentication > URL Configuration**:

1. Set **Site URL** to your Vercel domain (e.g., `https://your-app.vercel.app`)
2. Add the following **Redirect URLs**:
   - `https://your-app.vercel.app/**`
   - `http://localhost:3000/**` (for local development)

### 4. Enable Realtime on tenant tables

For each provisioned tenant schema, run in the SQL Editor:

```sql
-- Replace 'tenant_<id>' with the actual tenant schema name
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_<id>.dispatches;
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_<id>.purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_<id>.sales;
```

---

## Vercel Deployment Steps

### 1. Connect your GitHub repository

1. Log in to [Vercel](https://vercel.com)
2. Click **Add New... > Project**
3. Import your GitHub repository
4. Vercel will auto-detect the Next.js framework

### 2. Set environment variables

Add all environment variables listed above in the Vercel project settings before deploying.

### 3. Deploy

Click **Deploy**. Vercel will build and deploy automatically. Subsequent pushes to your main branch will trigger automatic redeployments.

### 4. Set a custom domain (optional)

In **Vercel > Project Settings > Domains**, add your custom domain and update DNS records as instructed. Remember to update `NEXT_PUBLIC_APP_URL` and the Supabase Site URL / Redirect URLs to match.

---

## Post-Deployment Checklist

1. **Verify the health endpoint** -- visit `https://your-app.vercel.app/api/health` and confirm a JSON response with `"status": "ok"`.

2. **Verify auth flow** -- register a new account, log in, and log out to confirm Supabase Auth is working.

3. **Create the first super admin** -- insert a row into the `super_admins` table:
   ```sql
   INSERT INTO public.super_admins (user_id)
   VALUES ('<your-user-uuid>');
   ```

4. **Create the first tenant** -- use the super admin panel to create a new tenant organization.

5. **Provision the tenant schema** -- trigger schema provisioning from the super admin panel (this calls the `exec_sql` RPC).

6. **Enable modules** -- activate the required modules (Inventory, Sales, Purchases, Dispatch) for the tenant.

7. **Invite the first tenant user** -- use the tenant admin panel to invite a user to the newly created tenant.

---

## Troubleshooting

- **Build fails on Vercel**: Check that all environment variables are set. Missing Supabase keys will cause build-time or runtime errors.
- **Auth redirects to localhost**: Update the Supabase Site URL and Redirect URLs to your Vercel domain.
- **Tenant provisioning fails**: Ensure the `exec_sql` RPC function exists and that `SUPABASE_SERVICE_ROLE_KEY` is set correctly.
- **Realtime not working**: Verify that the tenant tables have been added to the `supabase_realtime` publication.
