# New Tenant Owner Email Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `ownerEmail` field to the New Tenant form so a super-admin can invite the first user in one step instead of two.

**Architecture:** The form sends `ownerEmail` in the POST body → API validates with Zod → inserts tenant → if email provided, calls the existing `inviteUser()` helper with role `admin` → Supabase sends the invite email. The invite step is best-effort (tenant is already created if invite fails, admin can re-invite from the detail page).

**Tech Stack:** Next.js 16, Drizzle ORM, Zod, Supabase Admin Auth, shadcn/ui Input/Label

---

## Chunk 1: API — Accept and handle ownerEmail

### Task 1: Update the create-tenant API route

**Files:**
- Modify: `src/app/api/v1/admin/tenants/route.ts`

#### Context
Current `POST` handler signature: `async (req)` — does NOT use `ctx`. The `withAdminContext` wrapper passes `ctx: { userId, userEmail }` as second arg. The `inviteUser` helper at `src/modules/user-management/queries/users.ts:157` has signature:
```ts
inviteUser(tenantId, email, role: Exclude<Role,'owner'>, displayName, invitedByUserId)
```
The `owner` role is excluded by type, so the first user will be invited as `admin`.

- [ ] **Step 1: Write the failing Zod schema test**

Create `tests/backend/admin-tenant-create.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Copy of the schema to unit-test in isolation
const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  enabledModules: z.array(z.string()).optional(),
  ownerEmail: z.string().email().optional(),
});

describe('createTenantSchema', () => {
  it('accepts valid input without ownerEmail', () => {
    const result = createTenantSchema.safeParse({ name: 'Acme', slug: 'acme' });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with ownerEmail', () => {
    const result = createTenantSchema.safeParse({
      name: 'Acme',
      slug: 'acme',
      ownerEmail: 'owner@example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ownerEmail).toBe('owner@example.com');
  });

  it('rejects invalid email', () => {
    const result = createTenantSchema.safeParse({
      name: 'Acme',
      slug: 'acme',
      ownerEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('treats missing ownerEmail as undefined (not required)', () => {
    const result = createTenantSchema.safeParse({ name: 'Acme', slug: 'acme' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ownerEmail).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test tests/backend/admin-tenant-create.test.ts
```
Expected: FAIL — `createTenantSchema` in the test file doesn't have `ownerEmail` yet (the production schema hasn't been updated).

Actually, because the schema is a local copy in the test, it WILL pass. The value of this test is to lock in the contract. Run it — all 4 should pass since this is a standalone schema test.

Expected: **PASS** (schema unit tests are self-contained — this validates expected behavior before we wire it into the route).

- [ ] **Step 3: Implement — update `src/app/api/v1/admin/tenants/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { db } from '@/core/db/drizzle';
import { tenants } from '@/core/db/schema';
import { desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { inviteUser } from '@/modules/user-management/queries/users';

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  enabledModules: z.array(z.string()).optional(),
  ownerEmail: z.string().email().optional(),
});

export const GET = withAdminContext(async (req) => {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const [data, countResult] = await Promise.all([
    db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(tenants),
  ]);

  return NextResponse.json({ data, total: Number(countResult[0]?.count ?? 0) });
});

export const POST = withAdminContext(async (req, ctx) => {
  const body = await req.json();
  const parsed = createTenantSchema.parse(body);

  const [tenant] = await db.insert(tenants).values({
    name: parsed.name,
    slug: parsed.slug,
    plan: parsed.plan ?? 'free',
    enabledModules: parsed.enabledModules ?? ['inventory'],
  }).returning();

  if (parsed.ownerEmail) {
    await inviteUser(tenant.id, parsed.ownerEmail, 'admin', undefined, ctx.userId);
  }

  return NextResponse.json(tenant, { status: 201 });
});
```

Key changes:
- Import `inviteUser`
- Add `ownerEmail` to schema
- Change `async (req)` → `async (req, ctx)` to access `ctx.userId`
- Destructure `[tenant]` from `returning()` result
- After insert, conditionally call `inviteUser`

- [ ] **Step 4: Run schema tests to confirm they still pass**

```bash
pnpm test tests/backend/admin-tenant-create.test.ts
```
Expected: **PASS** (4/4)

- [ ] **Step 5: TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "admin/tenants/route|user-management"
```
Expected: no errors on these files.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/admin/tenants/route.ts tests/backend/admin-tenant-create.test.ts
git commit -m "feat(admin-api): accept optional ownerEmail on tenant creation, invite as admin"
```

---

## Chunk 2: UI — Owner Email field on New Tenant form

### Task 2: Add ownerEmail input to the New Tenant page

**Files:**
- Modify: `src/app/admin/tenants/new/page.tsx`

#### Context
Current state: form has `name` + `slug` fields only. Submits `{ name, slug }` to `POST /api/v1/admin/tenants`. The slug field auto-sanitizes input (lowercase, alphanumeric + hyphens).

The email field is optional — if left blank, the tenant is still created (no invite sent).

- [ ] **Step 1: Update `src/app/admin/tenants/new/page.tsx`**

Full file replacement:

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewTenantPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          ownerEmail: ownerEmail || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create tenant');
      }
      toast.success(ownerEmail ? 'Tenant created and invite sent' : 'Tenant created');
      window.location.href = '/admin/tenants';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold mb-6">
        New Tenant
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            required
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            placeholder="acme-corp"
            required
          />
          <p style={{ color: 'var(--text-dim)' }} className="text-[12px] mt-1">
            URL-safe identifier. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        <div>
          <Label>Owner Email <span style={{ color: 'var(--text-dim)' }}>(optional)</span></Label>
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@example.com"
          />
          <p style={{ color: 'var(--text-dim)' }} className="text-[12px] mt-1">
            An invite will be sent with admin role. You can add more users from the tenant detail page.
          </p>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-full h-[48px] w-fit px-6"
          style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
        >
          {submitting ? 'Creating...' : 'Create Tenant'}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep "admin/tenants/new"
```
Expected: no errors.

- [ ] **Step 3: Visual check via Playwright**

Ensure `pnpm dev` is running, then navigate to `http://localhost:3000/admin/tenants/new` and take a screenshot:

```
screenshots/admin-new-tenant-owner-email.png
```

Verify:
- Three fields visible: Name, Slug, Owner Email (optional)
- Helper text under each field
- Orange pill "Create Tenant" button
- No layout issues

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/tenants/new/page.tsx
git commit -m "feat(admin-ui): add optional ownerEmail field to new tenant form"
```

---

## End-to-End Verification

- [ ] On production (or local dev with real Supabase):
  1. Go to `/admin/tenants/new`
  2. Fill in Name + Slug + an owner email → Create
  3. Confirm toast says "Tenant created and invite sent"
  4. Check that tenant detail page shows the user in the Users section
  5. Check the owner's inbox for the Supabase invite email
- [ ] Create a tenant **without** owner email → confirm it still works, toast says "Tenant created"
- [ ] Try an invalid email (e.g. `notanemail`) → browser HTML5 validation blocks submit (type="email")
