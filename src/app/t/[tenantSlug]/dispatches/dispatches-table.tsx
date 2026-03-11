'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { DispatchWithLocations } from '@/modules/dispatch/validations/dispatch';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  dispatched: 'bg-[var(--accent-tint)] text-[var(--accent-color)] border-[var(--accent-color)]/20',
  in_transit: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue)]/20',
  received: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/20',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DispatchesTableProps {
  data: DispatchWithLocations[];
  tenantSlug: string;
}

export function DispatchesTable({ data, tenantSlug }: DispatchesTableProps) {
  const columns: ColumnDef<DispatchWithLocations>[] = [
    {
      accessorKey: 'dispatch_number',
      header: 'Dispatch #',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/dispatches/${row.original.id}`}
          className="font-mono text-sm text-[var(--accent-color)] font-medium hover:text-[var(--accent-color)] underline-offset-4 hover:underline"
        >
          {row.original.dispatch_number}
        </Link>
      ),
    },
    {
      id: 'route',
      header: 'Origin → Destination',
      accessorFn: (row) =>
        `${row.origin_location?.name ?? 'Unknown'} ${row.dest_location?.name ?? 'Unknown'}`,
      cell: ({ row }) => (
        <span className="text-sm">
          <span className="text-[var(--text-body)]">
            {row.original.origin_location?.name ?? 'Unknown'}
          </span>
          <span className="text-[var(--text-dim)] mx-2">&rarr;</span>
          <span className="text-[var(--text-body)]">
            {row.original.dest_location?.name ?? 'Unknown'}
          </span>
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${statusColors[row.original.status] ?? 'bg-muted text-muted-foreground border-border'}`}
        >
          {statusLabels[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessorFn: (row) => row.dispatched_at ?? row.created_at,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono">
          {formatDate(row.original.dispatched_at ?? row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: 'item_count',
      header: 'Items',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono text-right block">
          {row.original.item_count ?? 0}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="dispatch_number"
      searchPlaceholder="Search dispatches..."
    />
  );
}
