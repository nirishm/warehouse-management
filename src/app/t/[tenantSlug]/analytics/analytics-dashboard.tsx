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
  draft: 'bg-muted/50 text-[var(--text-muted)] border-border',
  dispatched: 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border-[var(--accent-color)]/30',
  in_transit: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[rgba(37,99,235,0.2)]',
  received: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30',
  cancelled: 'bg-[var(--red)]/15 text-[var(--red)] border-[var(--red)]/30',
  confirmed: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30',
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
  if (pct < 1) return 'text-[var(--green)]';
  if (pct <= 3) return 'text-[var(--accent-color)]';
  return 'text-[var(--red)]';
}

function shortageBarColor(pct: number): string {
  if (pct < 1) return 'bg-[var(--green)]';
  if (pct <= 3) return 'bg-[var(--accent-color)]';
  return 'bg-[var(--red)]';
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
              className="border-border bg-[var(--bg-base)]"
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                  {card.label}
                </CardTitle>
                <Icon className="size-4 text-[var(--text-dim)]" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground font-mono">
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
        <Card className="border-border bg-[var(--bg-base)]">
          <CardHeader>
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
              <BarChart3 className="size-4" />
              Dispatch Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status bars */}
            <div className="space-y-3">
              {dispatches.statusBreakdown.length === 0 ? (
                <p className="text-sm text-[var(--text-dim)] font-mono">
                  No dispatches yet
                </p>
              ) : (
                dispatches.statusBreakdown
                  .sort((a, b) => b.count - a.count)
                  .map((s) => {
                    const widthPct = (s.count / maxStatusCount) * 100;
                    const colorClass =
                      statusColors[s.status] ??
                      'bg-muted/50 text-[var(--text-muted)] border-border';
                    return (
                      <div key={s.status} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-mono font-medium ${colorClass}`}
                          >
                            {statusLabels[s.status] ?? s.status}
                          </span>
                          <span className="text-sm font-mono text-[var(--text-body)]">
                            {s.count}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-[var(--accent-color)]/60 transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Shortage Summary */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                    Overall Shortage
                  </p>
                  <p className="text-sm text-[var(--text-muted)] font-mono">
                    Sent:{' '}
                    <span className="text-foreground">
                      {formatNumber(dispatches.totalSentQuantity)}
                    </span>{' '}
                    | Received:{' '}
                    <span className="text-foreground">
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
                  <p className="text-xs text-[var(--text-dim)] font-mono">shortage</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Routes Table */}
        <Card className="border-border bg-[var(--bg-base)]">
          <CardHeader>
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
              <ArrowRight className="size-4" />
              Top 5 Routes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dispatches.topRoutes.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[var(--text-dim)]">
                <p className="text-sm font-mono">No dispatch routes yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] pl-6">
                      Origin
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                      Destination
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] text-right">
                      Count
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] text-right pr-6">
                      Avg Shortage
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.topRoutes.map((route, idx) => (
                    <TableRow
                      key={idx}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="pl-6 text-sm text-[var(--text-body)] font-mono">
                        {route.originName}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-body)] font-mono">
                        {route.destName}
                      </TableCell>
                      <TableCell className="text-sm text-foreground font-mono text-right font-medium">
                        {route.dispatchCount}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted">
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
      <Card className="border-border bg-[var(--bg-base)]">
        <CardHeader>
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-dim)]">
              <p className="text-sm font-mono">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {movements.map((m) => {
                const Icon = typeIcons[m.type] ?? Package;
                const typeBg =
                  m.type === 'dispatch'
                    ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                    : m.type === 'purchase'
                      ? 'bg-[var(--blue-bg)] text-[var(--blue)]'
                      : 'bg-[var(--green)]/10 text-[var(--green)]';
                const badgeColor =
                  statusColors[m.status] ??
                  'bg-muted/50 text-[var(--text-muted)] border-border';

                return (
                  <div
                    key={`${m.type}-${m.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors"
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
                        <span className="text-sm font-mono font-medium text-foreground">
                          {m.number}
                        </span>
                        <span className="text-xs font-mono text-[var(--text-dim)]">
                          {typeLabels[m.type] ?? m.type}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-dim)] font-mono truncate">
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
                    <span className="text-xs font-mono text-[var(--text-dim)] flex-shrink-0 w-24 text-right">
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
