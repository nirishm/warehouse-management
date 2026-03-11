'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import type { Sale, SaleStatus } from '@/modules/sale/validations/sale';

const statusColors: Record<SaleStatus, string> = {
  draft: 'bg-muted/50 text-[var(--text-muted)] border border-border',
  confirmed: 'bg-[var(--blue-bg)] text-[var(--blue)] border border-[var(--blue)]/20',
  dispatched: 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeTotal(sale: Sale): number {
  const items = (sale.items ?? []) as Array<{
    id: string;
    quantity?: number;
    unit_price?: number | null;
  }>;
  return items.reduce((sum, item) => {
    const qty = item.quantity ?? 0;
    const price = item.unit_price ?? 0;
    return sum + qty * price;
  }, 0);
}

interface SalesTableProps {
  data: Sale[];
  tenantSlug: string;
}

export function SalesTable({ data, tenantSlug }: SalesTableProps) {
  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'sale_number',
      header: 'Sale #',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/sales/${row.original.id}`}
          className="font-mono text-sm text-[var(--accent-color)] hover:text-[var(--accent-color)] font-medium"
        >
          {row.original.sale_number}
        </Link>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      accessorFn: (row) => row.location?.name ?? '',
      cell: ({ row }) =>
        row.original.location ? (
          <span className="text-sm text-foreground">
            <span className="font-mono text-[var(--accent-color)] text-xs mr-2">
              {row.original.location.code}
            </span>
            {row.original.location.name}
          </span>
        ) : (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          className={statusColors[row.original.status as SaleStatus] ?? statusColors.draft}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessorFn: (row) => row.sold_at ?? row.created_at,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono">
          {formatDate(row.original.sold_at ?? row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      accessorFn: (row) => (row.items ?? []).length,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-body)] font-mono text-right block">
          {(row.original.items ?? []).length}
        </span>
      ),
    },
    {
      id: 'total_value',
      header: 'Total Value',
      accessorFn: (row) => computeTotal(row),
      cell: ({ row }) => {
        const total = computeTotal(row.original);
        return (
          <span className="text-sm text-[var(--text-body)] font-mono text-right block">
            {total > 0
              ? total.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '--'}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="sale_number"
      searchPlaceholder="Search sales..."
    />
  );
}
