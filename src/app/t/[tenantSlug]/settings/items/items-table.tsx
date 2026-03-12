'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { ItemForm } from './item-form';
import { ItemActions } from './item-actions';

export interface Commodity {
  id: string;
  name: string;
  code: string;
  category: string | null;
  description: string | null;
  default_unit_id: string | null;
  is_active: boolean;
  created_at: string;
}

function getColumns(tenantSlug: string): ColumnDef<Commodity>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--text-body)]">
          {row.getValue('code')}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-bold text-sm text-[var(--text-primary)]">
          {row.getValue('name')}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.getValue('category') ?? '\u2014'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return isActive ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-[var(--green-bg)] text-[var(--green)]">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-[var(--bg-off)] text-[var(--text-dim)]">
            Inactive
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <ItemActions item={row.original} tenantSlug={tenantSlug} />
      ),
    },
  ];
}

interface ItemsTableProps {
  data: Commodity[];
  tenantSlug: string;
}

export function ItemsTable({ data, tenantSlug }: ItemsTableProps) {
  const columns = getColumns(tenantSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-[var(--text-primary)]">Items</h1>
        <ItemForm tenantSlug={tenantSlug} />
      </div>

      <div className="rounded-xl border border-border bg-[var(--bg-base)] overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search items..."
        />
      </div>
    </div>
  );
}
