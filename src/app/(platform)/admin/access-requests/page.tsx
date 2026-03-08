'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface AccessRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  notes: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-[var(--accent-tint)] text-[var(--accent-color)] border-[var(--accent-color)]/20',
  approved: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  rejected: 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/20',
};

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [approveForm, setApproveForm] = useState<{ id: string; tenantId: string; role: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [reqRes, tenRes] = await Promise.all([
      fetch('/api/admin/access-requests'),
      fetch('/api/admin/tenants'),
    ]);
    const reqData = await reqRes.json();
    const tenData = await tenRes.json();
    setRequests(reqData.data ?? []);
    setTenants(tenData.tenants ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleApprove() {
    if (!approveForm) return;
    setActionError('');
    setActionId(approveForm.id);
    try {
      const res = await fetch(`/api/admin/access-requests/${approveForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          tenantId: approveForm.tenantId,
          role: approveForm.role,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || 'Failed to approve request');
        return;
      }
    } catch {
      setActionError('Network error');
      return;
    } finally {
      setApproveForm(null);
      setActionId(null);
    }
    fetchData();
  }

  async function handleReject(id: string) {
    setActionError('');
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/access-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || 'Failed to reject request');
        return;
      }
    } catch {
      setActionError('Network error');
      return;
    } finally {
      setActionId(null);
    }
    fetchData();
  }

  const activeTenants = tenants.filter(t => t.status === 'active');

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">Access Requests</h1>
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">Access Requests</h1>

      {actionError && (
        <div className="rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
          {actionError}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id} className="border-border hover:bg-muted/50">
                <TableCell className="text-foreground font-medium">{req.email}</TableCell>
                <TableCell className="text-[var(--text-muted)]">{req.full_name || '—'}</TableCell>
                <TableCell className="text-[var(--text-muted)] text-sm">
                  {new Date(req.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge className={`rounded-full border text-xs font-medium px-2.5 py-0.5 ${statusColors[req.status] || ''}`}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      {approveForm?.id === req.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={approveForm.tenantId}
                            onChange={(e) => setApproveForm({ ...approveForm, tenantId: e.target.value })}
                            className="h-8 text-xs border border-border rounded px-2 bg-white text-foreground"
                          >
                            <option value="">Select tenant...</option>
                            {activeTenants.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <select
                            value={approveForm.role}
                            onChange={(e) => setApproveForm({ ...approveForm, role: e.target.value })}
                            className="h-8 text-xs border border-border rounded px-2 bg-white text-foreground"
                          >
                            <option value="employee">Employee</option>
                            <option value="tenant_admin">Admin</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={handleApprove}
                            disabled={!approveForm.tenantId || actionId === req.id}
                            className="h-7 text-xs bg-[var(--green)] hover:bg-[var(--green)]/90 text-white"
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setApproveForm(null)}
                            className="h-7 text-xs text-[var(--text-muted)]"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setApproveForm({ id: req.id, tenantId: '', role: 'employee' })}
                            className="h-7 text-xs text-[var(--green)] hover:text-[var(--green)] hover:bg-[var(--green-bg)]"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(req.id)}
                            disabled={actionId === req.id}
                            className="h-7 text-xs text-[var(--red)] hover:text-[var(--red)] hover:bg-[var(--red-bg)]"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!requests.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No access requests yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
