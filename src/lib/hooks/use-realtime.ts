import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

interface UseRealtimeOptions {
  schemaName: string;
  table: string;
  filter?: string; // e.g., 'status=eq.dispatched'
  enabled?: boolean;
}

export function useRealtime({ schemaName, table, filter, enabled = true }: UseRealtimeOptions) {
  const router = useRouter();
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null);

  useEffect(() => {
    if (!enabled || !schemaName) return;

    const supabase = createBrowserClient();
    const channelName = `${schemaName}_${table}_${Date.now()}`;

    const channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event: '*',
        schema: schemaName,
        table,
        ...(filter ? { filter } : {}),
      },
      () => {
        // Refresh server components to pick up new data
        router.refresh();
      }
    ).subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schemaName, table, filter, enabled, router]);
}
