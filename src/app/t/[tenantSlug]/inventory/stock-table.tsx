'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import type { StockLevelRow } from '@/modules/inventory/queries/stock';

interface StockTableProps {
  stockLevels: StockLevelRow[];
  locations: { id: string; name: string; code: string }[];
  commodities: { id: string; name: string; code: string }[];
  activeLocationId?: string;
  activeCommodityId?: string;
}

function StockValue({ value, variant }: { value: number; variant: 'stock' | 'transit' | 'neutral' }) {
  let colorClass = 'text-[var(--text-muted)]';

  if (variant === 'stock') {
    if (value > 0) colorClass = 'text-[var(--green)]';
    else if (value < 0) colorClass = 'text-[var(--red)]';
    else colorClass = 'text-muted-foreground';
  } else if (variant === 'transit') {
    colorClass = value > 0 ? 'text-[var(--accent-color)]' : 'text-muted-foreground';
  }

  return (
    <span className={`font-mono tabular-nums ${colorClass}`}>
      {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  );
}

const columns: ColumnDef<StockLevelRow>[] = [
  {
    id: 'location',
    header: 'Location',
    accessorFn: (row) => row.location?.name ?? 'Unknown',
    cell: ({ row }) => (
      <span className="text-foreground text-sm">
        <span className="font-mono text-[var(--accent-color)] text-xs mr-2">
          {row.original.location?.code ?? '---'}
        </span>
        {row.original.location?.name ?? 'Unknown'}
      </span>
    ),
  },
  {
    id: 'commodity',
    header: 'Item',
    accessorFn: (row) => row.commodity?.name ?? 'Unknown',
    cell: ({ row }) => (
      <span className="text-foreground text-sm">
        <span className="font-mono text-[var(--accent-color)] text-xs mr-2">
          {row.original.commodity?.code ?? '---'}
        </span>
        {row.original.commodity?.name ?? 'Unknown'}
      </span>
    ),
  },
  {
    accessorKey: 'current_stock',
    header: 'Current Stock',
    cell: ({ row }) => (
      <span className="text-right block">
        <StockValue value={row.original.current_stock} variant="stock" />
        <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
          {row.original.unit?.abbreviation ?? ''}
        </span>
      </span>
    ),
  },
  {
    accessorKey: 'in_transit',
    header: 'In Transit',
    cell: ({ row }) => (
      <span className="text-right block">
        <StockValue value={row.original.in_transit} variant="transit" />
        <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
          {row.original.unit?.abbreviation ?? ''}
        </span>
      </span>
    ),
  },
  {
    accessorKey: 'total_in',
    header: 'Total In',
    cell: ({ row }) => (
      <span className="text-right block">
        <StockValue value={row.original.total_in} variant="neutral" />
        <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
          {row.original.unit?.abbreviation ?? ''}
        </span>
      </span>
    ),
  },
  {
    accessorKey: 'total_out',
    header: 'Total Out',
    cell: ({ row }) => (
      <span className="text-right block">
        <StockValue value={row.original.total_out} variant="neutral" />
        <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
          {row.original.unit?.abbreviation ?? ''}
        </span>
      </span>
    ),
  },
];

export function StockTable({
  stockLevels,
  locations,
  commodities,
  activeLocationId,
  activeCommodityId,
}: StockTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <Card className="border-border bg-[var(--bg-off)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Filters
        </span>

        <div className="flex flex-wrap gap-3">
          <select
            value={activeLocationId ?? ''}
            onChange={(e) => updateFilter('locationId', e.target.value)}
            className="h-8 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/50"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} - {loc.name}
              </option>
            ))}
          </select>

          <select
            value={activeCommodityId ?? ''}
            onChange={(e) => updateFilter('commodityId', e.target.value)}
            className="h-8 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/50"
          >
            <option value="">All Items</option>
            {commodities.map((com) => (
              <option key={com.id} value={com.id}>
                {com.code} - {com.name}
              </option>
            ))}
          </select>
        </div>

        {(activeLocationId || activeCommodityId) && (
          <button
            onClick={() => router.push(pathname)}
            className="text-xs font-mono text-[var(--accent-color)] hover:text-[var(--accent-color)] underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={stockLevels}
      />
    </Card>
  );
}
