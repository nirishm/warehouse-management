# Super Admin Panel Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the super admin panel with per-tenant user management (list/invite/role-change/remove), role selection on access-request approval, and rejection notes.

**Architecture:** Two new API route files handle per-tenant user CRUD in the admin panel; one new DB column stores rejection notes; two existing frontend pages gain new UI sections. All business logic is delegated to existing `inviteUser()`, `updateUserRole()`, `removeUser()`, `listUsers()` query functions — no duplication.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Supabase Auth admin client, shadcn/ui (Dialog, Input, Label, Button, Badge, Skeleton), Zod, Sonner toasts.

---

## Context

The super admin panel today can create tenants, toggle modules, and approve/reject access requests. Three gaps:

1. **No user visibility on tenant detail** — admins can't see who's in a tenant or manage memberships
2. **No invite from admin panel** — the only path to get a user into a tenant is self-signup → access request approval
3. **Role hardcoded to `'viewer'`** on approval (`access-requests/page.tsx:61`) even though the backend already accepts a `role` param
4. **No rejection notes** — the rejected user gets zero feedback

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/core/db/schema/public.ts` | MODIFY | Add `rejectionReason` column to `accessRequests` |
| `src/app/api/v1/admin/tenants/[id]/users/route.ts` | CREATE | `GET` list members + `POST` invite user |
| `src/app/api/v1/admin/tenants/[id]/users/[userId]/route.ts` | CREATE | `PATCH` change role + `DELETE` remove user |
| `src/app/api/v1/admin/access-requests/route.ts` | MODIFY | Accept `rejectionReason` in schema + persist it |
| `src/app/admin/tenants/[id]/page.tsx` | MODIFY | Add Users section card + Invite dialog |
| `src/app/admin/access-requests/page.tsx` | MODIFY | Role dropdown per request + Rejection notes dialog |

**Existing functions to reuse — do NOT reimplement:**
- `inviteUser(tenantId, email, role, displayName, invitedByUserId)` — `src/modules/user-management/queries/users.ts`
- `listUsers(tenantId, filters?, pagination?)` — `src/modules/user-management/queries/users.ts`
- `updateUserRole(tenantId, userId, role, updatedByUserId)` — `src/modules/user-management/queries/users.ts`
- `removeUser(tenantId, userId, removedByUserId)` — `src/modules/user-management/queries/users.ts`
- `syncUserAppMetadata(userId)` — `src/core/auth/sync-metadata.ts`
- `withAdminContext()` — `src/core/auth/admin-guard.ts`
- `createAdminClient()` — check exact import in `src/modules/user-management/queries/users.ts` and use same path

---

## Chunk 1: DB Migration + Backend APIs

### Task 0: Schema migration — add `rejection_reason` column

**Files:**
- Modify: `src/core/db/schema/public.ts`

- [ ] **Step 0.1: Add column to `accessRequests` table definition**

In `src/core/db/schema/public.ts`, find the `accessRequests` table and add one line after `reviewedAt`:

```ts
rejectionReason: text('rejection_reason'),
```

- [ ] **Step 0.2: Generate migration and push to DB**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

Expected: new migration file created, column appears in DB. Spot-check:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'access_requests' AND column_name = 'rejection_reason';
```

- [ ] **Step 0.3: Commit**

```bash
git add src/core/db/schema/public.ts
git commit -m "feat(schema): add rejection_reason to access_requests"
```

---

### Task 1: Admin tenant users API — `GET` + `POST`

**Files:**
- Create: `src/app/api/v1/admin/tenants/[id]/users/route.ts`

- [ ] **Step 1.1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { db } from '@/core/db/drizzle';
import { tenants } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { inviteUser, listUsers } from '@/modules/user-management/queries/users';
// ⚠ Check the exact createAdminClient import path in src/modules/user-management/queries/users.ts
// and use the same import here.
import { createAdminClient } from '@/lib/supabase/admin';

function extractTenantId(url: string): string {
  return new URL(url).pathname.split('/tenants/')[1]?.split('/')[0] ?? '';
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
  displayName: z.string().optional(),
});

export const GET = withAdminContext(async (req) => {
  const tenantId = extractTenantId(req.url);
  if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

  const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (rows.length === 0) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const members = await listUsers(tenantId, undefined, { limit: 100, offset: 0 });

  // Batch-fetch emails from Supabase Auth (N parallel calls — fine for admin panel traffic)
  const admin = createAdminClient();
  const emailMap = new Map<string, string>();
  await Promise.all(
    members.data.map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.userId);
      if (data?.user?.email) emailMap.set(m.userId, data.user.email);
    }),
  );

  const data = members.data.map((m) => ({
    ...m,
    email: emailMap.get(m.userId) ?? null,
  }));

  return NextResponse.json({ data });
});

