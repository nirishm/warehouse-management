'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import type { Purchase, PurchaseStatus } from '@/modules/purchase/validations/purchase';

const statusColors: Record<PurchaseStatus, string> = {
  draft: 'bg-muted text-muted-foreground border border-border',
  ordered: 'bg-[var(--accent-tint)] text-[var(--accent-color)] border border-[var(--accent-color)]/20',
  received: 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeTotal(purchase: Purchase): number {
  const items = (purchase.items ?? []) as Array<{
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

interface PurchasesTableProps {
  data: Purchase[];
  tenantSlug: string;
}

export function PurchasesTable({ data, tenantSlug }: PurchasesTableProps) {
  const columns: ColumnDef<Purchase>[] = [
    {
      accessorKey: 'purchase_number',
      header: 'Purchase #',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/purchases/${row.original.id}`}
          className="font-mono text-sm text-[var(--accent-color)] hover:text-[var(--accent-color)]/80 font-medium"
        >
          {row.original.purchase_number}
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
          className={statusColors[row.original.status as PurchaseStatus] ?? statusColors.draft}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessorFn: (row) => row.received_at ?? row.created_at,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground font-mono">
          {formatDate(row.original.received_at ?? row.original.created_at)}
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
      searchKey="purchase_number"
      searchPlaceholder="Search purchases..."
    />
  );
}
