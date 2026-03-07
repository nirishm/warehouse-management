'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StockLevelRow } from '@/modules/inventory/queries/stock';

interface StockTableProps {
  stockLevels: StockLevelRow[];
  locations: { id: string; name: string; code: string }[];
  commodities: { id: string; name: string; code: string }[];
  activeLocationId?: string;
  activeCommodityId?: string;
}

function StockValue({ value, variant }: { value: number; variant: 'stock' | 'transit' | 'neutral' }) {
  let colorClass = 'text-zinc-400';

  if (variant === 'stock') {
    if (value > 0) colorClass = 'text-emerald-400';
    else if (value < 0) colorClass = 'text-red-400';
    else colorClass = 'text-zinc-500';
  } else if (variant === 'transit') {
    colorClass = value > 0 ? 'text-amber-400' : 'text-zinc-500';
  }

  return (
    <span className={`font-mono tabular-nums ${colorClass}`}>
      {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  );
}

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
    <Card className="border-zinc-800 bg-zinc-900/60">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-zinc-800">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Filters
        </span>

        <div className="flex flex-wrap gap-3">
          <select
            value={activeLocationId ?? ''}
            onChange={(e) => updateFilter('locationId', e.target.value)}
            className="h-8 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
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
            className="h-8 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          >
            <option value="">All Commodities</option>
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
            className="text-xs font-mono text-amber-500 hover:text-amber-400 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Location
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Commodity
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
              Current Stock
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
              In Transit
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
              Total In
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
              Total Out
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockLevels.length === 0 ? (
            <TableRow className="border-zinc-800">
              <TableCell
                colSpan={6}
                className="h-24 text-center text-zinc-500 font-mono text-sm"
              >
                No stock data found
              </TableCell>
            </TableRow>
          ) : (
            stockLevels.map((row) => (
              <TableRow
                key={`${row.location_id}-${row.commodity_id}-${row.unit_id}`}
                className="border-zinc-800 hover:bg-zinc-800/50"
              >
                <TableCell className="text-zinc-200 text-sm">
                  <span className="font-mono text-amber-500 text-xs mr-2">
                    {row.location?.code ?? '---'}
                  </span>
                  {row.location?.name ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-zinc-200 text-sm">
                  <span className="font-mono text-amber-500 text-xs mr-2">
                    {row.commodity?.code ?? '---'}
                  </span>
                  {row.commodity?.name ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.current_stock} variant="stock" />
                  <span className="text-zinc-600 text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.in_transit} variant="transit" />
                  <span className="text-zinc-600 text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.total_in} variant="neutral" />
                  <span className="text-zinc-600 text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.total_out} variant="neutral" />
                  <span className="text-zinc-600 text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {stockLevels.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <p className="text-xs font-mono text-zinc-600">
            {stockLevels.length} {stockLevels.length === 1 ? 'row' : 'rows'}
          </p>
        </div>
      )}
    </Card>
  );
}
