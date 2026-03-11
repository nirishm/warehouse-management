'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, Truck, Package, MoreHorizontal } from 'lucide-react';
import { MobileSidebar } from './sidebar';
import type { ModuleNavItem } from '@/core/modules/types';

interface MobileBottomNavProps {
  tenantSlug: string;
  tenantName: string;
  navItems: ModuleNavItem[];
}

const tabs = [
  { key: 'home', label: 'Home', icon: Home, href: '' },
  { key: 'purchases', label: 'Receive', icon: ShoppingCart, href: 'purchases' },
  { key: 'dispatches', label: 'Dispatch', icon: Truck, href: 'dispatches' },
  { key: 'inventory', label: 'Stock', icon: Package, href: 'inventory' },
  { key: 'more', label: 'More', icon: MoreHorizontal, href: null },
] as const;

export function MobileBottomNav({ tenantSlug, tenantName, navItems }: MobileBottomNavProps) {
  const pathname = usePathname();
  const basePath = `/t/${tenantSlug}`;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <MobileSidebar
        tenantSlug={tenantSlug}
        tenantName={tenantName}
        navItems={navItems}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            if (tab.href === null) {
              // "More" tab opens sidebar
              return (
                <button
                  key={tab.key}
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[var(--text-dim)]"
                >
                  <tab.icon size={20} />
                  <span className="text-[10px] font-mono">{tab.label}</span>
                </button>
              );
            }

            const href = `${basePath}${tab.href ? `/${tab.href}` : ''}`;
            const isActive = tab.href === ''
              ? pathname === basePath
              : pathname.startsWith(href);

            return (
              <Link
                key={tab.key}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-[var(--accent-color)]'
                    : 'text-[var(--text-dim)]'
                }`}
              >
                <tab.icon size={20} />
                <span className="text-[10px] font-mono">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
