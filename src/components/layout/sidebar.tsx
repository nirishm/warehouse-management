"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Box,
  MapPin,
  Users,
  Settings,
  ShoppingCart,
  ShoppingBag,
  ArrowLeftRight,
  Scale,
  UserCog,
  FileText,
  Bell,
  BarChart3,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { useTenant } from "./tenant-provider";
import { registry } from "@/modules";
import { ROLE_PERMISSIONS } from "@/core/auth/permissions";
import type { Role } from "@/core/auth/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Box,
  MapPin,
  Users,
  Settings,
  ShoppingCart,
  ShoppingBag,
  ArrowLeftRight,
  Scale,
  UserCog,
  FileText,
  Bell,
  BarChart3,
  AlertTriangle,
  CreditCard,
};

const GROUP_ORDER = ["Main", "Transactions", "Settings"] as const;

export function Sidebar() {
  const { tenantSlug, role, enabledModules } = useTenant();
  const pathname = usePathname();

  const userPermissions = ROLE_PERMISSIONS[role as Role] ?? [];
  const navItems = registry.getNavItems(
    enabledModules,
    userPermissions.map(String),
  );

  // Group nav items by their group field
  const grouped = GROUP_ORDER.reduce<
    Record<string, typeof navItems>
  >((acc, group) => {
    const items = navItems.filter((item) => item.group === group);
    if (items.length > 0) {
      acc[group] = items;
    }
    return acc;
  }, {});

  // Also collect items with no group or unknown group at end
  const ungrouped = navItems.filter(
    (item) => !item.group || !GROUP_ORDER.includes(item.group as typeof GROUP_ORDER[number]),
  );

  function isActive(path: string): boolean {
    const fullPath = `/t/${tenantSlug}${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  }

  function NavItem({
    path,
    label,
    icon,
  }: {
    path: string;
    label: string;
    icon: string;
  }) {
    const Icon = iconMap[icon] ?? Package;
    const active = isActive(path);
    const href = `/t/${tenantSlug}${path}`;

    return (
      <Link
        href={href}
        style={
          active
            ? {
                borderLeft: "2px solid var(--accent-color)",
                backgroundColor: "var(--accent-tint)",
                color: "var(--accent-color)",
              }
            : {
                borderLeft: "2px solid transparent",
                color: "var(--text-muted)",
              }
        }
        className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-400 transition-colors hover:bg-[var(--bg-off)] rounded-r-md"
      >
        <Icon className="size-4 shrink-0" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <div
      style={{
        width: "var(--sidebar-w)",
        backgroundColor: "var(--bg-base)",
        borderRight: "1px solid var(--border)",
      }}
      className="flex flex-col h-full"
    >
      {/* Brand / Logo */}
      <div
        style={{ height: "var(--header-h)", borderBottom: "1px solid var(--border)" }}
        className="flex items-center px-5 shrink-0"
      >
        <span
          style={{ color: "var(--accent-color)" }}
          className="text-[20px] font-bold tracking-tight"
        >
          WareOS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-4">
            <div
              style={{ color: "var(--text-dim)" }}
              className="px-5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.06em]"
            >
              {group}
            </div>
            <div className="space-y-0.5 pr-3">
              {items.map((item) => (
                <NavItem
                  key={item.path}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className="space-y-0.5 pr-3">
            {ungrouped.map((item) => (
              <NavItem
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
