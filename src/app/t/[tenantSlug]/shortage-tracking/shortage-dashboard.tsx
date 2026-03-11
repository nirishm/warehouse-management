'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  ShortageOverview,
  ShortageByRoute,
  ShortageByTransporter,
  ShortageByCommodity,
  RecentShortageItem,
} from '@/modules/shortage-tracking/queries/shortages';

interface ShortageDashboardProps {
  tenantSlug: string;
  overview: ShortageOverview;
  byRoute: ShortageByRoute[];
  byTransporter: ShortageByTransporter[];
  byCommodity: ShortageByCommodity[];
  recent: RecentShortageItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pctColor(pct: number): string {
  if (pct <= 0) return 'text-[var(--text-muted)]';
  if (pct < 1) return 'text-[var(--green)]';
  if (pct <= 3) return 'text-[var(--accent-color)]';
  return 'text-[var(--red)]';
}

function pctBadgeColor(pct: number): string {
  if (pct <= 0)
    return 'bg-muted/50 text-[var(--text-muted)] border-border';
  if (pct < 1)
    return 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30';
  if (pct <= 3)
    return 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border-[var(--accent-color)]/30';
  return 'bg-[var(--red)]/15 text-[var(--red)] border-[var(--red)]/30';
}

function pctBarColor(pct: number): string {
  if (pct <= 0) return 'bg-muted';
  if (pct < 1) return 'bg-[var(--green)]';
  if (pct <= 3) return 'bg-[var(--accent-color)]';
  return 'bg-[var(--red)]';
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const thClass =
  'text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShortageDashboard({
  tenantSlug,
  overview,
  byRoute,
  byTransporter,
  byCommodity,
  recent,
}: ShortageDashboardProps) {
  // ---- Overview Cards ----
  const overviewCards = [
    {
      label: 'Received Dispatches',
      value: overview.total_received_dispatches,
    },
    {
      label: 'Items with Shortage',
      value: overview.items_with_shortage,
    },
    {
      label: 'Avg Shortage %',
      value: `${overview.avg_shortage_percent}%`,
      color: pctColor(overview.avg_shortage_percent),
    },
    {
      label: 'Total Qty Lost',
      value: formatNum(overview.total_quantity_lost),
    },
  ];

  return (
    <div className="space-y-6">
      {/* --- Overview Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <Card
            key={card.label}
            className="border-border bg-[var(--bg-off)]"
          >
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p
                className={`text-2xl font-bold font-mono ${card.color ?? 'text-foreground'}`}
              >
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- By Route --- */}
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Shortage by Route ({byRoute.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {byRoute.length === 0 ? (
            <EmptyState label="No route shortage data" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className={`${thClass} pl-6`}>
                    Route
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Dispatches
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Total Sent
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Total Received
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Shortage
                  </TableHead>
                  <TableHead className={`${thClass} text-right pr-6`}>
                    Shortage %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byRoute.map((r) => {
                  const barW = Math.min(r.avg_shortage_percent, 100);
                  return (
                    <TableRow
                      key={`${r.origin_location_id}-${r.dest_location_id}`}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="pl-6 text-sm text-foreground">
                        <span className="text-[var(--text-body)]">
                          {r.origin_name}
                        </span>
                        <span className="text-[var(--text-dim)] mx-1.5">
                          &rarr;
                        </span>
                        <span className="text-[var(--text-body)]">
                          {r.dest_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {r.dispatch_count}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {formatNum(r.total_sent)}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {formatNum(r.total_received)}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {formatNum(r.total_shortage)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pctBarColor(r.avg_shortage_percent)}`}
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-mono font-medium ${pctColor(r.avg_shortage_percent)}`}
                          >
                            {r.avg_shortage_percent}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- By Transporter & By Commodity side-by-side --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Transporter */}
        <Card className="border-border bg-[var(--bg-off)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Shortage by Transporter ({byTransporter.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {byTransporter.length === 0 ? (
              <EmptyState label="No transporter shortage data" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className={`${thClass} pl-6`}>
                      Transporter
                    </TableHead>
                    <TableHead className={`${thClass} text-right`}>
                      Dispatches
                    </TableHead>
                    <TableHead className={`${thClass} text-right`}>
                      Total Shortage
                    </TableHead>
                    <TableHead className={`${thClass} text-right pr-6`}>
                      Avg Shortage %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byTransporter.map((t) => (
                    <TableRow
                      key={t.transporter_name}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="pl-6 text-sm text-foreground font-medium">
                        {t.transporter_name}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {t.dispatch_count}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {formatNum(t.total_shortage)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${pctBadgeColor(t.avg_shortage_percent)}`}
                        >
                          {t.avg_shortage_percent}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* By Commodity */}
        <Card className="border-border bg-[var(--bg-off)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Shortage by Item ({byCommodity.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {byCommodity.length === 0 ? (
              <EmptyState label="No item shortage data" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className={`${thClass} pl-6`}>
                      Item
                    </TableHead>
                    <TableHead className={`${thClass} text-right`}>
                      Dispatches
                    </TableHead>
                    <TableHead className={`${thClass} text-right`}>
                      Total Sent
                    </TableHead>
                    <TableHead className={`${thClass} text-right`}>
                      Total Shortage
                    </TableHead>
                    <TableHead className={`${thClass} text-right pr-6`}>
                      Avg Shortage %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCommodity.map((c) => (
                    <TableRow
                      key={c.commodity_id}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="pl-6 text-sm text-foreground font-medium">
                        {c.commodity_name}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {c.dispatch_count}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {formatNum(c.total_sent)}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                        {formatNum(c.total_shortage)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${pctBadgeColor(c.avg_shortage_percent)}`}
                        >
                          {c.avg_shortage_percent}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Recent Shortages --- */}
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Recent Shortages ({recent.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <EmptyState label="No recent shortages recorded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className={`${thClass} pl-6`}>
                    Dispatch #
                  </TableHead>
                  <TableHead className={thClass}>Item</TableHead>
                  <TableHead className={thClass}>Route</TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Sent
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Received
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Shortage
                  </TableHead>
                  <TableHead className={`${thClass} text-right`}>
                    Shortage %
                  </TableHead>
                  <TableHead className={`${thClass} text-right pr-6`}>
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell className="pl-6">
                      <Link
                        href={`/t/${tenantSlug}/dispatches/${item.dispatch_id}`}
                        className="font-mono text-sm text-[var(--accent-color)] font-medium hover:text-[var(--accent-color)] underline-offset-4 hover:underline"
                      >
                        {item.dispatch_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {item.commodity_name}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-body)]">
                      <span>{item.origin_name}</span>
                      <span className="text-[var(--text-dim)] mx-1">
                        &rarr;
                      </span>
                      <span>{item.dest_name}</span>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                      {formatNum(item.sent_quantity)}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                      {formatNum(item.received_quantity)}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-[var(--text-muted)] text-right">
                      {formatNum(item.shortage)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${pctBadgeColor(item.shortage_percent)}`}
                      >
                        {item.shortage_percent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-[var(--text-dim)] text-right pr-6">
                      {formatDate(item.received_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-dim)]">
      <p className="text-sm font-mono">{label}</p>
    </div>
  );
}
