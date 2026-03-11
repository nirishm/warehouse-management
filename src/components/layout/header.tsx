'use client';

import dynamic from 'next/dynamic';
import { useTenant } from './tenant-provider';
import { Badge } from '@/components/ui/badge';
import { RealtimeStatus } from '@/components/realtime/realtime-status';
import { MobileSidebar } from './sidebar';
import type { ModuleNavItem } from '@/core/modules/types';

const GlobalSearch = dynamic(
  () => import('@/components/search/global-search').then((m) => m.GlobalSearch),
  {
    ssr: false,
    loading: () => <div className="w-64 h-9 bg-[var(--bg-off)] rounded-md" />,
  }
);

interface HeaderProps {
  tenantSlug: string;
  tenantName: string;
  navItems: ModuleNavItem[];
}

export function Header({ tenantSlug, tenantName, navItems }: HeaderProps) {
  const tenant = useTenant();

  return (
    <header className="h-14 border-b border-border bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar tenantSlug={tenantSlug} tenantName={tenantName} navItems={navItems} />
        {/* Mobile brand */}
        <span className="md:hidden text-sm font-bold tracking-tight text-foreground font-mono uppercase">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] mr-1"></span>WareOS
        </span>
      </div>
      <GlobalSearch />
      <div className="flex items-center gap-3">
        <RealtimeStatus />
        <Badge variant="outline" className="border-border text-[var(--text-muted)] font-mono text-xs">
          {tenant.role.replace('_', ' ')}
        </Badge>
      </div>
    </header>
  );
}
