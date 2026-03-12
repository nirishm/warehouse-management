'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { AdjustmentWithRelations } from '@/modules/adjustments/validations/adjustment';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface AdjustmentsTableProps {
  data: AdjustmentWithRelations[];
  tenantSlug: string;
}

export function AdjustmentsTable({ data, tenantSlug }: AdjustmentsTableProps) {
  const columns: ColumnDef<AdjustmentWithRelations>[] = [
    {
      accessorKey: 'adjustment_number',
      header: 'Adjustment #',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--accent-color)] font-medium">
          {row.original.adjustment_number}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessorFn: (row) => row.created_at,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      accessorFn: (row) => row.location?.name ?? '',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-body)]">
          {row.original.location?.name ?? 'Unknown'}
        </span>
      ),
    },
    {
      id: 'item',
      header: 'Item',
      accessorFn: (row) => row.commodity?.name ?? '',
      cell: ({ row }) => (
        <span className="text-sm">
          <span className="font-mono text-[var(--accent-color)] mr-2">
            {row.original.commodity?.code ?? ''}
          </span>
          <span className="text-[var(--text-body)]">
            {row.original.commodity?.name ?? 'Unknown'}
          </span>
        </span>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      accessorFn: (row) => row.reason?.name ?? '',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-body)]">
          {row.original.reason?.name ?? 'Unknown'}
        </span>
      ),
    },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const direction = row.original.reason?.direction;
        const sign = direction === 'add' ? '+' : '-';
        const colorClass =
          direction === 'add'
            ? 'text-[var(--green)]'
            : 'text-[var(--red)]';
        return (
          <span className={`text-sm font-mono font-medium ${colorClass}`}>
            {sign}{row.original.quantity} {row.original.unit?.abbreviation ?? ''}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="adjustment_number"
      searchPlaceholder="Search adjustments..."
    />
  );
}
