"use client";

import { useTenant } from "@/components/layout/tenant-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { useRealtimeContext } from "./realtime-provider";

/**
 * Subscribes to Supabase Realtime for stock-affecting tables
 * (purchases, sales, transfers, adjustments) and notifies the
 * realtime context so consuming components can re-fetch.
 *
 * Mount once in the tenant layout.
 */
export function StockRealtimeListener() {
  const { tenantId } = useTenant();
  const { notify } = useRealtimeContext();

  // Listen to purchase changes → notify stock
  useRealtime({
    table: "purchases",
    tenantId,
    events: ["UPDATE"],
    onChanged: () => {
      notify("purchases");
      notify("stock_levels");
    },
  });

  // Listen to sale changes → notify stock
  useRealtime({
    table: "sales",
    tenantId,
    events: ["UPDATE"],
    onChanged: () => {
      notify("sales");
      notify("stock_levels");
    },
  });

  // Listen to transfer changes → notify stock + transfers
  useRealtime({
    table: "transfers",
    tenantId,
    events: ["INSERT", "UPDATE"],
    onChanged: () => {
      notify("transfers");
      notify("stock_levels");
    },
  });

  // Listen to adjustment changes → notify stock
  useRealtime({
    table: "adjustments",
    tenantId,
    events: ["UPDATE"],
    onChanged: () => {
      notify("adjustments");
      notify("stock_levels");
    },
  });

  return null;
}
