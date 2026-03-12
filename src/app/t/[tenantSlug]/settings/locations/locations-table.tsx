'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { LocationForm } from './location-form';
import { LocationActions } from './location-actions';

interface Location {
  id: string;
  name: string;
  code: string;
  type: 'warehouse' | 'store' | 'yard' | 'external';
  address: string | null;
  is_active: boolean;
  created_at: string;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  warehouse: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  store: 'bg-[var(--green-bg)] text-[var(--green)]',
  yard: 'bg-[var(--orange-bg)] text-[var(--accent-color)]',
  external: 'bg-muted text-[var(--text-muted)]',
};

interface LocationsTableProps {
  data: Location[];
  tenantSlug: string;
}

export function LocationsTable({ data, tenantSlug }: LocationsTableProps) {
  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-bold text-sm">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type;
        const styles = TYPE_BADGE_STYLES[type] ?? 'bg-muted text-[var(--text-muted)]';
        return (
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${styles}`}>
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
              active
                ? 'bg-[var(--green-bg)] text-[var(--green)]'
                : 'bg-muted text-[var(--text-muted)]'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => (
        <LocationActions location={row.original} tenantSlug={tenantSlug} />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Locations
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Manage warehouses, stores, yards, and external locations
          </p>
        </div>
        <LocationForm tenantSlug={tenantSlug} />
      </div>

      <div className="rounded-xl border border-border bg-white">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search locations..."
        />
      </div>
    </div>
  );
}
