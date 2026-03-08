# Tenant Dashboard Home Page

## Context

The current dashboard at `src/app/t/[tenantSlug]/page.tsx` is minimal — 3 stat cards and an alert widget. The user wants a rich, filterable dashboard matching the layout in `tmp/final/tenant-dashboard.html`: KPI cards, recent transactions table, stock-by-location bars, shortage alerts panel, and activity feed — all filterable by date range, location, and commodity.

---

## Files to Create

| # | File | Purpose |
|---|------|---------|
| 1 | `src/modules/analytics/queries/dashboard.ts` | Server-side query functions with filter support |
| 2 | `src/components/ui/date-range-picker.tsx` | Reusable Popover + Calendar range picker |
| 3 | `src/app/t/[tenantSlug]/dashboard-home.tsx` | Main client component with filters + all sections |

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `src/app/t/[tenantSlug]/page.tsx` | Rewrite: fetch all dashboard data, pass to `DashboardHome` |

---

## Architecture

```
page.tsx (server) — resolves tenant, reads searchParams, fetches data via Promise.all
  └─ DashboardHome (client) — filter bar + 4 layout sections
       ├─ DateRangePicker — Popover + Calendar(mode="range")
       ├─ KPI row (4 cards)
       ├─ Recent Transactions table (left) + Stock by Location bars (right)
       └─ Shortage Alerts (left) + Activity Feed (right)
```

**Data flow**: Server fetches → props → client renders. Filters via URL searchParams (same pattern as `inventory/stock-table.tsx`).

---

## Phase 1: Query Layer — `src/modules/analytics/queries/dashboard.ts`

### Filter interface
```ts
interface DashboardFilters {
  dateFrom?: string;   // ISO date
  dateTo?: string;     // ISO date
  locationId?: string; // UUID
  commodityId?: string; // UUID
  allowedLocationIds?: string[] | null; // from user permissions
}
```

### Functions to create

1. **`getDashboardKpis(schemaName, filters)`** → `{ totalStockItems, movementsInRange, activeAlerts, activeLocations }`
   - `totalStockItems`: SUM of `current_stock` from `stock_levels` (filtered by location/commodity)
   - `movementsInRange`: COUNT of dispatches + purchases + sales in date range
   - `activeAlerts`: critical + warning count from alert thresholds vs stock levels
   - `activeLocations`: COUNT DISTINCT location_id from stock_levels with stock > 0

2. **`getRecentTransactions(schemaName, filters, limit=8)`** → transaction rows
   - UNION query across dispatches, purchases, sales (like `getMovementSummary` but with commodity/quantity data from items tables)
   - Filter by date range, location, commodity
   - Returns: `{ type, number, status, date, commodityName, quantity, unit, locationName }`

3. **`getStockByLocation(schemaName, filters)`** → location bar data
   - GROUP BY location from `stock_levels`, join `locations` for names
   - Returns: `{ locationId, locationName, locationCode, totalStock, commodityCount, hasShortage }`
   - `hasShortage` via LEFT JOIN on `stock_alert_thresholds`

4. **`getShortageAlerts(schemaName, filters, limit=5)`** → top alerts
   - Reuse logic from `getStockAlerts()` in `alerts.ts` but filter to CRITICAL+WARNING only
   - Filter by locationId if set
   - Returns: commodity name, location, current vs threshold, severity

5. **`getRecentActivity(schemaName, filters, limit=7)`** → audit entries
   - Reuse `listAuditEntries` from `audit-log.ts` with date range filter
   - Returns action, entity_type, user_name, created_at, summary

### Reuse existing (no changes needed):
- `getLocationsForFilter(schemaName)` from `stock.ts` — dropdown data
- `getCommoditiesForFilter(schemaName)` from `stock.ts` — dropdown data

---

## Phase 2: Date Range Picker — `src/components/ui/date-range-picker.tsx`

Built with existing `Popover` + `Calendar` (which already supports `mode="range"` with proper range styling).

```
Popover
  PopoverTrigger → Button with CalendarDays icon + "Mar 1 – Mar 8" + ChevronDown
  PopoverContent (wider than default w-72)
    Preset row: Today | 7 days | 30 days | This month
    Calendar(mode="range", numberOfMonths={2})
    Footer: Clear button
```

- On date selection, immediately updates URL params (`dateFrom`, `dateTo`)
- Presets: compute dates and push to URL
- Display: format range as "MMM d – MMM d, yyyy" or "All time" when no filter

---

## Phase 3: Dashboard Client — `src/app/t/[tenantSlug]/dashboard-home.tsx`

### Props
```ts
interface DashboardHomeProps {
  tenantSlug: string;
  tenantName: string;
  kpis: { totalStockItems: number; movementsInRange: number; activeAlerts: number; activeLocations: number };
  recentTransactions: RecentTransaction[];
  stockByLocation: StockByLocationRow[];
  shortageAlerts: ShortageAlert[];
  recentActivity: ActivityEntry[];
  locations: { id: string; name: string; code: string }[];
  commodities: { id: string; name: string; code: string }[];
  activeFilters: { dateFrom?: string; dateTo?: string; locationId?: string; commodityId?: string };
}
```

### Layout (matching mockup)

**Header**: "Dashboard" title (left) + filter pills (right: DateRangePicker, Location select, Commodity select)

**KPI row**: `grid grid-cols-2 lg:grid-cols-4 gap-4`
- Card: `bg-[var(--bg-base)] border-border rounded-xl`
- Label: `text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]` + icon
- Value: `font-serif text-[28px] text-[var(--text-primary)]` (Hedvig Letters for KPIs)
- Subtitle: `text-xs text-[var(--text-muted)]`

