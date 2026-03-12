'use client';

import { useRealtime } from '@/lib/hooks/use-realtime';
import { useTenant } from '@/components/layout/tenant-provider';

interface RealtimeListenerProps {
  table: string;
  filter?: string;
  enabled?: boolean;
}

export function RealtimeListener({ table, filter, enabled = true }: RealtimeListenerProps) {
  const tenant = useTenant();
  useRealtime({
    schemaName: tenant.schemaName,
    table,
    filter,
    enabled,
  });
  return null; // This component renders nothing, just subscribes
}
