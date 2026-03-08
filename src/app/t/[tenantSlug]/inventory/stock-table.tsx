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
            className="text-xs font-mono text-[var(--accent-color)] hover:text-[var(--accent-color)] underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Location
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Commodity
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
              Current Stock
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
              In Transit
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
              Total In
            </TableHead>
            <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
              Total Out
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockLevels.length === 0 ? (
            <TableRow className="border-border">
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground font-mono text-sm"
              >
                No stock data found
              </TableCell>
            </TableRow>
          ) : (
            stockLevels.map((row) => (
              <TableRow
                key={`${row.location_id}-${row.commodity_id}-${row.unit_id}`}
                className="border-border hover:bg-muted/50"
              >
                <TableCell className="text-foreground text-sm">
                  <span className="font-mono text-[var(--accent-color)] text-xs mr-2">
                    {row.location?.code ?? '---'}
                  </span>
                  {row.location?.name ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-foreground text-sm">
                  <span className="font-mono text-[var(--accent-color)] text-xs mr-2">
                    {row.commodity?.code ?? '---'}
                  </span>
                  {row.commodity?.name ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.current_stock} variant="stock" />
                  <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.in_transit} variant="transit" />
                  <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.total_in} variant="neutral" />
                  <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <StockValue value={row.total_out} variant="neutral" />
                  <span className="text-[var(--text-dim)] text-xs font-mono ml-1">
                    {row.unit?.abbreviation ?? ''}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {stockLevels.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs font-mono text-[var(--text-dim)]">
            {stockLevels.length} {stockLevels.length === 1 ? 'row' : 'rows'}
          </p>
        </div>
      )}
    </Card>
  );
}
