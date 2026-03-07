'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from './tenant-provider';
import { getIcon } from './icon-map';
import type { ModuleNavItem } from '@/core/modules/types';
import { Home, Settings, LogOut, Menu } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export interface SidebarProps {
  tenantSlug: string;
  tenantName: string;
  navItems: ModuleNavItem[];
}

function SidebarContent({ tenantSlug, tenantName, navItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useTenant();
  const basePath = `/t/${tenantSlug}`;

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {/* Brand */}
      <div className="px-4 h-14 flex items-center border-b border-zinc-800">
        <span className="text-sm font-bold tracking-tight text-zinc-100 font-mono uppercase">
          Warehouse<span className="text-amber-500">.</span>mgmt
        </span>
      </div>

      {/* Tenant name */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Organization</p>
        <p className="text-sm text-zinc-200 font-medium truncate mt-0.5">{tenantName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <NavLink
          href={basePath}
          icon={<Home size={16} />}
          label="Dashboard"
          active={pathname === basePath}
        />

        <div className="pt-3 pb-1 px-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Modules</p>
        </div>

        {navItems.map((item) => {
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

        {tenant.role === 'tenant_admin' && (
          <>
            <div className="pt-3 pb-1 px-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Settings</p>
            </div>
            <NavLink
              href={`${basePath}/settings`}
              icon={<Settings size={16} />}
              label="Settings"
              active={pathname.startsWith(`${basePath}/settings`)}
            />
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
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
    <aside className="hidden md:flex w-60 bg-zinc-900 border-r border-zinc-800 flex-col h-screen sticky top-0">
      <SidebarContent tenantSlug={tenantSlug} tenantName={tenantName} navItems={navItems} />
    </aside>
  );
}

export function MobileSidebar({ tenantSlug, tenantName, navItems }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<button className="md:hidden p-2 text-zinc-400 hover:text-zinc-200 transition-colors" />}
      >
        <Menu size={20} />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 bg-zinc-900 border-zinc-800 flex flex-col" showCloseButton={false}>
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
          ? 'bg-amber-500/10 text-amber-500 border-l-2 border-amber-500 -ml-px pl-[11px]'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
