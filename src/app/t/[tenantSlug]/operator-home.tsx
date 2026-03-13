// src/app/t/[tenantSlug]/operator-home.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Truck, Package, FileText, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/components/layout/tenant-provider";

interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  transfer: "Dispatch",
  purchase: "Purchase",
  sale: "Sale",
  adjustment: "Adjustment",
};

const ENTITY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  transfer: { bg: "var(--orange-bg)", text: "var(--accent-color)" },
  purchase: { bg: "var(--blue-bg)", text: "var(--blue)" },
  sale: { bg: "var(--green-bg)", text: "var(--green)" },
};

function getBadgeStyle(entityType: string) {
  return (
    ENTITY_TYPE_COLORS[entityType] ?? {
      bg: "var(--bg-off)",
      text: "var(--text-muted)",
    }
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  const first = parts[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function OperatorHome({ tenantSlug }: { tenantSlug: string }) {
  const { userEmail } = useTenant();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/my-activity`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json = await res.json();
      setEntries(json.entries ?? []);
    } catch {
      toast.error("Could not load recent activity");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const greeting = getGreeting();
  const firstName = userEmail ? getFirstName(userEmail) : "there";

  const quickActions = [
    {
      label: "New Dispatch",
      icon: Truck,
      href: `/t/${tenantSlug}/transfers/new`,
      primary: true,
    },
    {
      label: "Receive Goods",
      icon: Package,
      href: `/t/${tenantSlug}/purchases/new`,
      primary: false,
    },
    {
      label: "New Sale",
      icon: FileText,
      href: `/t/${tenantSlug}/sales/new`,
      primary: false,
    },
    {
      label: "View Stock",
      icon: Layers,
      href: `/t/${tenantSlug}/inventory`,
      primary: false,
    },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* Greeting */}
      <div className="mb-5">
        <h1
          style={{ color: "var(--text-primary)" }}
          className="text-[24px] font-bold"
        >
          {greeting}, {firstName}
        </h1>
        <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
          {tenantSlug}
        </p>
      </div>

      {/* Quick-action grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map(({ label, icon: Icon, href, primary }) => (
          <Link
            key={label}
            href={href}
            style={{
              backgroundColor: primary ? "var(--accent-color)" : "var(--bg-off)",
              borderRadius: "12px",
            }}
            className="flex flex-col gap-2.5 p-5 active:opacity-80 transition-opacity"
          >
            <Icon
              className="size-5 shrink-0"
              style={{ color: primary ? "var(--bg-base)" : "var(--accent-color)" }}
            />
            <span
              style={{ color: primary ? "var(--bg-base)" : "var(--text-primary)" }}
              className="text-[14px] font-bold"
            >
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <p
        style={{
          color: "var(--text-dim)",
          letterSpacing: "0.08em",
        }}
        className="text-[12px] font-bold uppercase mt-6 mb-3"
      >
        My Recent Activity
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-start py-3 border-b border-[var(--border)]">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }} className="text-[13px] py-4 text-center">
          No activity yet. Create your first dispatch, purchase, or sale.
        </p>
      ) : (
        <div>
          {entries.map((entry) => {
            const badge = getBadgeStyle(entry.entityType);
            const label =
              ENTITY_TYPE_LABELS[entry.entityType] ??
              entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1);
            const relTime = formatDistanceToNow(new Date(entry.createdAt), {
              addSuffix: true,
            });

            return (
              <div
                key={entry.id}
                className="flex justify-between items-start py-3 border-b border-[var(--border)] last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      style={{ color: "var(--text-primary)", fontFamily: "var(--mono, monospace)" }}
                      className="text-[13px] font-bold"
                    >
                      {entry.description}
                    </span>
                    <span
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        borderRadius: "4px",
                        padding: "2px 7px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        lineHeight: "1.4",
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <p style={{ color: "var(--text-primary)" }} className="text-[13px] truncate">
                    {entry.entityType.charAt(0).toUpperCase() + entry.entityType.slice(1)} #{entry.entityId.slice(0, 8)}
                  </p>
                </div>
                <span
                  style={{ color: "var(--text-dim)", whiteSpace: "nowrap", marginLeft: "12px" }}
                  className="text-[12px] pt-0.5 shrink-0"
                >
                  {relTime}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
