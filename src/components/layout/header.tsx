'use client';

import { useTenant } from './tenant-provider';
import { Badge } from '@/components/ui/badge';
import { RealtimeStatus } from '@/components/realtime/realtime-status';
import { MobileSidebar } from './sidebar';
import type { ModuleNavItem } from '@/core/modules/types';

interface HeaderProps {
  tenantSlug: string;
  tenantName: string;
  navItems: ModuleNavItem[];
}

export function Header({ tenantSlug, tenantName, navItems }: HeaderProps) {
  const tenant = useTenant();

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar tenantSlug={tenantSlug} tenantName={tenantName} navItems={navItems} />
        {/* Mobile brand */}
        <span className="md:hidden text-sm font-bold tracking-tight text-zinc-100 font-mono uppercase">
          WH<span className="text-amber-500">.</span>mgmt
        </span>
      </div>
      <div className="flex items-center gap-3">
        <RealtimeStatus />
        <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono text-xs">
          {tenant.role.replace('_', ' ')}
        </Badge>
      </div>
    </header>
  );
}
