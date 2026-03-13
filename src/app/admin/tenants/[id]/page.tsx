'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/admin/tenants/${id}`);
      if (!res.ok) throw new Error('Failed to fetch tenant');
      setTenant(await res.json());
    } catch {
      toast.error('Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

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
    } catch {
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
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
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
    </div>
  );
}