**Mid section**: `grid grid-cols-1 lg:grid-cols-[1fr_0.65fr] gap-4`
- Left — **Recent Transactions**: Table with type badge (rect `rounded-md`), status badge (pill `rounded-full`), commodity, quantity, location, date
- Right — **Stock by Location**: Card with stacked bars (CSS div bars, no chart library). Each row: location name, bar width proportional to stock, count label. Shortage tag if applicable.

**Bottom row**: `grid grid-cols-1 lg:grid-cols-2 gap-4`
- Left — **Shortage Alerts**: List of top 5 alerts with severity dot, commodity name, location, current/threshold values
- Right — **Activity Feed**: Timeline with colored action dots, entity description, timestamp

### Filter pattern (from stock-table.tsx)
```ts
const updateFilter = useCallback((key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString());
  if (value) params.set(key, value); else params.delete(key);
  router.push(`${pathname}?${params.toString()}`);
}, [router, pathname, searchParams]);
```

### "View all" links
- KPI alerts → `/t/{slug}/stock-alerts`
- Recent Transactions → `/t/{slug}/analytics`
- Shortage Alerts → `/t/{slug}/stock-alerts`
- Activity Feed → `/t/{slug}/audit-log`

---

## Phase 4: Server Page — `src/app/t/[tenantSlug]/page.tsx`

Rewrite to:
1. Accept `searchParams` promise (Next.js 15 pattern)
2. Resolve tenant (existing pattern)
3. Resolve `allowedLocationIds` from `user_locations` (same as `layout.tsx` lines 60-68)
4. `Promise.all` fetch: KPIs, transactions, stock-by-location, alerts, activity, filter dropdowns
5. Render `<DashboardHome>` with all props

---

## Design System Compliance (`.claude/context/design-principles.md`)

Every element must pass the 7 Non-Negotiable Rules:

| Rule | Dashboard Application |
|------|----------------------|
| **1. White cards on off-white** | All cards `bg-[var(--bg-base)]`, page `bg-[var(--bg-off)]` |
| **2. Typography roles absolute** | KPI values: `font-serif` (Hedvig Letters Serif), 28px, `-0.5px` tracking. Table headers: `font-mono` (Space Mono), 10px, uppercase, `--text-dim`, `0.08em` tracking. All other text: Rethink Sans (default). Sequence numbers: `font-mono`, bold, 11-12px, `--accent-color` on active |
| **3. Orange marks interaction** | Filter buttons use `--accent-color` focus ring. CTA buttons: pill (`rounded-full`), `h-[var(--btn-h)]`. Date range picker trigger: `border-[var(--accent-color)]` when active. Focused inputs: `border-color: var(--accent-color); box-shadow: 0 0 0 3px rgba(244,95,0,0.1)` |
| **4. Orange left-border = active nav** | N/A (sidebar handles this) |
| **5. Status badges pill; type labels rect** | Status badges (received/dispatched/confirmed/cancelled): `rounded-full`. Type badges (DISPATCH/PURCHASE/SALE): `rounded-md` (4px) |
| **6. `--accent-color` is canonical** | All orange references use `var(--accent-color)` never `var(--accent)`. Tint surfaces use `var(--accent-tint)` or `var(--orange-bg)` |
| **7. Never inline colors** | All colors via CSS custom properties. Zero hardcoded hex values |

### KPI Card Spec (from design-principles.md §IV)
- Value: Hedvig Letters Serif, `--fs-2xl` (28px), `--kpi-letter-spacing: -0.5px`
- Label: Rethink Sans, `--fs-sm` (12px), `--text-muted`
- On white (`--bg-base`) card with `--card-padding: 20px`

### Status Colors
| Status | Text token | Background token |
|--------|-----------|-----------------|
| received/confirmed | `--green` | `--green-bg` (8%) |
| dispatched/in_transit | `--accent-color` / `--blue` | `--orange-bg` / `--blue-bg` |
| cancelled | muted | muted |
| critical alert | `--red` | `--red-bg` |
| warning alert | `--accent-color` | `--orange-bg` |

### Type Badge Colors
| Type | Text | Background |
|------|------|-----------|
| Dispatch | `--accent-color` | `--orange-bg` |
| Purchase | `--blue` | `--blue-bg` |
| Sale | `--green` | `--green-bg` |

### Responsive Breakpoints
- Desktop (1440px): 4-col KPI, 2-col mid section, 2-col bottom
- Tablet (768px): 2-col KPI, 1-col everything else
- Mobile (375px): 1-col everything, compact card padding

---

## Implementation Order

1. Create `dashboard.ts` queries (with DashboardFilters type)
2. Create `date-range-picker.tsx`
3. Create `dashboard-home.tsx` client component
4. Rewrite `page.tsx` server component
5. Responsive polish + empty states

---

## Verification

1. `pnpm build` — zero new TypeScript errors
2. Navigate to `http://localhost:3000/t/{slug}` — visual check at 1440px and 375px
3. Test filters: date range, location dropdown, commodity dropdown
4. Verify location-scoped users see only their locations
5. Check "View all" links navigate correctly
6. Browser console — zero JS errors

---

## Key Decisions

- **No "Total Stock Value"**: The mockup shows currency, but `stock_levels` has no price data. Using "Total Stock Items" (quantity sum) instead.
- **No chart library**: Stock-by-location uses CSS bars (div width percentages), matching the mockup exactly.
- **SQL via `exec_sql` RPC**: Complex UNION/JOIN queries use the existing `exec_sql` pattern (as used in analytics.ts and alerts.ts) rather than fighting the Supabase query builder.
- **Calendar range mode**: Already supported by the existing `calendar.tsx` with `react-day-picker`.
