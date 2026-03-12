'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  user_id: string;
  email: string;
  role: string;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
}

const roleColors: Record<string, string> = {
  tenant_admin: 'bg-[var(--accent-tint)] text-[var(--accent-color)]',
  manager: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  employee: 'bg-muted/50 text-[var(--text-muted)]',
};

const roleLabels: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

function countTruePermissions(permissions: Record<string, boolean> | null): number {
  if (!permissions) return 0;
  return Object.values(permissions).filter(Boolean).length;
}

function buildColumns(tenantSlug: string): ColumnDef<UserRow, unknown>[] {
  return [
    {
      accessorKey: 'display_name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-bold text-sm text-foreground">
          {row.original.display_name || row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${roleColors[role] ?? roleColors.employee}`}
          >
            {roleLabels[role] ?? role}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <Badge
            className={`rounded-full text-xs font-bold ${
              active
                ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30'
                : 'bg-muted text-[var(--text-muted)] border border-border'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'permissions_count',
      header: 'Permissions',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.original.role === 'tenant_admin'
            ? 'All (Admin)'
            : `${countTruePermissions(row.original.permissions)} / 18`}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/settings/users/${row.original.user_id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-[var(--text-body)] hover:bg-[var(--bg-off)] transition-colors"
        >
          <Pencil size={12} />
          Edit
        </Link>
      ),
    },
  ];
}

export function UsersTable({ tenantSlug }: { tenantSlug: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/users`);
      if (res.status === 403) {
        setError('User Management module is not enabled for this tenant.');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to invite user');
      }
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const columns = buildColumns(tenantSlug);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Users
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Manage user permissions, roles, and location assignments
          </p>
        </div>
      </div>

      {/* Invite form */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
        <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)] shrink-0">
          Invite User
        </label>
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="user@example.com"
          className="h-9 flex-1 rounded-lg border border-border bg-[var(--bg-base)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInvite();
          }}
        />
        <Button
          variant="orange"
          onClick={handleInvite}
          disabled={inviting || !inviteEmail.trim()}
        >
          {inviting ? 'Inviting...' : 'Invite'}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="rounded-xl border border-border bg-white">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border px-6 py-4 last:border-b-0"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-off)]" />
                <div className="h-4 w-48 animate-pulse rounded bg-[var(--bg-off)]" />
                <div className="h-5 w-16 animate-pulse rounded bg-[var(--bg-off)]" />
                <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--bg-off)]" />
                <div className="h-4 w-12 animate-pulse rounded bg-[var(--bg-off)]" />
                <div className="ml-auto h-7 w-16 animate-pulse rounded bg-[var(--bg-off)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <DataTable
            columns={columns}
            data={users}
            searchKey="email"
            searchPlaceholder="Search by email..."
          />
        </div>
      )}
    </div>
  );
}
