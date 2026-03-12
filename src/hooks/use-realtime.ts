"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeOptions {
  /** Supabase table name to listen to */
  table: string;
  /** Filter by tenant_id (required for multi-tenant isolation) */
  tenantId: string;
  /** Events to listen for (default: all) */
  events?: ChangeEvent[];
  /** Called when a matching change occurs */
  onChanged: () => void;
  /** Whether the subscription is active (default: true) */
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime changes on a table, scoped to a tenant.
 * Calls `onChanged` whenever a matching event fires — the consumer
 * is responsible for re-fetching data.
 */
export function useRealtime({
  table,
  tenantId,
  events = ["INSERT", "UPDATE", "DELETE"],
  onChanged,
  enabled = true,
}: UseRealtimeOptions) {
  const callbackRef = useRef(onChanged);
  callbackRef.current = onChanged;

  useEffect(() => {
    if (!enabled || !tenantId) return;

    const supabase = createClient();
    const channelName = `realtime:${table}:${tenantId}`;

    let channel: RealtimeChannel = supabase.channel(channelName);

    for (const event of events) {
      channel = channel.on(
        "postgres_changes" as "system",
        {
          event,
          schema: "public",
          table,
          filter: `tenant_id=eq.${tenantId}`,
        } as Record<string, string>,
        () => {
          callbackRef.current();
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, tenantId, enabled, events.join(",")]);
}
