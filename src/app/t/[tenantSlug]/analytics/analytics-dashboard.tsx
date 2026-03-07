'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Truck,
  Download,
  Upload,
  Package,
  MapPin,
  Wheat,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import type {
  OverviewStats,
  DispatchAnalytics,
  MovementEntry,
} from '@/modules/analytics/queries/analytics';

// ── Props ──────────────────────────────────────────────────────────

interface AnalyticsDashboardProps {
  overview: OverviewStats;
  dispatches: DispatchAnalytics;
  movements: MovementEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatPercent(n: number): string {
  return n.toFixed(1) + '%';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  dispatched: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_transit: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  received: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  received: 'Received',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
};

function shortageColorClass(pct: number): string {
  if (pct < 1) return 'text-emerald-400';
  if (pct <= 3) return 'text-amber-400';
  return 'text-red-400';
}

function shortageBarColor(pct: number): string {
  if (pct < 1) return 'bg-emerald-500';
  if (pct <= 3) return 'bg-amber-500';
  return 'bg-red-500';
}

const typeIcons: Record<string, typeof Truck> = {
  dispatch: Truck,
  purchase: Download,
  sale: Upload,
};

const typeLabels: Record<string, string> = {
  dispatch: 'Dispatch',
  purchase: 'Purchase',
  sale: 'Sale',
};

// ── Component ──────────────────────────────────────────────────────

export function AnalyticsDashboard({
  overview,
  dispatches,
  movements,
}: AnalyticsDashboardProps) {
  const overviewCards = [
    {
      label: 'Total Dispatches',
      value: overview.totalDispatches,
      icon: Truck,
    },
    {
      label: 'Total Purchases',
      value: overview.totalPurchases,
      icon: Download,
    },
    {
      label: 'Total Sales',
      value: overview.totalSales,
      icon: Upload,
    },
    {
      label: 'Stock Items',
      value: overview.totalStockItems,
      icon: Package,
    },
    {
      label: 'Active Locations',
      value: overview.activeLocations,
      icon: MapPin,
    },
    {
      label: 'Active Commodities',
      value: overview.activeCommodities,
      icon: Wheat,
    },
  ];

  // Compute max status count for bar widths
  const maxStatusCount = Math.max(
    ...dispatches.statusBreakdown.map((s) => s.count),
    1
  );

  return (
    <div className="space-y-6">
      {/* ── Overview Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-zinc-800 bg-zinc-900/60"
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  {card.label}
                </CardTitle>
                <Icon className="size-4 text-zinc-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-zinc-100 font-mono">
                  {formatNumber(card.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Dispatch Performance ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown + Shortage */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <BarChart3 className="size-4" />
              Dispatch Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status bars */}
            <div className="space-y-3">
              {dispatches.statusBreakdown.length === 0 ? (
                <p className="text-sm text-zinc-500 font-mono">
                  No dispatches yet
                </p>
              ) : (
                dispatches.statusBreakdown
                  .sort((a, b) => b.count - a.count)
                  .map((s) => {
                    const widthPct = (s.count / maxStatusCount) * 100;
                    const colorClass =
                      statusColors[s.status] ??
                      'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
                    return (
                      <div key={s.status} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${colorClass}`}
                          >
                            {statusLabels[s.status] ?? s.status}
                          </span>
                          <span className="text-sm font-mono text-zinc-300">
                            {s.count}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-800">
                          <div
                            className="h-2 rounded-full bg-amber-500/60 transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Shortage Summary */}
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Overall Shortage
                  </p>
                  <p className="text-sm text-zinc-400 font-mono">
                    Sent:{' '}
                    <span className="text-zinc-200">
                      {formatNumber(dispatches.totalSentQuantity)}
                    </span>{' '}
                    | Received:{' '}
                    <span className="text-zinc-200">
                      {formatNumber(dispatches.totalReceivedQuantity)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-3xl font-bold font-mono ${shortageColorClass(dispatches.overallShortagePercent)}`}
                  >
                    {formatPercent(dispatches.overallShortagePercent)}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">shortage</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Routes Table */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <ArrowRight className="size-4" />
              Top 5 Routes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dispatches.topRoutes.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-zinc-500">
                <p className="text-sm font-mono">No dispatch routes yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                      Origin
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                      Destination
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
                      Count
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                      Avg Shortage
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.topRoutes.map((route, idx) => (
                    <TableRow
                      key={idx}
                      className="border-zinc-800/60 hover:bg-zinc-800/30"
                    >
                      <TableCell className="pl-6 text-sm text-zinc-300 font-mono">
                        {route.originName}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-300 font-mono">
                        {route.destName}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-200 font-mono text-right font-medium">
                        {route.dispatchCount}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-zinc-800">
                            <div
                              className={`h-2 rounded-full ${shortageBarColor(route.avgShortagePercent)} transition-all`}
                              style={{
                                width: `${Math.min(route.avgShortagePercent * 10, 100)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-sm font-mono font-medium ${shortageColorClass(route.avgShortagePercent)}`}
                          >
                            {formatPercent(route.avgShortagePercent)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity ─────────────────────────────────────── */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <p className="text-sm font-mono">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {movements.map((m) => {
                const Icon = typeIcons[m.type] ?? Package;
                const typeBg =
                  m.type === 'dispatch'
                    ? 'bg-amber-500/10 text-amber-500'
                    : m.type === 'purchase'
                      ? 'bg-sky-500/10 text-sky-500'
                      : 'bg-emerald-500/10 text-emerald-500';
                const badgeColor =
                  statusColors[m.status] ??
                  'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';

                return (
                  <div
                    key={`${m.type}-${m.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/20 transition-colors"
                  >
                    {/* Type icon */}
                    <div
                      className={`flex-shrink-0 size-9 rounded-lg flex items-center justify-center ${typeBg}`}
                    >
                      <Icon className="size-4" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-zinc-200">
                          {m.number}
                        </span>
                        <span className="text-xs font-mono text-zinc-600">
                          {typeLabels[m.type] ?? m.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono truncate">
                        {m.description}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium flex-shrink-0 ${badgeColor}`}
                    >
                      {statusLabels[m.status] ?? m.status}
                    </span>

                    {/* Date */}
                    <span className="text-xs font-mono text-zinc-500 flex-shrink-0 w-24 text-right">
                      {formatDate(m.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
