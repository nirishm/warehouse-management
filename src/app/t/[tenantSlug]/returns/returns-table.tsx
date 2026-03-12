'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import type { ReturnWithItems, ReturnStatus, ReturnType } from '@/modules/returns/validations/return';

const statusColors: Record<ReturnStatus, string> = {
  draft: 'bg-[var(--bg-off)] text-[var(--text-muted)] border border-[var(--border)]',
  confirmed: 'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(22,163,74,0.2)]',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(220,38,38,0.2)]',
};

const typeLabels: Record<ReturnType, string> = {
  purchase_return: 'Purchase Return',
  sale_return: 'Sale Return',
};

interface ReturnsTableProps {
  data: ReturnWithItems[];
  tenantSlug: string;
}

export function ReturnsTable({ data, tenantSlug }: ReturnsTableProps) {
  const columns: ColumnDef<ReturnWithItems>[] = [
    {
      accessorKey: 'return_number',
      header: 'Return #',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/returns/${row.original.id}`}
          className="font-mono text-[var(--accent-color)] hover:text-[var(--accent-color)]/80 text-sm font-medium"
        >
          {row.original.return_number}
        </Link>
      ),
    },
    {
      accessorKey: 'return_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)]">
          {typeLabels[row.original.return_type]}
        </span>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      accessorFn: (row) => row.location?.name ?? '',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-body)]">
          {row.original.location?.name ?? '--'}
        </span>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      accessorFn: (row) => row.contact?.name ?? '',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.original.contact?.name ?? '--'}
        </span>
      ),
    },
    {
      accessorKey: 'return_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono">
          {new Date(row.original.return_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status]}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="return_number"
      searchPlaceholder="Search returns..."
    />
  );
}
