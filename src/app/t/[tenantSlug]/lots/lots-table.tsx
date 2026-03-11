'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { LotAgeBadge } from '@/components/lot-tracking/lot-age-badge';
import type { LotWithDetails } from '@/modules/lot-tracking/validations/lot';

interface LotsTableProps {
  data: LotWithDetails[];
  tenantSlug: string;
}

export function LotsTable({ data, tenantSlug }: LotsTableProps) {
  const columns: ColumnDef<LotWithDetails>[] = [
    {
      accessorKey: 'lot_number',
      header: 'Lot #',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/lots/${row.original.id}`}
          className="font-mono text-[var(--accent-color)] hover:text-[var(--accent-color)]/80 text-sm font-medium"
        >
          {row.original.lot_number}
        </Link>
      ),
    },
    {
      id: 'commodity',
      header: 'Item',
      accessorFn: (row) => row.commodity?.name ?? '',
      cell: ({ row }) =>
        row.original.commodity ? (
          <span className="text-sm text-[var(--text-body)]">
            <span className="font-mono text-xs text-[var(--text-dim)] mr-2">
              {row.original.commodity.code}
            </span>
            {row.original.commodity.name}
          </span>
        ) : (
          <span className="text-sm text-[var(--text-dim)]">--</span>
        ),
    },
    {
      accessorKey: 'received_date',
      header: 'Received',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono">
          {new Date(row.original.received_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          <LotAgeBadge receivedDate={row.original.received_date} className="ml-2" />
        </span>
      ),
    },
    {
      accessorKey: 'expiry_date',
      header: 'Expiry',
      cell: ({ row }) => {
        const lot = row.original;
        if (!lot.expiry_date) {
          return <span className="text-sm font-mono text-[var(--text-dim)]">--</span>;
        }
        const expiry = new Date(lot.expiry_date);
        const colorClass =
          expiry < new Date()
            ? 'text-[var(--red)]'
            : expiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ? 'text-[var(--accent-color)]'
            : 'text-[var(--text-muted)]';
        return (
          <span className={`text-sm font-mono ${colorClass}`}>
            {expiry.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        );
      },
    },
    {
      accessorKey: 'initial_quantity',
      header: 'Initial Qty',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono text-right block">
          {row.original.initial_quantity}
        </span>
      ),
    },
    {
      accessorKey: 'current_quantity',
      header: 'Current Qty',
      cell: ({ row }) => (
        <span
          className={`text-sm font-mono text-right block ${
            row.original.current_quantity <= 0
              ? 'text-[var(--text-dim)]'
              : 'text-[var(--text-body)]'
          }`}
        >
          {row.original.current_quantity}
        </span>
      ),
    },
    {
      id: 'unit',
      header: 'Unit',
      accessorFn: (row) => row.unit?.abbreviation ?? row.unit?.name ?? '',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)] font-mono text-right block">
          {row.original.unit?.abbreviation ?? row.original.unit?.name ?? '--'}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="lot_number"
      searchPlaceholder="Search lots..."
    />
  );
}
