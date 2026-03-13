'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AccessRequest {
  id: string;
  userId: string;
  email: string;
  status: string;
  tenantId: string | null;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, tenRes] = await Promise.all([
        fetch('/api/v1/admin/access-requests?status=pending'),
        fetch('/api/v1/admin/tenants'),
      ]);
      if (!reqRes.ok || !tenRes.ok) throw new Error('Failed to fetch');
      const reqJson = await reqRes.json();
      const tenJson = await tenRes.json();
      setRequests(reqJson.data);
      setTenants(tenJson.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          role: selectedRoles[requestId] ?? 'viewer',
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 style={{ color: 'var(--text-primary)' }} className="text-[20px] font-bold">
        Access Requests
      </h2>

      {requests.length === 0 ? (
        <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }} className="text-[14px]">
            No pending access requests
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-4 flex items-center justify-between"
            >
              <div>
                <p style={{ color: 'var(--text-primary)' }} className="text-[14px] font-bold">
                  {r.email}
                </p>
                <p style={{ color: 'var(--text-dim)' }} className="text-[12px]">
                  Requested {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRoles[r.id] ?? 'viewer'}
                  onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="border border-[var(--border)] rounded-md px-2 py-1.5 text-[13px]"
                  style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
                >
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="operator">operator</option>
                  <option value="viewer">viewer</option>
                </select>
                {tenants.length > 0 && (
                  <select
                    className="border border-[var(--border)] rounded-md px-3 py-1.5 text-[13px]"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
                    defaultValue={tenants[0]?.id}
                    id={`tenant-${r.id}`}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  onClick={() => {
                    const select = document.getElementById(
                      `tenant-${r.id}`,
                    ) as HTMLSelectElement;
                    handleAction(r.id, 'approve', select?.value);
                  }}
                  disabled={processing === r.id}
                  className="rounded-full h-[36px] px-4 text-[13px]"
                  style={{ backgroundColor: 'var(--green)', color: 'white' }}
                >
                  Approve
                </Button>
                <Button
                  onClick={() => setRejectTarget(r.id)}
                  disabled={processing === r.id}
                  variant="outline"
                  className="rounded-full h-[36px] px-4 text-[13px]"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Notes Dialog */}
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
              Optionally provide a reason for rejection.
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
    </div>
  );
}