export const POST = withAdminContext(async (req, ctx) => {
  const tenantId = extractTenantId(req.url);
  if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

  const body = await req.json();
  const parsed = inviteSchema.parse(body);

  const result = await inviteUser(
    tenantId,
    parsed.email,
    parsed.role,
    parsed.displayName,
    ctx.userId,
  );

  return NextResponse.json({ data: result }, { status: 201 });
});
```

- [ ] **Step 1.2: Smoke-test GET in browser**

While logged in as super admin, open:
`/api/v1/admin/tenants/<real-tenant-id>/users`

Expected: `{ "data": [...] }` — even if empty array.

- [ ] **Step 1.3: Commit**

```bash
git add "src/app/api/v1/admin/tenants/[id]/users/route.ts"
git commit -m "feat(admin-api): GET + POST tenant users endpoint"
```

---

### Task 2: Admin tenant users API — `PATCH` + `DELETE`

**Files:**
- Create: `src/app/api/v1/admin/tenants/[id]/users/[userId]/route.ts`

- [ ] **Step 2.1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { withAdminContext } from '@/core/auth/admin-guard';
import { z } from 'zod';
import { updateUserRole, removeUser } from '@/modules/user-management/queries/users';
import { syncUserAppMetadata } from '@/core/auth/sync-metadata';

function extractIds(url: string): { tenantId: string; userId: string } {
  // Pathname: /api/v1/admin/tenants/[tenantId]/users/[userId]
  // Split:    ['', 'api', 'v1', 'admin', 'tenants', tenantId, 'users', userId]
  const segments = new URL(url).pathname.split('/');
  return { tenantId: segments[5] ?? '', userId: segments[7] ?? '' };
}

const roleSchema = z.object({
  role: z.enum(['admin', 'manager', 'operator', 'viewer']),
});

export const PATCH = withAdminContext(async (req, ctx) => {
  const { tenantId, userId } = extractIds(req.url);
  if (!tenantId || !userId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });

  const body = await req.json();
  const parsed = roleSchema.parse(body);

  const result = await updateUserRole(tenantId, userId, parsed.role, ctx.userId);
  await syncUserAppMetadata(userId); // keep JWT current

  return NextResponse.json({ data: result });
});

export const DELETE = withAdminContext(async (req, ctx) => {
  const { tenantId, userId } = extractIds(req.url);
  if (!tenantId || !userId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });

  await removeUser(tenantId, userId, ctx.userId);

  return NextResponse.json({ data: { success: true } });
});
```

> **Segment index check:** If requests return 400 "Missing IDs", log `new URL(req.url).pathname.split('/')` and adjust `segments[5]` / `segments[7]` to match the actual indices.

- [ ] **Step 2.2: Commit**

```bash
git add "src/app/api/v1/admin/tenants/[id]/users/[userId]/route.ts"
git commit -m "feat(admin-api): PATCH + DELETE tenant user endpoint"
```

---

### Task 3: Add `rejectionReason` to access-requests API

**Files:**
- Modify: `src/app/api/v1/admin/access-requests/route.ts`

- [ ] **Step 3.1: Update `reviewSchema`**

Add one field:
```ts
rejectionReason: z.string().max(500).optional(),
```

- [ ] **Step 3.2: Persist `rejectionReason` in the reject branch**

Update the `else` block's `.set()`:
```ts
await db
  .update(accessRequests)
  .set({
    status: 'rejected',
    reviewedBy: ctx.userId,
    reviewedAt: new Date(),
    rejectionReason: parsed.rejectionReason ?? null,  // ← add this line
  })
  .where(eq(accessRequests.id, parsed.requestId));
```

- [ ] **Step 3.3: Commit**

```bash
git add src/app/api/v1/admin/access-requests/route.ts
git commit -m "feat(admin-api): store rejection_reason on access request rejection"
```

---

## Chunk 2: Frontend Pages

### Task 4: Tenant detail page — Users section + Invite dialog

**Files:**
- Modify: `src/app/admin/tenants/[id]/page.tsx`

- [ ] **Step 4.1: Add imports**

