'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { AuditDetailDialog } from './audit-detail-dialog';
import type { AuditEntry } from '@/modules/audit-trail/queries/audit-log';

const ENTITY_TYPES = [
  'dispatch',
  'purchase',
  'sale',
  'location',
  'commodity',
  'user_profile',
] as const;

const ACTIONS = ['create', 'update', 'delete', 'receive', 'cancel'] as const;

const actionBadgeColors: Record<string, string> = {
  create: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30',
  update: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30',
  delete: 'bg-[var(--red)]/15 text-[var(--red)] border-[var(--red)]/30',
  receive: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  cancel: 'bg-muted/50 text-[var(--text-muted)] border-border',
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

function truncateUuid(uuid: string): string {
  return uuid.length > 8 ? `${uuid.slice(0, 8)}...` : uuid;
}

function summarizeChanges(
  entry: AuditEntry
): string {
  if (entry.action === 'create') return 'Created new record';
  if (entry.action === 'delete') return 'Deleted record';
  if (entry.action === 'cancel') return 'Cancelled record';
  if (entry.action === 'receive') return 'Received';

  const meta = entry.metadata as Record<string, unknown> | null;
  if (meta?.summary && typeof meta.summary === 'string') return meta.summary;

  return 'Updated record';
}

interface AuditTableProps {
  entries: AuditEntry[];
  totalCount: number;
  limit: number;
  offset: number;
  tenantSlug: string;
  filters: {
    entity_type?: string;
    action?: string;
    from?: string;
    to?: string;
  };
  users: { id: string; name: string }[];
}

export function AuditTable({
  entries,
  totalCount,
  limit,
  offset,
  tenantSlug,
  filters,
  users,
}: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogEntry, setDialogEntry] = useState<AuditEntry | null>(null);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const merged = { ...filters, limit: String(limit), offset: String(offset), ...overrides };
      Object.entries(merged).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      return `${pathname}?${params.toString()}`;
    },
    [filters, limit, offset, pathname]
  );

  const updateFilter = useCallback(
    (key: string, value: string) => {
      router.push(buildUrl({ [key]: value || undefined, offset: '0' }));
    },
    [router, buildUrl]
  );

  const goToPage = useCallback(
    (newOffset: number) => {
      router.push(buildUrl({ offset: String(newOffset) }));
    },
    [router, buildUrl]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const hasActiveFilters = filters.entity_type || filters.action || filters.from || filters.to;

  return (
    <>
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground0">
            Activity Log ({totalCount})
          </CardTitle>
        </CardHeader>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b border-border">
          <span className="text-xs font-mono uppercase tracking-wider text-foreground0">
            Filters
          </span>

          <div className="flex flex-wrap gap-3">
            <select
              value={filters.entity_type ?? ''}
              onChange={(e) => updateFilter('entity_type', e.target.value)}
              className="h-8 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
            >
              <option value="">All Entity Types</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {entityTypeLabels[type] ?? type}
                </option>
              ))}
            </select>

            <select
              value={filters.action ?? ''}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="h-8 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
            >
              <option value="">All Actions</option>
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => updateFilter('from', e.target.value)}
              placeholder="From"
              className="h-8 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
            />

            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => updateFilter('to', e.target.value)}
              placeholder="To"
              className="h-8 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-mono text-[var(--accent)] hover:text-[var(--accent)] underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-foreground0">
              <p className="text-sm font-mono">No audit entries found</p>
              <p className="text-xs mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0 pl-6 w-8" />
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
                    User
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
                    Action
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
                    Entity Type
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
                    Entity ID
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0 pr-6">
                    Changes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRowExpandable
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedId === entry.id}
                    onToggle={() =>
                      setExpandedId(expandedId === entry.id ? null : entry.id)
                    }
                    onViewDetail={() => setDialogEntry(entry)}
                    tenantSlug={tenantSlug}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <p className="text-xs font-mono text-[var(--text-dim)]">
              Showing {offset + 1}-{Math.min(offset + limit, totalCount)} of{' '}
              {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => goToPage(Math.max(0, offset - limit))}
                className="h-7 border-border bg-muted text-[var(--text-body)] hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-mono text-foreground0">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= totalCount}
                onClick={() => goToPage(offset + limit)}
                className="h-7 border-border bg-muted text-[var(--text-body)] hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {dialogEntry && (
        <AuditDetailDialog
          entry={dialogEntry}
          open={!!dialogEntry}
          onClose={() => setDialogEntry(null)}
          tenantSlug={tenantSlug}
        />
      )}
    </>
  );
}

function TableRowExpandable({
  entry,
  isExpanded,
  onToggle,
  onViewDetail,
  tenantSlug,
}: {
  entry: AuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
  tenantSlug: string;
}) {
  return (
    <>
      <TableRow
        className="border-border hover:bg-muted/50 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell className="pl-6 w-8">
          {isExpanded ? (
            <ChevronUp className="size-4 text-foreground0" />
          ) : (
            <ChevronDown className="size-4 text-foreground0" />
          )}
        </TableCell>
        <TableCell className="text-sm text-[var(--text-muted)] font-mono">
          {formatTimestamp(entry.created_at)}
        </TableCell>
        <TableCell className="text-sm text-foreground">
          {entry.user_name}
        </TableCell>
        <TableCell>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${
              actionBadgeColors[entry.action] ??
              'bg-muted/50 text-[var(--text-muted)] border-border'
            }`}
          >
            {entry.action}
          </span>
        </TableCell>
        <TableCell className="text-sm text-[var(--text-body)]">
          {entityTypeLabels[entry.entity_type] ?? entry.entity_type}
        </TableCell>
        <TableCell className="font-mono text-xs text-foreground0" title={entry.entity_id}>
          {truncateUuid(entry.entity_id)}
        </TableCell>
        <TableCell className="text-sm text-[var(--text-muted)] pr-6">
          {summarizeChanges(entry)}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="border-border bg-[var(--bg-off)]">
          <TableCell colSpan={7} className="px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-foreground0">
                  Change Detail
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail();
                  }}
                  className="text-xs font-mono text-[var(--accent)] hover:text-[var(--accent)] underline underline-offset-2"
                >
                  View full detail
                </button>
              </div>

              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div>
                  <p className="text-xs font-mono text-foreground0 mb-1">Metadata</p>
                  <pre className="text-xs font-mono text-[var(--text-muted)] bg-background border border-border rounded-lg p-3 overflow-x-auto max-h-40">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-xs font-mono text-[var(--text-dim)]">
                Entry ID: {entry.id}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
