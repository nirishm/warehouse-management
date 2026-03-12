'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  enabledModules: string[] | null;
  createdAt: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/tenants');
      if (!res.ok) throw new Error('Failed to fetch tenants');
      const json = await res.json();
      setTenants(json.data);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold">
          Tenants
        </h2>
        <Button
          onClick={() => (window.location.href = '/admin/tenants/new')}
          className="rounded-full h-[48px] px-6"
          style={{ background: 'var(--accent-color)', color: 'white' }}
        >
          New Tenant
        </Button>
      </div>

      <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th
                className="text-left p-4 text-[12px] font-bold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Name
              </th>
              <th
                className="text-left p-4 text-[12px] font-bold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Slug
              </th>
              <th
                className="text-left p-4 text-[12px] font-bold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Status
              </th>
              <th
                className="text-left p-4 text-[12px] font-bold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Plan
              </th>
              <th
                className="text-left p-4 text-[12px] font-bold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Created
              </th>
              <th
                className="text-left p-4 text-[12px] font-bold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                <td
                  className="p-4 text-[14px] font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t.name}
                </td>
                <td className="p-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {t.slug}
                </td>
                <td className="p-4">
                  <Badge variant={t.status === 'active' ? 'active' : 'outline'}>
                    {t.status}
                  </Badge>
                </td>
                <td className="p-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {t.plan}
                </td>
                <td className="p-4 text-[13px]" style={{ color: 'var(--text-dim)' }}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <a
                    href={`/admin/tenants/${t.id}`}
                    className="text-[13px] hover:underline"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    Manage
                  </a>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-[14px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No tenants yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
