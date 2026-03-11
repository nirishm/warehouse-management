'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { Payment } from '@/modules/payments/validations/payment';

interface PaymentsTableProps {
  data: Payment[];
  tenantSlug: string;
}

export function PaymentsTable({ data, tenantSlug }: PaymentsTableProps) {
  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'payment_number',
      header: 'Payment #',
      cell: ({ row }) => (
        <span className="font-mono text-[var(--accent-color)] text-xs">
          {row.original.payment_number}
        </span>
      ),
    },
    {
      accessorKey: 'transaction_type',
      header: 'Type',
      cell: ({ row }) => (
        <Link
          href={`/t/${tenantSlug}/${row.original.transaction_type}s/${row.original.transaction_id}`}
          className="text-xs text-[var(--text-body)] hover:text-[var(--accent-color)] capitalize"
        >
          {row.original.transaction_type}
        </Link>
      ),
    },
    {
      accessorKey: 'payment_method',
      header: 'Method',
      cell: ({ row }) => (
        <span className="text-xs text-[var(--text-muted)] capitalize">
          {row.original.payment_method.replace('_', ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'reference_number',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="text-xs text-[var(--text-dim)]">
          {row.original.reference_number ?? '--'}
        </span>
      ),
    },
    {
      accessorKey: 'payment_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-xs text-[var(--text-muted)]">
          {new Date(row.original.payment_date).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-[var(--text-body)] font-semibold text-sm text-right block">
          {'\u20B9'}{Number(row.original.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="payment_number"
      searchPlaceholder="Search payments..."
    />
  );
}
