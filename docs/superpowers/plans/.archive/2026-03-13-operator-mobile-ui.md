# Operator Mobile UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fast, minimal mobile experience for the `operator` role — quick-action grid, personal activity feed, and role-specific bottom nav — matching `.claude/context/mockup-user-mobile.html` exactly.

**Architecture:** Role is available client-side via `useTenant().role` (from JWT `app_metadata`). The operator home page replaces the analytics dashboard for the `operator` role at `/t/[tenantSlug]`. A new `GET /api/v1/t/[tenantSlug]/my-activity` endpoint returns the current user's recent audit log entries. The desktop `Header` is hidden on mobile and replaced by a new `MobileHeader` component.

**Tech Stack:** Next.js 16 App Router, React, Tailwind v4 CSS tokens, Drizzle ORM + `withTenantContext`, `listAuditEntries` audit helper, `date-fns` (new dep), lucide-react icons, shadcn/ui DropdownMenu.

---

## Gap Analysis — Current vs Mockup

| # | Gap | Where |
|---|-----|--------|
| G1 | `Header` renders on mobile (hamburger + search bar visible) — mockup shows clean wordmark + avatar only | `header.tsx` |
| G2 | Mobile header is missing: WareOS wordmark (left) + small avatar (right) | missing file |
| G3 | Bottom nav tabs are wrong for operator: shows Dashboard/Inventory/Sales/Purchases/More instead of Home/Dispatch/Receive/Stock/More | `mobile-bottom-nav.tsx` |
| G4 | "Dashboard" tab routes to `/t/${slug}/dashboard` — that path does NOT exist (root is `/t/${slug}`) | `mobile-bottom-nav.tsx` |
| G5 | `/t/${slug}/more` returns 404 | missing page |
| G6 | Operator home shows analytics dashboard (KPI cards + charts) — operator does not need analytics | `page.tsx` |
| G7 | No "My Recent Activity" feed — operator needs to see only their own entries | missing component + API |
| G8 | No quick-action grid (New Dispatch / Receive Goods / New Sale / View Stock) | missing component |
| G9 | Mobile content padding is 28px (`--content-px`) — mockup uses 16px | `layout.tsx` |
| G10 | `operator` role is missing `transfers:create` permission — "New Dispatch" quick action requires it | `permissions.ts` |

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/core/auth/permissions.ts` | Add `transfers:create` to `OPERATOR_PERMISSIONS` |
| Create | `src/app/t/[tenantSlug]/more/page.tsx` | Stub More page (fixes 404) |
| Modify | `src/components/layout/header.tsx` | Hide on mobile (`hidden md:flex`) |
| Create | `src/components/layout/mobile-header.tsx` | Logo + avatar bar for mobile (56px) |
| Modify | `src/app/t/[tenantSlug]/layout.tsx` | Mount `MobileHeader`, fix mobile padding (16px) |
| Modify | `src/components/layout/mobile-bottom-nav.tsx` | Role-aware tabs (operator vs everyone else) |
| Create | `src/app/api/v1/t/[tenantSlug]/my-activity/route.ts` | `GET` — user's last 20 audit entries |
| Create | `src/app/t/[tenantSlug]/operator-home.tsx` | Client component: greeting + quick-action grid + activity feed |
| Modify | `src/app/t/[tenantSlug]/page.tsx` | Branch on role: operator → `OperatorHome`, others → `DashboardClient` |

---

## Chunk 1: Quick wins (permissions, More page, header split, nav tabs)

### Task 1: Add `transfers:create` to operator permissions

**Files:**
- Modify: `src/core/auth/permissions.ts:34-40`

- [ ] **Step 1: Open the file and add the permission**

```ts
// src/core/auth/permissions.ts — replace OPERATOR_PERMISSIONS block