```ts
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

- [ ] **Step 4.2: Add `TenantUser` interface (after `TenantDetail`)**

```ts
interface TenantUser {
  userId: string;
  role: string;
  email: string | null;
  displayName: string | null;
}
```

- [ ] **Step 4.3: Add state variables (after existing `saving` state)**

```ts
const [users, setUsers] = useState<TenantUser[]>([]);
const [usersLoading, setUsersLoading] = useState(true);
const [inviteOpen, setInviteOpen] = useState(false);
const [inviteEmail, setInviteEmail] = useState('');
const [inviteRole, setInviteRole] = useState('viewer');
const [inviteDisplayName, setInviteDisplayName] = useState('');
const [inviting, setInviting] = useState(false);
const [roleChanging, setRoleChanging] = useState<string | null>(null);
```

- [ ] **Step 4.4: Add `fetchUsers` function (after `fetchTenant`)**

```ts
const fetchUsers = useCallback(async () => {
  try {
    const res = await fetch(`/api/v1/admin/tenants/${id}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    const json = await res.json();
    setUsers(json.data ?? []);
  } catch {
    toast.error('Failed to load users');
  } finally {
    setUsersLoading(false);
  }
}, [id]);
```

- [ ] **Step 4.5: Update `useEffect` to also call `fetchUsers`**

```ts
useEffect(() => {
  fetchTenant();
  fetchUsers();
}, [fetchTenant, fetchUsers]);
```

- [ ] **Step 4.6: Add action handlers (before `return`)**

```ts
const handleRoleChange = async (userId: string, newRole: string) => {
  setRoleChanging(userId);
  try {
    const res = await fetch(`/api/v1/admin/tenants/${id}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) throw new Error('Failed');
    setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, role: newRole } : u)));
    toast.success('Role updated');
  } catch {
    toast.error('Failed to update role');
  } finally {
    setRoleChanging(null);
  }
};

