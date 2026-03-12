"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardAnalytics {
  kpis: {
    stockValue: { total: number };
    itemsBelowReorder: { count: number };
    openOrders: { purchases: number; sales: number; total: number };
    inTransitTransfers: { count: number };
    revenue: { total: number };
  };
  topSellingItems: Array<{
    itemId: string;
    itemName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  stockMovement: Array<{
    date: string;
    inbound: number;
    outbound: number;
  }>;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function KpiCard({
  label,
  value,
  subtitle,
  valueStyle,
}: {
  label: string;
  value: string;
  subtitle: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5"
    >
      <p
        style={{ color: "var(--text-muted)" }}
        className="text-[12px] font-bold uppercase tracking-wide"
      >
        {label}
      </p>
      <p
        style={{ color: "var(--text-primary)", ...valueStyle }}
        className="text-[28px] font-bold mt-1"
      >
        {value}
      </p>
      <p
        style={{ color: "var(--text-dim)" }}
        className="text-[12px] mt-1"
      >
        {subtitle}
      </p>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5 flex flex-col gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32 mt-1" />
      <Skeleton className="h-3 w-28 mt-1" />
    </div>
  );
}

function isAllZero(data: DashboardAnalytics): boolean {
  return (
    data.kpis.stockValue.total === 0 &&
    data.kpis.itemsBelowReorder.count === 0 &&
    data.kpis.openOrders.total === 0 &&
    data.kpis.inTransitTransfers.count === 0 &&
    data.kpis.revenue.total === 0 &&
    data.topSellingItems.length === 0 &&
    data.stockMovement.every((d) => d.inbound === 0 && d.outbound === 0)
  );
}

export function DashboardClient({ tenantSlug }: { tenantSlug: string }) {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="px-[var(--content-px)] py-8 flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1
          style={{ color: "var(--text-primary)" }}
          className="text-[28px] font-bold"
        >
          Dashboard
        </h1>
        <p
          style={{ color: "var(--text-muted)" }}
          className="text-[15px] mt-1"
        >
          Your warehouse at a glance
        </p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Stock Value"
            value={formatINR(data.kpis.stockValue.total)}
            subtitle="current inventory value"
          />
          <KpiCard
            label="Below Reorder"
            value={String(data.kpis.itemsBelowReorder.count)}
            subtitle="items need restocking"
            valueStyle={
              data.kpis.itemsBelowReorder.count > 0
                ? { color: "var(--red)" }
                : undefined
            }
          />
          <KpiCard
            label="Open Orders"
            value={String(data.kpis.openOrders.total)}
            subtitle={`${data.kpis.openOrders.purchases} purchases, ${data.kpis.openOrders.sales} sales`}
          />
          <KpiCard
            label="In Transit"
            value={String(data.kpis.inTransitTransfers.count)}
            subtitle="transfers in progress"
          />
          <KpiCard
            label="Revenue"
            value={formatINR(data.kpis.revenue.total)}
            subtitle="this period"
          />
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && data && isAllZero(data) && (
        <div
          className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-10 text-center"
        >
          <p
            style={{ color: "var(--text-primary)" }}
            className="text-[17px] font-bold"
          >
            No data yet
          </p>
          <p
            style={{ color: "var(--text-muted)" }}
            className="text-[14px] mt-2"
          >
            Get started by adding items, creating a purchase order, or recording
            your first sale.
          </p>
        </div>
      )}

      {/* Charts row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5">
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>
          <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5">
            <Skeleton className="h-5 w-48 mb-4" />
            <div className="flex flex-col gap-3 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : data && !isAllZero(data) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Movement Chart */}
          <div
            className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5"
          >
            <h2
              style={{ color: "var(--text-primary)" }}
              className="text-[15px] font-bold mb-4"
            >
              Stock Movement (7 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stockMovement} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 13,
                  }}
                  cursor={{ fill: "var(--accent-tint)" }}
                />
                <Bar
                  dataKey="inbound"
                  name="Inbound"
                  fill="var(--green)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="outbound"
                  name="Outbound"
                  fill="var(--accent-color)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            {/* Chart legend */}
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: "var(--green)" }}
                />
                <span
                  style={{ color: "var(--text-muted)" }}
                  className="text-[12px]"
                >
                  Inbound
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: "var(--accent-color)" }}
                />
                <span
                  style={{ color: "var(--text-muted)" }}
                  className="text-[12px]"
                >
                  Outbound
                </span>
              </div>
            </div>
          </div>

          {/* Top Selling Items */}
          <div
            className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-5"
          >
            <h2
              style={{ color: "var(--text-primary)" }}
              className="text-[15px] font-bold mb-4"
            >
              Top Selling Items
            </h2>
            <div className="flex flex-col gap-3">
              {data.topSellingItems.map((item, i) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{ color: "var(--text-dim)" }}
                      className="text-[13px] w-6"
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{ color: "var(--text-primary)" }}
                      className="text-[13px] font-bold"
                    >
                      {item.itemName}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span
                      style={{ color: "var(--text-muted)" }}
                      className="text-[13px]"
                    >
                      {item.totalQuantity} sold
                    </span>
                    <span
                      style={{ color: "var(--text-primary)" }}
                      className="text-[13px] font-bold"
                    >
                      {formatINR(item.totalRevenue)}
                    </span>
                  </div>
                </div>
              ))}
              {data.topSellingItems.length === 0 && (
                <p
                  style={{ color: "var(--text-muted)" }}
                  className="text-[13px] text-center py-4"
                >
                  No sales data yet
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
