'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from './tenant-provider';
import { getIcon } from './icon-map';
import type { ModuleNavItem, NavGroup } from '@/core/modules/types';
import { Home, LogOut, Menu, ChevronDown } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export interface SidebarProps {
  tenantSlug: string;
  tenantName: string;
  navItems: ModuleNavItem[];
}

const GROUP_CONFIG: { key: NavGroup; label: string }[] = [
  { key: 'operations', label: 'Operations' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

function SidebarContent({ tenantSlug, tenantName, navItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useTenant();
  const basePath = `/t/${tenantSlug}`;

  // Group nav items
  const grouped = useMemo(() => {
    const map: Record<NavGroup, ModuleNavItem[]> = {
      operations: [],
      inventory: [],
      reports: [],
      settings: [],
    };
    for (const item of navItems) {
      const g = item.group ?? 'operations';
      map[g].push(item);
    }
    return map;
  }, [navItems]);

  // Determine which groups have an active link
  const activeGroups = useMemo(() => {
    const active = new Set<NavGroup>();
    for (const item of navItems) {
      const href = `${basePath}/${item.href}`;
      if (pathname.startsWith(href)) {
        active.add(item.group ?? 'operations');
      }
    }
    return active;
  }, [navItems, pathname, basePath]);

  // Initialize collapsed state: groups with active items start open
  const [collapsed, setCollapsed] = useState<Record<NavGroup, boolean>>(() => {
    const state: Record<NavGroup, boolean> = {
      operations: false,
      inventory: false,
      reports: false,
      settings: false,
    };
    // Collapse groups that don't have active items
    for (const { key } of GROUP_CONFIG) {
      if (!activeGroups.has(key)) {
        state[key] = true;
      }
    }
    // Always keep operations open by default
    state.operations = false;
    return state;
  });

  const toggleGroup = (group: NavGroup) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {/* Brand */}
      <div className="px-4 h-14 flex items-center border-b border-border">
        <span className="text-sm font-bold tracking-tight text-foreground font-mono uppercase">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-color)] mr-1.5"></span>WareOS
        </span>
      </div>

      {/* Tenant name */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Organization</p>
        <p className="text-sm text-foreground font-medium truncate mt-0.5">{tenantName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavLink
          href={basePath}
          icon={<Home size={16} />}
          label="Dashboard"
          active={pathname === basePath}
        />

        {GROUP_CONFIG.map(({ key, label }) => {
          const items = grouped[key];
          if (items.length === 0) return null;
          // Hide settings from non-admin unless there are visible items
          if (key === 'settings' && tenant.role !== 'tenant_admin') return null;

          const isCollapsed = collapsed[key];

          return (
            <div key={key} className="pt-2">
              <button
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center justify-between px-2 py-1.5 group"
              >
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] group-hover:text-[var(--text-muted)] transition-colors">
                  {label}
                </p>
                <ChevronDown
                  size={12}
                  className={`text-[var(--text-dim)] transition-transform duration-200 ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5 mt-0.5">
                  {items.map((item) => {
                    const Icon = getIcon(item.icon);
                    const href = `${basePath}/${item.href}`;
                    const active = pathname.startsWith(href);
                    return (
                      <NavLink
                        key={item.href}
                        href={href}
                        icon={<Icon size={16} />}
                        label={item.label}
                        active={active}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-off)] transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar({ tenantSlug, tenantName, navItems }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-60 bg-white border-r border-border flex-col h-screen sticky top-0">
      <SidebarContent tenantSlug={tenantSlug} tenantName={tenantName} navItems={navItems} />
    </aside>
  );
}

export function MobileSidebar({ tenantSlug, tenantName, navItems, open: externalOpen, onOpenChange }: SidebarProps & { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const pathname = usePathname();

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen;

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <SheetTrigger
          render={<button className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-body)] transition-colors" />}
        >
          <Menu size={20} />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
      )}
      <SheetContent side="left" className="p-0 w-60 bg-white border-border flex flex-col" showCloseButton={false}>
        <SidebarContent tenantSlug={tenantSlug} tenantName={tenantName} navItems={navItems} />
      </SheetContent>
    </Sheet>
  );
}

function NavLink({
  href, icon, label, active,
}: {
  href: string; icon: React.ReactNode; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${
        active
          ? 'bg-[var(--accent-tint)] text-[var(--accent-color)] border-l-2 border-[var(--accent-color)] -ml-px pl-[11px]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-off)]'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