const handleRemoveUser = async (userId: string) => {
  try {
    const res = await fetch(`/api/v1/admin/tenants/${id}/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    setUsers((prev) => prev.filter((u) => u.userId !== userId));
    toast.success('User removed');
  } catch {
    toast.error('Failed to remove user');
  }
};

const handleInvite = async () => {
  setInviting(true);
  try {
    const res = await fetch(`/api/v1/admin/tenants/${id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteDisplayName || undefined,
      }),
    });
    if (!res.ok) throw new Error('Failed');
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('viewer');
    setInviteDisplayName('');
    fetchUsers();
    toast.success('Invite sent');
  } catch {
    toast.error('Failed to send invite');
  } finally {
    setInviting(false);
  }
};
```

- [ ] **Step 4.7: Add Users section card to JSX (after the Module Toggles card)**

```tsx
{/* Users */}
<div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5">
  <div className="flex items-center justify-between mb-4">
    <h3 style={{ color: 'var(--text-primary)' }} className="text-[15px] font-bold">
      Users ({users.length})
    </h3>
    <Button
      onClick={() => setInviteOpen(true)}
      className="rounded-full h-[36px] px-4 text-[13px]"
      style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
    >
      Invite User
    </Button>
  </div>

  {usersLoading ? (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  ) : users.length === 0 ? (
    <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">
      No users yet
    </p>
  ) : (
    <div className="flex flex-col gap-0">
      {users.map((u) => (
        <div
          key={u.userId}
          className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0"
        >
          <div>
            <p style={{ color: 'var(--text-primary)' }} className="text-[13px] font-bold">
              {u.displayName ?? u.email ?? u.userId}
            </p>
            {u.displayName && u.email && (
              <p style={{ color: 'var(--text-muted)' }} className="text-[12px]">
                {u.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={u.role}
              onChange={(e) => handleRoleChange(u.userId, e.target.value)}
              disabled={roleChanging === u.userId || u.role === 'owner'}
              className="border border-[var(--border)] rounded-md px-2 py-1 text-[12px]"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
            >
              {u.role === 'owner' && <option value="owner">owner</option>}
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
            {u.role !== 'owner' && (
              <Button
                onClick={() => handleRemoveUser(u.userId)}
                variant="outline"
                className="h-[30px] px-3 text-[12px]"
                style={{ color: 'var(--red)' }}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

{/* Invite User Dialog */}
<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Invite User to {tenant.name}</DialogTitle>
    </DialogHeader>
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-email">Email *</Label>
        <Input
          id="invite-email"
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="user@example.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-name">Display Name</Label>
        <Input
          id="invite-name"
          value={inviteDisplayName}
          onChange={(e) => setInviteDisplayName(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <select
          id="invite-role"
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="border border-[var(--border)] rounded-md px-3 py-2 text-[13px]"
          style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
        >
          <option value="admin">admin</option>
          <option value="manager">manager</option>
          <option value="operator">operator</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setInviteOpen(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleInvite}
        disabled={inviting || !inviteEmail}
        className="rounded-full h-[48px] px-6"
        style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
      >
        {inviting ? 'Sending…' : 'Send Invite'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4.8: Visual check**

With `pnpm dev` running, open `/admin/tenants/<real-id>`. Verify:
- Users section shows (skeleton → list or "No users yet")
- "Invite User" button opens the dialog
- Zero JS console errors

- [ ] **Step 4.9: Commit**

```bash
git add "src/app/admin/tenants/[id]/page.tsx"
git commit -m "feat(admin-ui): tenant users section with invite dialog"
```

---

### Task 5: Access requests page — role selection + rejection notes

**Files:**
- Modify: `src/app/admin/access-requests/page.tsx`

- [ ] **Step 5.1: Add Dialog import**

```ts
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
```

- [ ] **Step 5.2: Add state variables (after existing `processing` state)**

```ts
const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
const [rejectTarget, setRejectTarget] = useState<string | null>(null);
const [rejectionReason, setRejectionReason] = useState('');
```

- [ ] **Step 5.3: Update `handleAction` — add `reason` param + pass role**

Replace the existing `handleAction` function:

```ts
const handleAction = async (
  requestId: string,
  action: 'approve' | 'reject',
  tenantId?: string,
  reason?: string,
) => {
  setProcessing(requestId);
  try {
    const res = await fetch('/api/v1/admin/access-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        action,
        tenantId,
        role: selectedRoles[requestId] ?? 'viewer',   // ← was hardcoded 'viewer'
        ...(reason ? { rejectionReason: reason } : {}),
      }),
    });
    if (!res.ok) throw new Error('Failed');
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    toast.success(`Request ${action}d`);
  } catch {
    toast.error(`Failed to ${action}`);
  } finally {
    setProcessing(null);
    setRejectTarget(null);
    setRejectionReason('');
  }
};
```

- [ ] **Step 5.4: Add Role dropdown to each request row**

In the `requests.map((r) => ...)` block, add a role `<select>` **before** the existing tenant `<select>`:

```tsx
<select
  value={selectedRoles[r.id] ?? 'viewer'}
  onChange={(e) =>
    setSelectedRoles((prev) => ({ ...prev, [r.id]: e.target.value }))
  }
  className="border border-[var(--border)] rounded-md px-2 py-1.5 text-[13px]"
  style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
>
  <option value="admin">admin</option>
  <option value="manager">manager</option>
  <option value="operator">operator</option>
  <option value="viewer">viewer</option>
</select>
```

- [ ] **Step 5.5: Replace Reject button to open dialog instead of direct action**

Replace the existing `<Button onClick={() => handleAction(r.id, 'reject')} ...>` with:

```tsx
<Button
  onClick={() => setRejectTarget(r.id)}
  disabled={processing === r.id}
  variant="outline"
  className="rounded-full h-[36px] px-4 text-[13px]"
>
  Reject
</Button>
```

- [ ] **Step 5.6: Add Rejection Notes dialog (before the closing `</div>` of the return)**

```tsx
<Dialog
  open={!!rejectTarget}
  onOpenChange={(open) => {
    if (!open) {
      setRejectTarget(null);
      setRejectionReason('');
    }
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reject Access Request</DialogTitle>
    </DialogHeader>
    <div className="py-2">
      <p style={{ color: 'var(--text-muted)' }} className="text-[13px] mb-3">
        Optionally provide a reason. The reason is stored internally.
      </p>
      <textarea
        value={rejectionReason}
        onChange={(e) => setRejectionReason(e.target.value)}
        placeholder="Reason for rejection (optional)"
        rows={3}
        className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] resize-none"
        style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
      />
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setRejectTarget(null);
          setRejectionReason('');
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={() =>
          rejectTarget && handleAction(rejectTarget, 'reject', undefined, rejectionReason)
        }
        disabled={processing === rejectTarget}
        variant="outline"
        className="rounded-full h-[48px] px-6"
        style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
      >
        Confirm Reject
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5.7: Visual check**

Open `/admin/access-requests`. Verify:
- Each request shows a Role dropdown (admin / manager / operator / viewer)
- Reject opens the dialog with textarea
- Approve still works — passes selected role to the API
- Zero JS console errors

- [ ] **Step 5.8: Commit**

```bash
git add src/app/admin/access-requests/page.tsx
git commit -m "feat(admin-ui): role selection + rejection notes on access requests"
```

---

## Verification

After all tasks:

| Check | How |
|-------|-----|
| Users list loads | `/admin/tenants/<id>` — see Users section with real data |
| Invite sends email | Fill dialog, submit → Supabase Auth dashboard shows pending invite |
| Role change persists | Change role inline → `SELECT role FROM user_tenants WHERE user_id='...'` |
| Remove works | Click Remove → user gone from list and DB |
| Approval uses selected role | Pick "manager" in dropdown, Approve → `user_tenants.role = 'manager'` |
| Rejection reason stored | Reject with text → `SELECT rejection_reason FROM access_requests WHERE status='rejected'` |
