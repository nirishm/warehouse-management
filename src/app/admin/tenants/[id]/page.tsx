'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  enabledModules: string[] | null;
  settings: Record<string, unknown> | null;
  userCount: number;
  createdAt: string;
}

interface TenantUser {
  userId: string;
  role: string;
  email: string | null;
  displayName: string | null;
}

const ALL_MODULES = [
  'inventory',
  'purchase',
  'sale',
  'transfer',
  'adjustments',
  'user-management',
  'audit-trail',
  'stock-alerts',
  'analytics',
  'shortage-tracking',
  'payments',
];

export default function TenantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/admin/tenants/${id}`);
      if (!res.ok) throw new Error('Failed to fetch tenant');
      setTenant(await res.json());
    } catch (err) {
      console.error('[admin/tenant] fetch failed:', err);
      toast.error('Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    fetchTenant();
    fetchUsers();
  }, [fetchTenant, fetchUsers]);

  const toggleModule = async (mod: string) => {
    if (!tenant) return;
    const current = tenant.enabledModules ?? [];
    const updated = current.includes(mod)
      ? current.filter((m) => m !== mod)
      : [...current, mod];

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledModules: updated }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setTenant({ ...tenant, enabledModules: updated });
      toast.success('Modules updated');
    } catch (err) {
      console.error('[admin/tenant] module toggle failed:', err);
      toast.error('Failed to update modules');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (newStatus: string) => {
    if (!tenant) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setTenant({ ...tenant, status: newStatus });
      toast.success(`Tenant ${newStatus}`);
    } catch (err) {
      console.error('[admin/tenant] status toggle failed:', err);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

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
      const res = await fetch(`/api/v1/admin/tenants/${id}/users/${userId}`, {
        method: 'DELETE',
      });
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return <p style={{ color: 'var(--text-muted)' }}>Tenant not found</p>;
  }

  const modules = tenant.enabledModules ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold">
            {tenant.name}
          </h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-[13px]">
            {tenant.slug} &middot; {tenant.userCount} users &middot; {tenant.plan} plan
          </p>
        </div>
        <Badge variant={tenant.status === 'active' ? 'active' : 'outline'}>
          {tenant.status}
        </Badge>
      </div>

      {/* Status Actions */}
      <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5">
        <h3 style={{ color: 'var(--text-primary)' }} className="text-[15px] font-bold mb-3">
          Status
        </h3>
        <div className="flex gap-3">
          {tenant.status !== 'active' && (
            <Button
              onClick={() => toggleStatus('active')}
              disabled={saving}
              variant="outline"
              className="text-[13px]"
            >
              Activate
            </Button>
          )}
          {tenant.status !== 'suspended' && (
            <Button
              onClick={() => toggleStatus('suspended')}
              disabled={saving}
              variant="outline"
              className="text-[13px]"
            >
              Suspend
            </Button>
          )}
          {tenant.status !== 'archived' && (
            <Button
              onClick={() => toggleStatus('archived')}
              disabled={saving}
              variant="outline"
              className="text-[13px]"
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Module Toggles */}
      <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5">
        <h3 style={{ color: 'var(--text-primary)' }} className="text-[15px] font-bold mb-3">
          Enabled Modules
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ALL_MODULES.map((mod) => (
            <button
              key={mod}
              onClick={() => toggleModule(mod)}
              disabled={saving || mod === 'inventory'}
              className="flex items-center gap-2 p-3 rounded-lg border text-left text-[13px] transition-colors"
              style={{
                borderColor: modules.includes(mod) ? 'var(--accent-color)' : 'var(--border)',
                backgroundColor: modules.includes(mod) ? 'var(--accent-tint)' : 'transparent',
                color: modules.includes(mod) ? 'var(--accent-color)' : 'var(--text-muted)',
                opacity: mod === 'inventory' ? 0.5 : 1,
              }}
            >
              <span className="font-bold">{mod}</span>
              {mod === 'inventory' && <span className="text-[11px]">(required)</span>}
            </button>
          ))}
        </div>
      </div>

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
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
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
    </div>
  );
}
