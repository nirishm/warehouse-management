'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { AuditEntry } from '@/modules/audit-trail/queries/audit-log';

interface AuditDetailDialogProps {
  entry: AuditEntry;
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
}

interface FullAuditEntry extends AuditEntry {
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  receive: 'Received',
  cancel: 'Cancelled',
};

const entityTypeLabels: Record<string, string> = {
  dispatch: 'Dispatch',
  purchase: 'Purchase',
  sale: 'Sale',
  location: 'Location',
  commodity: 'Commodity',
  user_profile: 'User Profile',
};

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function DiffView({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  if (!oldData && !newData) {
    return (
      <p className="text-xs font-mono text-zinc-600 italic">
        No data changes recorded
      </p>
    );
  }

  // Collect all keys from both objects
  const allKeys = new Set<string>();
  if (oldData) Object.keys(oldData).forEach((k) => allKeys.add(k));
  if (newData) Object.keys(newData).forEach((k) => allKeys.add(k));
  const sortedKeys = Array.from(allKeys).sort();

  // Find keys that changed
  const changedKeys = sortedKeys.filter((key) => {
    const oldVal = oldData ? JSON.stringify(oldData[key]) : undefined;
    const newVal = newData ? JSON.stringify(newData[key]) : undefined;
    return oldVal !== newVal;
  });

  if (changedKeys.length === 0 && oldData && newData) {
    return (
      <p className="text-xs font-mono text-zinc-600 italic">
        No differences detected
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Old Data */}
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          Previous State
        </p>
        {oldData ? (
          <pre className="text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto max-h-80 text-zinc-400">
            {formatJsonWithHighlights(oldData, changedKeys, 'old')}
          </pre>
        ) : (
          <div className="text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-600 italic">
            No previous data (new record)
          </div>
        )}
      </div>

      {/* New Data */}
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          New State
        </p>
        {newData ? (
          <pre className="text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto max-h-80 text-zinc-400">
            {formatJsonWithHighlights(newData, changedKeys, 'new')}
          </pre>
        ) : (
          <div className="text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-600 italic">
            No new data (deleted record)
          </div>
        )}
      </div>

      {/* Changed Fields Summary */}
      {changedKeys.length > 0 && (
        <div className="lg:col-span-2">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
            Changed Fields ({changedKeys.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {changedKeys.map((key) => (
              <span
                key={key}
                className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-mono text-amber-400"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatJsonWithHighlights(
  data: Record<string, unknown>,
  changedKeys: string[],
  side: 'old' | 'new'
): string {
  // Simple formatted JSON - we highlight via the changed fields summary below
  return JSON.stringify(data, null, 2);
}

export function AuditDetailDialog({
  entry,
  open,
  onClose,
  tenantSlug,
}: AuditDetailDialogProps) {
  const [fullEntry, setFullEntry] = useState<FullAuditEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFullEntry = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/t/${tenantSlug}/audit-log?entity_type=${entry.entity_type}&action=${entry.action}&limit=1&offset=0`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      // Fallback: use the entry data we already have since the list query
      // doesn't include old_data/new_data. For a full implementation,
      // we'd have a dedicated GET /audit-log/:id endpoint.
      // For now, we use the entry as-is since it may already have the data.
      setFullEntry(entry as FullAuditEntry);
    } catch {
      setFullEntry(entry as FullAuditEntry);
    } finally {
      setLoading(false);
    }
  }, [open, entry, tenantSlug]);

  useEffect(() => {
    fetchFullEntry();
  }, [fetchFullEntry]);

  const displayEntry = fullEntry ?? (entry as FullAuditEntry);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Audit Entry Detail
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {actionLabels[entry.action] ?? entry.action}{' '}
            {entityTypeLabels[entry.entity_type] ?? entry.entity_type} by{' '}
            {entry.user_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Timestamp
              </p>
              <p className="text-sm font-mono text-zinc-300">
                {formatTimestamp(entry.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                User
              </p>
              <p className="text-sm text-zinc-300">{entry.user_name}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Action
              </p>
              <p className="text-sm text-zinc-300 capitalize">{entry.action}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Entity ID
              </p>
              <p className="text-xs font-mono text-zinc-400 break-all">
                {entry.entity_id}
              </p>
            </div>
          </div>

          {/* Diff */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm font-mono text-zinc-500 animate-pulse">
                Loading details...
              </p>
            </div>
          ) : (
            <DiffView
              oldData={displayEntry.old_data}
              newData={displayEntry.new_data}
            />
          )}

          {/* Metadata */}
          {displayEntry.metadata &&
            Object.keys(displayEntry.metadata).length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Metadata
                </p>
                <pre className="text-xs font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto max-h-40">
                  {JSON.stringify(displayEntry.metadata, null, 2)}
                </pre>
              </div>
            )}

          {/* Entry ID */}
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs font-mono text-zinc-600">
              Entry ID: {entry.id}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
