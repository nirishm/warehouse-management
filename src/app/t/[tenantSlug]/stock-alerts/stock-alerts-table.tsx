'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { AlertBadge } from '@/components/stock-alerts/alert-badge';
import type { StockAlert } from '@/modules/stock-alerts/validations/threshold';

interface StockAlertsTableProps {
  data: StockAlert[];
}

export function StockAlertsTable({ data }: StockAlertsTableProps) {
  const columns: ColumnDef<StockAlert>[] = [
    {
      accessorKey: 'commodity_name',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <p className="text-[var(--text-primary)] font-medium text-sm">
            {row.original.commodity_name}
          </p>
          <p className="text-xs text-[var(--text-dim)] font-mono">
            {row.original.commodity_code}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'location_name',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-body)]">
          {row.original.location_name}
        </span>
      ),
    },
    {
      accessorKey: 'current_stock',
      header: 'Current',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-[var(--text-primary)] text-right block">
          {row.original.current_stock} {row.original.unit_abbreviation}
        </span>
      ),
    },
    {
      accessorKey: 'reorder_point',
      header: 'Reorder',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-[var(--text-muted)] text-right block">
          {row.original.reorder_point}
        </span>
      ),
    },
    {
      accessorKey: 'min_stock',
      header: 'Min',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-[var(--text-muted)] text-right block">
          {row.original.min_stock}
        </span>
      ),
    },
    {
      accessorKey: 'alert_state',
      header: 'Status',
      cell: ({ row }) => (
        <div className="text-right">
          <AlertBadge state={row.original.alert_state} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="commodity_name"
      searchPlaceholder="Search items..."
    />
  );
}
