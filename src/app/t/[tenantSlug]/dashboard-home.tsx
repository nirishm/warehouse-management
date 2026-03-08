'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowLeftRight,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type {
  DashboardKpis,
  RecentTransaction,
  StockByLocationRow,
  ShortageAlert,
  ActivityEntry,
} from '@/modules/analytics/queries/dashboard';

// ── Props ──────────────────────────────────────────────────────────

interface DashboardHomeProps {
  tenantSlug: string;
  tenantName: string;
  kpis: DashboardKpis;
  recentTransactions: RecentTransaction[];
  stockByLocation: StockByLocationRow[];
  shortageAlerts: ShortageAlert[];
  recentActivity: ActivityEntry[];
  locations: { id: string; name: string; code: string }[];
  commodities: { id: string; name: string; code: string }[];
  activeFilters: {
    dateFrom?: string;
    dateTo?: string;
    locationId?: string;
    commodityId?: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

const typeConfig = {
  dispatch: { label: 'DISPATCH', textClass: 'text-[var(--accent-color)]', bgClass: 'bg-[var(--orange-bg)]' },
  purchase: { label: 'PURCHASE', textClass: 'text-[var(--blue)]', bgClass: 'bg-[var(--blue-bg)]' },
  sale: { label: 'SALE', textClass: 'text-[var(--green)]', bgClass: 'bg-[var(--green-bg)]' },
};

const statusConfig: Record<string, { textClass: string; bgClass: string; dotClass: string }> = {
  received: { textClass: 'text-[var(--green)]', bgClass: 'bg-[var(--green-bg)]', dotClass: 'bg-[var(--green)]' },
  confirmed: { textClass: 'text-[var(--blue)]', bgClass: 'bg-[var(--blue-bg)]', dotClass: 'bg-[var(--blue)]' },
  dispatched: { textClass: 'text-[var(--accent-color)]', bgClass: 'bg-[var(--orange-bg)]', dotClass: 'bg-[var(--accent-color)]' },
  in_transit: { textClass: 'text-[var(--accent-color)]', bgClass: 'bg-[var(--orange-bg)]', dotClass: 'bg-[var(--accent-color)]' },
  cancelled: { textClass: 'text-[var(--red)]', bgClass: 'bg-[var(--red-bg)]', dotClass: 'bg-[var(--red)]' },
  draft: { textClass: 'text-[var(--text-muted)]', bgClass: 'bg-[var(--bg-off)]', dotClass: 'bg-[var(--text-muted)]' },
  ordered: { textClass: 'text-[var(--blue)]', bgClass: 'bg-[var(--blue-bg)]', dotClass: 'bg-[var(--blue)]' },
  completed: { textClass: 'text-[var(--green)]', bgClass: 'bg-[var(--green-bg)]', dotClass: 'bg-[var(--green)]' },
};

const defaultStatusStyle = { textClass: 'text-[var(--text-muted)]', bgClass: 'bg-[var(--bg-off)]', dotClass: 'bg-[var(--text-muted)]' };

function getStatusStyle(status: string) {
  return statusConfig[status] ?? defaultStatusStyle;
}

function getActivityColor(action: string): string {
  if (action === 'create') return 'bg-[var(--green)]';
  if (action === 'update') return 'bg-[var(--blue)]';
  if (action === 'delete') return 'bg-[var(--red)]';
  return 'bg-[var(--accent-color)]';
}

const pastTense: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  dispatch: 'dispatched',
  receive: 'received',
  confirm: 'confirmed',
  cancel: 'cancelled',
};

function getActivityDescription(entry: ActivityEntry): string {
  const verb = pastTense[entry.action] ?? `${entry.action}ed`;
  const entity = entry.entityType.replace(/_/g, ' ');
  return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${entity}`;
}

// ── Component ──────────────────────────────────────────────────────

export function DashboardHome({
  tenantSlug,
  tenantName,
  kpis,
  recentTransactions,
  stockByLocation,
  shortageAlerts,
  recentActivity,
  locations,
  commodities,
  activeFilters,
}: DashboardHomeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const updateDateRange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (from) params.set('dateFrom', from);
      else params.delete('dateFrom');
      if (to) params.set('dateTo', to);
      else params.delete('dateTo');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = activeFilters.dateFrom || activeFilters.dateTo || activeFilters.locationId || activeFilters.commodityId;

  const maxStock = Math.max(...stockByLocation.map((r) => Math.abs(r.totalStock)), 1);

  return (
    <div className="space-y-4">
      {/* ── Header + Filters ─────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-serif text-[var(--text-primary)] tracking-tight" style={{ letterSpacing: '-0.3px' }}>
            Dashboard
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Welcome to {tenantName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            dateFrom={activeFilters.dateFrom}
            dateTo={activeFilters.dateTo}
            onChange={updateDateRange}
          />

          <select
            value={activeFilters.locationId ?? ''}
            onChange={(e) => updateFilter('locationId', e.target.value)}
            className="h-8 rounded-full border border-border bg-[var(--bg-base)] px-3 text-xs font-medium text-[var(--text-body)] outline-none transition-colors hover:border-[var(--accent-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/10"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <select
            value={activeFilters.commodityId ?? ''}
            onChange={(e) => updateFilter('commodityId', e.target.value)}
            className="h-8 rounded-full border border-border bg-[var(--bg-base)] px-3 text-xs font-medium text-[var(--text-body)] outline-none transition-colors hover:border-[var(--accent-color)] focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/10"
          >
            <option value="">All Commodities</option>
            {commodities.map((com) => (
              <option key={com.id} value={com.id}>
                {com.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => router.push(pathname)}
              className="text-[11px] font-mono font-medium text-[var(--accent-color)] underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package className="h-3.5 w-3.5" />}
          label="Total Stock Items"
          value={formatNumber(kpis.totalStockItems)}
          sub="Across filtered locations"
        />
        <KpiCard
          icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
          label="Movements"
          value={formatNumber(kpis.movementsInRange)}
          sub="In selected period"
        />
        <KpiCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Active Alerts"
          value={formatNumber(kpis.activeAlerts)}
          sub={kpis.activeAlerts > 0 ? 'Need attention' : 'All clear'}
          badge={kpis.activeAlerts > 0 ? kpis.activeAlerts : undefined}
          href={`/t/${tenantSlug}/stock-alerts`}
        />
        <KpiCard
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Active Locations"
          value={formatNumber(kpis.activeLocations)}
          sub="With stock on hand"
        />
      </div>

      {/* ── Mid Section: Transactions + Stock ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.65fr] gap-4">
        {/* Recent Transactions */}
        <div className="rounded-xl border border-border bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Recent Transactions
            </span>
            <Link
              href={`/t/${tenantSlug}/analytics`}
              className="text-[11.5px] font-medium text-[var(--accent-color)] hover:underline"
            >
              View all
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState message="No transactions in this period" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] border-b border-border">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] border-b border-border">
                      Number
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] border-b border-border hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] border-b border-border hidden md:table-cell">
                      Commodity
                    </th>
                    <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] border-b border-border hidden md:table-cell">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-[var(--text-dim)] border-b border-border">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((txn, i) => {
                    const type = typeConfig[txn.type];
                    const status = getStatusStyle(txn.status);
                    return (
                      <tr
                        key={`${txn.id}-${i}`}
                        className="border-b border-border last:border-b-0 hover:bg-[var(--bg-off)] transition-colors cursor-pointer"
                        onClick={() => {
                          const base = txn.type === 'dispatch' ? 'dispatches' : txn.type === 'purchase' ? 'purchases' : 'sales';
                          router.push(`/t/${tenantSlug}/${base}/${txn.id}`);
                        }}
                      >
                        <td className="px-4 py-2.5">
                          <span className={`inline-block font-mono text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${type.textClass} ${type.bgClass}`}>
                            {type.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[11.5px] font-bold text-[var(--text-primary)]">
                            {txn.number}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.textClass} ${status.bgClass}`}>
                            <span className={`w-[5px] h-[5px] rounded-full ${status.dotClass}`} />
                            {txn.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-[var(--text-body)] font-medium hidden md:table-cell">
                          {txn.commodityName}
                        </td>
                        <td className="px-4 py-2.5 text-right hidden md:table-cell">
                          <span className="font-mono text-xs font-bold text-[var(--text-body)]">
                            {formatNumber(txn.quantity)}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-dim)] ml-1">
                            {txn.unit}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-mono text-[11px] text-[var(--text-dim)]">
                            {formatDate(txn.date)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stock by Location */}
        <div className="rounded-xl border border-border bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Stock by Location
            </span>
            <Link
              href={`/t/${tenantSlug}/inventory`}
              className="text-[11.5px] font-medium text-[var(--accent-color)] hover:underline"
            >
              View all
            </Link>
          </div>

          {stockByLocation.length === 0 ? (
            <EmptyState message="No stock data available" />
          ) : (
            <div className="py-3">
              {stockByLocation.map((loc) => {
                const barWidth = Math.max((Math.abs(loc.totalStock) / maxStock) * 100, 2);
                const isNegative = loc.totalStock < 0;
                return (
                  <div
                    key={loc.locationId}
                    className="px-5 py-3 border-b border-border last:border-b-0 hover:bg-[var(--bg-off)] transition-colors cursor-pointer"
                    onClick={() => router.push(`/t/${tenantSlug}/inventory?locationId=${loc.locationId}`)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        {loc.locationName}
                        {loc.hasShortage && (
                          <span className="font-mono text-[8.5px] font-bold uppercase tracking-wider bg-[var(--orange-bg)] text-[var(--accent-color)] px-1.5 py-0.5 rounded">
                            SHORTAGE
                          </span>
                        )}
                      </span>
                      <span className="text-[11.5px] text-[var(--text-dim)]">
                        {formatNumber(loc.totalStock)} items · {loc.commodityCount} {loc.commodityCount === 1 ? 'commodity' : 'commodities'}
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--bg-off)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isNegative ? 'bg-[var(--red)]' : loc.hasShortage ? 'bg-[var(--accent-color)]' : 'bg-[var(--text-primary)]'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Alerts + Activity ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shortage Alerts */}
        <div className="rounded-xl border border-border bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Shortage Alerts
            </span>
            <Link
              href={`/t/${tenantSlug}/stock-alerts`}
              className="text-[11.5px] font-medium text-[var(--accent-color)] hover:underline"
            >
              View all
            </Link>
          </div>

          {shortageAlerts.length === 0 ? (
            <EmptyState message="No shortage alerts" />
          ) : (
            <div className="py-2">
              {shortageAlerts.map((alert) => (
                <div
                  key={alert.thresholdId}
                  className="group px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-[var(--accent-tint)] transition-colors cursor-pointer relative"
                  onClick={() => router.push(`/t/${tenantSlug}/stock-alerts`)}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-[var(--red-bg)]' : 'bg-[var(--orange-bg)]'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.severity === 'CRITICAL' ? 'text-[var(--red)]' : 'text-[var(--accent-color)]'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {alert.commodityName}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)] mb-1.5">
                        {alert.locationName}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-mono font-bold ${
                          alert.severity === 'CRITICAL' ? 'text-[var(--red)]' : 'text-[var(--accent-color)]'
                        }`}>
                          {formatNumber(alert.currentStock)} {alert.unitAbbreviation}
                        </span>
                        <span className="text-[var(--text-dim)]">/</span>
                        <span className="font-mono text-[var(--text-muted)]">
                          {formatNumber(alert.reorderPoint)} {alert.unitAbbreviation}
                        </span>
                      </div>
                    </div>
                    <button className="absolute right-5 bottom-3.5 text-[11px] font-semibold text-[var(--accent-color)] border border-[var(--accent-color)] rounded-full px-2.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="rounded-xl border border-border bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Recent Activity
            </span>
            <Link
              href={`/t/${tenantSlug}/audit-log`}
              className="text-[11.5px] font-medium text-[var(--accent-color)] hover:underline"
            >
              View all
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <EmptyState message="No recent activity" />
          ) : (
            <div className="py-2">
              {recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex gap-2.5 items-start px-5 py-2.5 border-b border-border last:border-b-0"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getActivityColor(entry.action)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-[var(--text-body)] leading-relaxed">
                      <span className="font-medium">{entry.userName}</span>
                      {' '}
                      {getActivityDescription(entry)}
                      {entry.entityId && (
                        <>
                          {' '}
                          <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">
                            {entry.entityId.slice(0, 8)}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="font-mono text-[10.5px] text-[var(--text-dim)] mt-0.5">
                      {relativeTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  badge,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  badge?: number;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-border bg-[var(--bg-base)] p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-serif text-[28px] text-[var(--text-primary)] leading-none" style={{ letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="inline-flex items-center justify-center bg-[var(--accent-color)] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px]">
            {badge}
          </span>
        )}
      </div>
      <div className="text-xs text-[var(--text-muted)]">{sub}</div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-[13px] text-[var(--text-dim)]">
      {message}
    </div>
  );
}