const OPERATOR_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'orders:create',
  'orders:update',
  'receive:create',
  'barcodes:scan',
  'transfers:create',  // ← new: operators can create dispatches
];
```

- [ ] **Step 2: Run build to verify no TS errors**

```bash
pnpm build 2>&1 | tail -20
```

Expected: no type errors (the `Permission` union already includes `transfers:create`).

- [ ] **Step 3: Commit**

```bash
git add src/core/auth/permissions.ts
git commit -m "feat(auth): add transfers:create to operator permissions"
```

---

### Task 2: Create `/more` page (fix 404)

**Files:**
- Create: `src/app/t/[tenantSlug]/more/page.tsx`

- [ ] **Step 1: Create minimal stub page**

```tsx
// src/app/t/[tenantSlug]/more/page.tsx
export default function MorePage() {
  return (
    <div className="px-4 py-8">
      <h1
        style={{ color: "var(--text-primary)" }}
        className="text-[24px] font-bold"
      >
        More
      </h1>
      <p style={{ color: "var(--text-muted)" }} className="text-[14px] mt-1">
        Settings and additional options coming soon.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders (pnpm dev must be running)**

Navigate to `http://localhost:3000/t/<slug>/more` — should show "More" heading, no 404.

- [ ] **Step 3: Commit**

```bash
git add src/app/t/[tenantSlug]/more/page.tsx
git commit -m "feat: add /more stub page to fix 404 on mobile bottom nav"
```

---

### Task 3: Split `Header` into desktop-only + new `MobileHeader`

**Files:**
- Modify: `src/components/layout/header.tsx`
- Create: `src/components/layout/mobile-header.tsx`
- Modify: `src/app/t/[tenantSlug]/layout.tsx`

The current `Header` has the full desktop nav bar. It needs to be hidden on mobile (`<header className="hidden md:flex ...">`). A new `MobileHeader` replaces it on mobile — clean, lightweight: WareOS wordmark on the left, small avatar with user-initials on the right (same initials logic already in `header.tsx`).

- [ ] **Step 1: Make `Header` desktop-only**

In `src/components/layout/header.tsx`, replace the outer `<header>` opening tag:

```tsx
// Old:
<header
  style={{
    height: "var(--header-h)",
    backgroundColor: "var(--bg-base)",
    borderBottom: "1px solid var(--border)",
  }}
  className="sticky top-0 z-40 flex items-center px-[var(--content-px)] gap-3"
>

// New — add "hidden md:flex":
<header
  style={{
    height: "var(--header-h)",
    backgroundColor: "var(--bg-base)",
    borderBottom: "1px solid var(--border)",
  }}
  className="hidden md:flex sticky top-0 z-40 items-center px-[var(--content-px)] gap-3"
>
```

- [ ] **Step 2: Create `MobileHeader`**

```tsx
// src/components/layout/mobile-header.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./tenant-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export function MobileHeader() {
  const { userEmail, role } = useTenant();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  return (
    <header
      style={{
        height: "var(--mobile-header-h)",
        backgroundColor: "var(--bg-base)",
        borderBottom: "1px solid var(--border)",
      }}
      className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4"
    >
      {/* Wordmark */}
      <div className="flex items-center gap-1.5">
        {/* WareOS logomark */}
        <svg
          width="22"
          height="20"
          viewBox="0 0 64 58"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="6" y="43" width="52" height="15" rx="5" fill="#E8520A" />
          <rect x="13" y="28" width="38" height="13" rx="4" fill="#F07030" />
          <rect x="20" y="14" width="24" height="13" rx="4" fill="#F5A472" opacity="0.9" />
          <rect x="26" y="2" width="12" height="11" rx="3" fill="#FAC8A8" opacity="0.75" />
        </svg>
        <span
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          className="text-[16px] font-bold"
        >
          WareOS
        </span>
      </div>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            style={{
              backgroundColor: "var(--bg-off)",
              color: "var(--text-muted)",
              borderRadius: "9999px",
              width: "28px",
              height: "28px",
            }}
            className="flex items-center justify-center text-[10px] font-bold shrink-0"
            aria-label="User menu"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-400">
            <div className="flex flex-col gap-0.5">
              <span
                style={{ color: "var(--text-primary)" }}
                className="text-[13px] font-bold truncate"
              >
                {userEmail}
              </span>
              <span
                style={{
                  color: "var(--accent-color)",
                  backgroundColor: "var(--accent-tint)",
                  borderRadius: "4px",
                  padding: "1px 6px",
                  display: "inline-block",
                  width: "fit-content",
                }}
                className="text-[11px] font-bold capitalize"
              >
                {role}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            className="gap-2 cursor-pointer"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 3: Mount `MobileHeader` in layout and fix mobile padding**

In `src/app/t/[tenantSlug]/layout.tsx`:

```tsx
// Add import at top:
import { MobileHeader } from "@/components/layout/mobile-header";

// In the JSX, add MobileHeader just before Header and fix main padding:
<div className="flex-1 md:ml-[var(--sidebar-w)]">
  <MobileHeader />  {/* ← new */}
  <Header />
  <main
    style={{ paddingBottom: "calc(var(--mobile-nav-h) + 24px)" }}
    className="px-4 md:px-[var(--content-px)] py-5 md:py-6 md:pb-6"
  >
    {children}
  </main>
</div>
```

- [ ] **Step 4: Visual check at 375px**

In Playwright or browser DevTools, set width to 375px. Expected:
- Mobile header visible: WareOS logo + wordmark left, small initials avatar right
- No hamburger, no search bar, no desktop nav bar
- Desktop sidebar hidden

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/mobile-header.tsx src/app/t/[tenantSlug]/layout.tsx
git commit -m "feat(layout): add MobileHeader, hide desktop Header on mobile, fix mobile padding"
```

---

### Task 4: Role-aware `MobileBottomNav` — operator gets operator tabs

**Files:**
- Modify: `src/components/layout/mobile-bottom-nav.tsx`

The current tabs (Dashboard/Inventory/Sales/Purchases/More) are designed for managers/admins. The operator tab set is: **Home / Dispatch / Receive / Stock / More**.

Also fix the "Dashboard" tab's broken path — the root page is `/t/${slug}`, NOT `/t/${slug}/dashboard`.

```tsx
// src/components/layout/mobile-bottom-nav.tsx — full replacement
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Truck,
  Package,
  Layers,
  MoreHorizontal,
  BarChart3,
  ShoppingCart,
  ShoppingBag,
} from "lucide-react";
import { useTenant } from "./tenant-provider";

interface MobileNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export function MobileBottomNav() {
  const { tenantSlug, role } = useTenant();
  const pathname = usePathname();

  const operatorNavItems: MobileNavItem[] = [
    { label: "Home", icon: Home, path: `/t/${tenantSlug}` },
    { label: "Dispatch", icon: Truck, path: `/t/${tenantSlug}/transfers` },
    { label: "Receive", icon: Package, path: `/t/${tenantSlug}/purchases` },
    { label: "Stock", icon: Layers, path: `/t/${tenantSlug}/inventory` },
    { label: "More", icon: MoreHorizontal, path: `/t/${tenantSlug}/more` },
  ];

  const defaultNavItems: MobileNavItem[] = [
    { label: "Home", icon: Home, path: `/t/${tenantSlug}` },
    { label: "Inventory", icon: Layers, path: `/t/${tenantSlug}/inventory` },
    { label: "Sales", icon: ShoppingCart, path: `/t/${tenantSlug}/sales` },
    { label: "Purchases", icon: ShoppingBag, path: `/t/${tenantSlug}/purchases` },
    { label: "More", icon: MoreHorizontal, path: `/t/${tenantSlug}/more` },
  ];

  const navItems = role === "operator" ? operatorNavItems : defaultNavItems;

  function isActive(path: string): boolean {
    // Root path: exact match only to avoid root matching everything
    if (path === `/t/${tenantSlug}`) return pathname === path;
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
              color: active ? "var(--accent-color)" : "var(--text-dim)",
            }}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors"
            aria-label={label}
          >
            <Icon className="size-5 shrink-0" />
            <span style={{ fontWeight: active ? 700 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 1: Apply the replacement above**

- [ ] **Step 2: Verify in browser at 375px** — logged in as operator, Home tab active (orange), other tabs grey.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/mobile-bottom-nav.tsx
git commit -m "feat(nav): role-aware mobile bottom nav, fix Home tab path"
```

---

## Chunk 2: New features (activity API + OperatorHome + role-aware page)

### Task 5: `GET /api/v1/t/[tenantSlug]/my-activity` endpoint

**Files:**
- Create: `src/app/api/v1/t/[tenantSlug]/my-activity/route.ts`

Returns the authenticated user's last 20 audit log entries. Uses the existing `listAuditEntries` helper from `src/modules/audit-trail/queries/audit.ts` with `userId` filter.

Response shape:
```json
{
  "entries": [
    {
      "id": "uuid",
      "action": "create",
      "entityType": "transfer",
      "entityId": "uuid",
      "description": "Transfer #DSP-000047",
      "createdAt": "2026-03-13T07:30:00Z"
    }
  ]
}
```

`description` is computed server-side from `entityType` + `newData` (e.g. sequence number if present, else entity type label).

- [ ] **Step 1: Check the `listAuditEntries` signature**

Read `src/modules/audit-trail/queries/audit.ts` to confirm the `userId` filter parameter name and what fields are returned.

- [ ] **Step 2: Create the route**

```ts
// src/app/api/v1/t/[tenantSlug]/my-activity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/core/auth/guards";
import { listAuditEntries } from "@/modules/audit-trail/queries/audit";
import type { TenantContext } from "@/core/auth/types";

function buildDescription(entityType: string, newData: unknown): string {
  // Try to extract a human-readable label from stored data
  const data = newData as Record<string, unknown> | null | undefined;
  if (data?.sequenceNumber) return String(data.sequenceNumber);
  // Fallback: capitalise entity type
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

async function handler(req: NextRequest, ctx: TenantContext) {
  const { entries } = await listAuditEntries(ctx.tenantId, {
    userId: ctx.userId,
    limit: 20,
  });

  const result = entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    description: buildDescription(e.entityType, e.newData),
    createdAt: e.createdAt,
  }));

  return NextResponse.json({ entries: result });
}

export const GET = (req: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) =>
  withTenantContext(req, params, handler);
```

> **Note:** If `listAuditEntries` signature does not accept `{ userId, limit }` in an options object, adjust to match actual signature from the file you read in Step 1.

- [ ] **Step 3: Test the endpoint manually**

```bash
curl -s http://localhost:3000/api/v1/t/<slug>/my-activity \
  -H "Cookie: <paste auth cookie from browser devtools>" | jq .
```

Expected: `{ "entries": [...] }` — array may be empty for fresh accounts.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/t/[tenantSlug]/my-activity/route.ts
git commit -m "feat(api): add my-activity endpoint returning user's recent audit entries"
```

---

### Task 6: `OperatorHome` client component

**Files:**
- Create: `src/app/t/[tenantSlug]/operator-home.tsx`
- Modify: `src/app/t/[tenantSlug]/page.tsx`

This is the operator's home screen. It matches the mockup exactly:
1. Greeting "Good morning, [name]" + org name (tenant slug as placeholder until we have org name in context)
2. 2×2 quick-action grid (New Dispatch, Receive Goods, New Sale, View Stock)
3. "My Recent Activity" section with flat list rows

Install `date-fns` first:
```bash
pnpm add date-fns
```

- [ ] **Step 1: Install date-fns**

```bash
pnpm add date-fns
```

- [ ] **Step 2: Create `OperatorHome`**

```tsx
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
  // Best-effort: use part before @ or before first dot
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  const first = parts[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function OperatorHome({ tenantSlug }: { tenantSlug: string }) {
  const { userEmail, tenantId } = useTenant();
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
              style={{ color: primary ? "#FFFFFF" : "var(--accent-color)" }}
            />
            <span
              style={{ color: primary ? "#FFFFFF" : "var(--text-primary)" }}
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
```

- [ ] **Step 3: Make `page.tsx` role-aware**

```tsx
// src/app/t/[tenantSlug]/page.tsx
import { headers } from "next/headers";
import { DashboardClient } from "./dashboard-client";
import { OperatorHome } from "./operator-home";

export default async function TenantRootPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  const role = headersList.get("x-tenant-role") ?? "";

  if (role === "operator") {
    return (
      <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
        <OperatorHome tenantSlug={tenantSlug} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--bg-off)" }} className="min-h-full">
      <DashboardClient tenantSlug={tenantSlug} />
    </div>
  );
}
```

- [ ] **Step 4: Visual check**

Log in as an operator user. At 375px:
- Header: WareOS wordmark + avatar
- Greeting: "Good morning, [name]" + tenant slug
- 2×2 grid: "New Dispatch" (orange background), 3 secondary cards (off-white)
- Activity section: rows with seq-number + type badge + relative time
- Bottom nav: Home/Dispatch/Receive/Stock/More — Home tab highlighted

- [ ] **Step 5: Commit**

```bash
git add src/app/t/[tenantSlug]/operator-home.tsx src/app/t/[tenantSlug]/page.tsx
git commit -m "feat: add OperatorHome component with greeting, quick-actions, and activity feed"
```

---

## Chunk 3: Polish and edge cases

### Task 7: Verify mobile layout padding at all breakpoints

**Files:**
- Verify: `src/app/t/[tenantSlug]/layout.tsx` (already updated in Task 3)

The `main` tag padding was updated in Task 3 to `px-4 md:px-[var(--content-px)]`. This task confirms it looks correct for all key pages.

- [ ] **Step 1: Check in browser at 375px**

Visit: `/t/${slug}` (operator home), `/t/${slug}/inventory`, `/t/${slug}/transfers`
- Content left/right padding should be 16px on mobile, 28px on desktop
- No content clipped by the mobile bottom nav (bottom padding `calc(var(--mobile-nav-h) + 24px)` applied via `style` prop already)

- [ ] **Step 2: Check long table pages don't overflow horizontally**

Visit `/t/${slug}/inventory` — tables should be horizontally scrollable if they overflow:
```tsx
// If any page's table wrapper lacks overflow: look for patterns like:
// <div className="overflow-x-auto">
//   <table ...>
```
If any inventory/purchases/sales table is not wrapped in `overflow-x-auto`, add it. Note which files you needed to change.

- [ ] **Step 3: Commit any overflow fixes**

```bash
git add <any changed table files>
git commit -m "fix(mobile): wrap overflow tables in overflow-x-auto for narrow viewports"
```

---

### Task 8: Final Playwright visual review

- [ ] **Step 1: Take screenshot of operator home at 375×812**

Using Playwright MCP (`mcp__plugin_playwright_playwright__browser_*`):
1. `browser_navigate` → `http://localhost:3000/t/<slug>`
2. `browser_resize` → width: 375, height: 812
3. `browser_take_screenshot` → save to `screenshots/operator-home-375-final.png`

- [ ] **Step 2: Compare against mockup**

Open `.claude/context/mockup-user-mobile.html` and compare:
- [ ] Mobile header: WareOS logo + wordmark (left), small grey avatar (right)
- [ ] Greeting + org name visible
- [ ] 2×2 quick-action grid: first card orange, rest off-white
- [ ] "My Recent Activity" section label (uppercase, grey)
- [ ] Activity rows: seq-number (mono, bold) + type badge (colored pill) + relative time (right-aligned)
- [ ] Bottom nav: 5 tabs, Home active in orange

- [ ] **Step 3: If any token or spacing is wrong, fix and re-screenshot**

Ensure zero hardcoded hex colors — all must use CSS variables (`var(--...)`).

- [ ] **Step 4: Final commit**

```bash
git add screenshots/operator-home-375-final.png
git commit -m "chore: add operator mobile final screenshot"
```

---

## Summary of what the system currently had vs. what this plan changes

| Current system | After this plan |
|---------------|-----------------|
| `Header` renders on mobile (hamburger + search bar) | Desktop Header hidden on mobile; new `MobileHeader` renders instead |
| Bottom nav tabs: Dashboard/Inventory/Sales/Purchases/More | Role-aware: Operator gets Home/Dispatch/Receive/Stock/More |
| "Dashboard" tab links to `/t/${slug}/dashboard` (404) | All roles: "Home" tab links to `/t/${slug}` (correct root) |
| `/t/${slug}/more` returns 404 | Stub More page created |
| Operator sees analytics KPI cards + charts (not relevant to their job) | Operator sees greeting + quick-action grid + personal activity feed |
| Mobile padding: 28px (desktop value) | Mobile padding: 16px; desktop: 28px |
| `operator` role cannot create transfers | `transfers:create` added to `OPERATOR_PERMISSIONS` |
| No `/api/v1/t/[slug]/my-activity` endpoint | Endpoint returns user's 20 most recent audit entries |
