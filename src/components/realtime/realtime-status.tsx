'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase.channel('connection-status').subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5" title={connected ? 'Live updates active' : 'Connecting...'}>
      {connected ? (
        <Wifi className="size-3.5 text-[var(--green)]" />
      ) : (
        <WifiOff className="size-3.5 text-[var(--text-dim)]" />
      )}
      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
        {connected ? 'Live' : '...'}
      </span>
    </div>
  );
}
