"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, ShoppingCart, ShoppingBag, MoreHorizontal } from "lucide-react";
import { useTenant } from "./tenant-provider";

interface MobileNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export function MobileBottomNav() {
  const { tenantSlug } = useTenant();
  const pathname = usePathname();

  const navItems: MobileNavItem[] = [
    { label: "Dashboard", icon: BarChart3, path: `/t/${tenantSlug}/dashboard` },
    { label: "Inventory", icon: Package, path: `/t/${tenantSlug}/inventory` },
    { label: "Sales", icon: ShoppingCart, path: `/t/${tenantSlug}/sales` },
    { label: "Purchases", icon: ShoppingBag, path: `/t/${tenantSlug}/purchases` },
    { label: "More", icon: MoreHorizontal, path: `/t/${tenantSlug}/more` },
  ];

  function isActive(path: string): boolean {
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <nav
      style={{
        height: "calc(var(--mobile-nav-h) + env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg-base)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center"
    >
      {navItems.map(({ label, icon: Icon, path }) => {
        const active = isActive(path);
        return (
          <Link
            key={path}
            href={path}
            style={{
              color: active ? "var(--accent-color)" : "var(--text-muted)",
            }}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-400 transition-colors"
            aria-label={label}
          >
            <Icon className="size-5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
