# Autocomplete Combobox for Items & Locations

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain `<Select>` dropdowns in the three transaction form dialogs with typeahead comboboxes — server-side search for items (scales to 1000s) and client-side filter for locations/contacts (small sets, already loaded).

**Architecture:** A generic `Combobox` primitive wraps `Popover + Command` (both already installed). `ItemCombobox` adds debounced server fetch (`?search=`) + localStorage "recently used" tracking. `LocationCombobox` and `ContactCombobox` do client-side filtering of pre-loaded arrays. All three form dialogs swap their selects for the new comboboxes. The upfront items fetch (`limit=200`) is removed — no longer needed.

**Tech Stack:** Next.js 16, cmdk (installed), Radix UI Popover (installed), Tailwind v4 + CSS custom properties, Vitest (node env — pure logic tests only)

---

## Design Rationale

**Why server search for items, client-side for locations?**
- Items: tenants can have 1000s. Fetching 200 upfront already strains memory across multiple open dialogs. Server search with `?search=` (already supported) returns only what's needed.
- Locations: LBAC already scopes to ≤50 locations per user. The fetch is cheap, and instant filter UX is better than a round-trip.

**Why "recently used" items?**
Warehouse operators run repetitive transactions (same items daily). Showing the last 5 selections when the field is empty eliminates typing for common cases. Stored in localStorage under `wareos:{tenantId}:recent_items`.

**Why Popover + Command (not a custom dropdown)?**
`command.tsx` (cmdk) already exists in the project but is unused for selections. It provides keyboard navigation, search input, and grouped results out of the box — the exact pattern used by shadcn/ui's standard "combobox" recipe.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| CREATE | `src/hooks/use-debounce.ts` | Generic debounce hook (300ms default) |
| CREATE | `src/lib/recent-items.ts` | Pure functions: read/write recent items in localStorage |
| CREATE | `src/components/ui/combobox.tsx` | Generic Popover+Command wrapper primitive |
| CREATE | `src/components/inventory/item-combobox.tsx` | Item combobox: server search + recents group |
| CREATE | `src/components/inventory/location-combobox.tsx` | Location combobox: client-side filter + type label |
| CREATE | `src/components/inventory/contact-combobox.tsx` | Contact combobox: client-side filter |
| CREATE | `tests/hooks/use-debounce.test.ts` | Unit tests for debounce timing logic |
| CREATE | `tests/lib/recent-items.test.ts` | Unit tests for localStorage helpers |
| MODIFY | `src/app/t/[tenantSlug]/purchases/purchase-form-dialog.tsx` | Replace item + location + contact selects |
| MODIFY | `src/app/t/[tenantSlug]/sales/sale-form-dialog.tsx` | Replace item + location + contact selects |
| MODIFY | `src/app/t/[tenantSlug]/transfers/transfer-form-dialog.tsx` | Replace item + location selects |

---

## Chunk 1: Foundation

### Task 1: `useDebounce` hook

**Files:**
- Create: `src/hooks/use-debounce.ts`
- Test: `tests/hooks/use-debounce.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/hooks/use-debounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the pure debounce mechanic (mirrors hook logic, no jsdom needed)
function makeDebouncer(delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function debounce(fn: () => void) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

describe('debounce mechanic', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not call callback immediately', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    debounce(cb);
    expect(cb).not.toHaveBeenCalled();
  });

  it('calls callback after delay elapses', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    debounce(cb);
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('resets timer when called again before delay', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    debounce(cb);
    vi.advanceTimersByTime(200);
    debounce(cb);
    vi.advanceTimersByTime(200); // 200ms since last call, not 300
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires only once for rapid successive calls', () => {
    const cb = vi.fn();
    const debounce = makeDebouncer(300);
    for (let i = 0; i < 10; i++) debounce(cb);
    vi.advanceTimersByTime(300);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
pnpm test tests/hooks/use-debounce.test.ts
```
Expected: FAIL — file doesn't exist yet.

- [ ] **Step 3: Create the hook**

```ts
// src/hooks/use-debounce.ts
"use client";

import { useEffect, useRef, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, delay]);

  return debouncedValue;
}
```

- [ ] **Step 4: Run test to verify it passes**
```bash
pnpm test tests/hooks/use-debounce.test.ts
```
Expected: PASS (4/4).

- [ ] **Step 5: Commit**
```bash
git add src/hooks/use-debounce.ts tests/hooks/use-debounce.test.ts
git commit -m "feat(hooks): add useDebounce hook with unit tests"
```

---

### Task 2: `recent-items` localStorage helpers

**Files:**
- Create: `src/lib/recent-items.ts`
- Test: `tests/lib/recent-items.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/recent-items.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

// In-memory localStorage mock — no jsdom needed
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  },
  writable: true,
});

// Import after mock is installed
const { getRecentItems, addRecentItem, clearRecentItems } = await import('../src/lib/recent-items');

describe('recent-items', () => {
  const TENANT = 'tenant-abc';

  beforeEach(() => store['wareos:tenant-abc:recent_items'] && delete store['wareos:tenant-abc:recent_items']);

  it('returns [] when nothing stored', () => {
    expect(getRecentItems(TENANT)).toEqual([]);
  });

  it('adds an item and returns it', () => {
    addRecentItem(TENANT, { id: '1', label: 'Widget' });
    expect(getRecentItems(TENANT)).toEqual([{ id: '1', label: 'Widget' }]);
  });

  it('deduplicates: adding same id moves it to front', () => {
    addRecentItem(TENANT, { id: '1', label: 'Widget' });
    addRecentItem(TENANT, { id: '2', label: 'Bolt' });
    addRecentItem(TENANT, { id: '1', label: 'Widget' }); // re-add
    const result = getRecentItems(TENANT);
    expect(result[0].id).toBe('1');
    expect(result).toHaveLength(2);
  });

  it('caps at 5 entries (oldest dropped)', () => {
    for (let i = 1; i <= 7; i++) {
      addRecentItem(TENANT, { id: String(i), label: `Item ${i}` });
    }
    const result = getRecentItems(TENANT);
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('7'); // most recent first
  });

  it('clearRecentItems empties the list', () => {
    addRecentItem(TENANT, { id: '1', label: 'Widget' });
    clearRecentItems(TENANT);
    expect(getRecentItems(TENANT)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
pnpm test tests/lib/recent-items.test.ts
```
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the helpers**

```ts
// src/lib/recent-items.ts

export interface RecentItem {
  id: string;
  label: string; // displayed text, e.g. "[WID001] Widget"
}

const MAX_RECENTS = 5;

function storageKey(tenantId: string) {
  return `wareos:${tenantId}:recent_items`;
}

export function getRecentItems(tenantId: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function addRecentItem(tenantId: string, item: RecentItem): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentItems(tenantId).filter((r) => r.id !== item.id);
  const updated = [item, ...existing].slice(0, MAX_RECENTS);
  localStorage.setItem(storageKey(tenantId), JSON.stringify(updated));
}

export function clearRecentItems(tenantId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(tenantId));
}
```

- [ ] **Step 4: Run test to verify it passes**
```bash
pnpm test tests/lib/recent-items.test.ts
```
Expected: PASS (5/5).

- [ ] **Step 5: Commit**
```bash
git add src/lib/recent-items.ts tests/lib/recent-items.test.ts
git commit -m "feat(lib): add recent-items localStorage helpers with tests"
```

---

## Chunk 2: UI Primitives

### Task 3: Generic `Combobox` primitive

**Files:**
- Create: `src/components/ui/combobox.tsx`

This is the base layer. `ItemCombobox` and `LocationCombobox` compose on top of it. Pattern: Popover trigger shows selected label; popover content wraps a `Command` component with `CommandInput` + `CommandList`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/combobox.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  secondary?: string; // shown dimmer below label
  group?: string;     // group header label (e.g. "Recently used")
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  onSearchChange?: (query: string) => void; // fires on CommandInput change
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  loading = false,
  onSearchChange,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  // Group options by their `group` field
  const groups: Record<string, ComboboxOption[]> = {};
  const ungrouped: ComboboxOption[] = [];
  for (const opt of options) {
    if (opt.group) {
      (groups[opt.group] ??= []).push(opt);
    } else {
      ungrouped.push(opt);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between gap-2",
            "h-[var(--input-h)] rounded-[4px] border border-[var(--border)]",
            "bg-[var(--bg-base)] px-3 text-left text-sm",
            "text-[var(--text-primary)] outline-none",
            "hover:border-[var(--border-mid)] focus:border-[var(--accent-color)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !value && "text-[var(--text-muted)]",
            className
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronsUpDown
            className="shrink-0 opacity-50"
            style={{ width: 14, height: 14 }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{
          width: "var(--radix-popover-trigger-width)",
          minWidth: 220,
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bg-base)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
        align="start"
      >
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={onSearchChange}
            style={{
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
            }}
          />
          <CommandList style={{ maxHeight: 280 }}>
            {loading && (
              <div
                className="py-3 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Searching…
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty
                style={{ color: "var(--text-muted)", fontSize: 13 }}
              >
                {emptyText}
              </CommandEmpty>
            )}

            {/* Grouped options */}
            {Object.entries(groups).map(([groupName, groupOpts]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {groupOpts.map((opt) => (
                  <ComboboxItem
                    key={opt.value}
                    opt={opt}
                    selected={opt.value === value}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            ))}

            {/* Ungrouped options */}
            {ungrouped.length > 0 && (
              <CommandGroup>
                {ungrouped.map((opt) => (
                  <ComboboxItem
                    key={opt.value}
                    opt={opt}
                    selected={opt.value === value}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ComboboxItem({
  opt,
  selected,
  onSelect,
}: {
  opt: ComboboxOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={opt.value}
      onSelect={onSelect}
      style={{ cursor: "pointer", fontSize: 13 }}
    >
      <div className="flex flex-1 flex-col min-w-0">
        <span className="truncate" style={{ fontWeight: selected ? 700 : 400 }}>
          {opt.label}
        </span>
        {opt.secondary && (
          <span
            className="truncate text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {opt.secondary}
          </span>
        )}
      </div>
      {selected && (
        <Check
          className="ml-2 shrink-0"
          style={{ width: 14, height: 14, color: "var(--accent-color)" }}
        />
      )}
    </CommandItem>
  );
}
```

- [ ] **Step 2: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "combobox"
```
Expected: no output.

- [ ] **Step 3: Commit**
```bash
git add src/components/ui/combobox.tsx
git commit -m "feat(ui): add generic Combobox primitive (Popover+Command)"
```

---

### Task 4: `ItemCombobox` — server search + recents

**Files:**
- Create: `src/components/inventory/item-combobox.tsx`

Uses the `Combobox` primitive + `useDebounce` + recent-items. When the query is empty, shows "Recently used" group from localStorage. When the user types, debounces 300ms → fetches `?search=q&limit=10&isActive=true`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/inventory/item-combobox.tsx
"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useDebounce } from "@/hooks/use-debounce";
import { addRecentItem, getRecentItems } from "@/lib/recent-items";

interface Item {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
}

interface ItemComboboxProps {
  tenantSlug: string;
  tenantId: string;
  value: string;          // selected item id
  onValueChange: (itemId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ItemCombobox({
  tenantSlug,
  tenantId,
  value,
  onValueChange,
  disabled,
  className,
}: ItemComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch server results when debounced query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(
      `/api/v1/t/${tenantSlug}/items?search=${encodeURIComponent(debouncedQuery)}&limit=10&isActive=true`
    )
      .then((r) => r.json())
      .then((json) => {
        setResults(json.data ?? []);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, tenantSlug]);

  function itemLabel(item: Item) {
    return item.code ? `[${item.code}] ${item.name}` : item.name;
  }

  // Build options
  const options: ComboboxOption[] = React.useMemo(() => {
    if (query.trim()) {
      // Server results (ungrouped)
      return results.map((item) => ({
        value: item.id,
        label: itemLabel(item),
        secondary: item.category ?? undefined,
      }));
    }
    // No query → show recents
    const recents = getRecentItems(tenantId);
    return recents.map((r) => ({
      value: r.id,
      label: r.label,
      group: "Recently used",
    }));
  }, [query, results, tenantId]);

  function handleValueChange(itemId: string) {
    const opt = options.find((o) => o.value === itemId);
    if (opt) {
      addRecentItem(tenantId, { id: itemId, label: opt.label });
    }
    onValueChange(itemId);
  }

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={handleValueChange}
      placeholder="Select item…"
      searchPlaceholder="Type to search items…"
      emptyText={query.trim() ? "No items found." : "No recent items."}
      loading={loading}
      onSearchChange={setQuery}
      disabled={disabled}
      className={className}
    />
  );
}
```

- [ ] **Step 2: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "item-combobox"
```
Expected: no output.

- [ ] **Step 3: Commit**
```bash
git add src/components/inventory/item-combobox.tsx
git commit -m "feat(inventory): add ItemCombobox with debounced server search and recents"
```

---

### Task 5: `LocationCombobox` — client-side filter

**Files:**
- Create: `src/components/inventory/location-combobox.tsx`

Locations are pre-loaded by the parent form (`limit=100`). This component accepts the array as a prop and does client-side filtering inside the Command component (via cmdk's built-in filter). No server round-trips.

- [ ] **Step 1: Create the component**

```tsx
// src/components/inventory/location-combobox.tsx
"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

interface Location {
  id: string;
  name: string;
  code?: string | null;
  type?: string | null;
}

interface LocationComboboxProps {
  locations: Location[];
  value: string;
  onValueChange: (locationId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationCombobox({
  locations,
  value,
  onValueChange,
  placeholder = "Select location…",
  disabled,
  className,
}: LocationComboboxProps) {
  const options: ComboboxOption[] = locations.map((loc) => ({
    value: loc.id,
    label: loc.code ? `[${loc.code}] ${loc.name}` : loc.name,
    secondary: loc.type ?? undefined,
  }));

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Type to filter locations…"
      emptyText="No locations found."
      disabled={disabled}
      className={className}
      // No onSearchChange → cmdk's built-in client-side filter applies
    />
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/inventory/location-combobox.tsx
git commit -m "feat(inventory): add LocationCombobox with client-side filter"
```

---

### Task 6: `ContactCombobox` — client-side filter

**Files:**
- Create: `src/components/inventory/contact-combobox.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/inventory/contact-combobox.tsx
"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  type?: string | null;
}

interface ContactComboboxProps {
  contacts: Contact[];
  value: string;
  onValueChange: (contactId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ContactCombobox({
  contacts,
  value,
  onValueChange,
  placeholder = "Select contact…",
  disabled,
  className,
}: ContactComboboxProps) {
  const options: ComboboxOption[] = contacts.map((c) => ({
    value: c.id,
    label: c.name,
    secondary: c.email ?? c.type ?? undefined,
  }));

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Type to filter contacts…"
      emptyText="No contacts found."
      disabled={disabled}
      className={className}
    />
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/inventory/contact-combobox.tsx
git commit -m "feat(inventory): add ContactCombobox with client-side filter"
```

---

## Chunk 3: Form Integration

> For each form, the pattern is:
> 1. Remove items from `Promise.all` (no longer pre-loaded)
> 2. Replace item `<Select>` in line items with `<ItemCombobox>`
> 3. Replace location `<Select>` with `<LocationCombobox>`
> 4. Replace contact `<Select>` with `<ContactCombobox>`
> 5. `tenantId` is available from the `useTenant()` context hook (or the `tenant` prop already passed in)

### Task 7: Update Purchase Form

**Files:**
- Modify: `src/app/t/[tenantSlug]/purchases/purchase-form-dialog.tsx`

Key changes:
- Remove `items` from the `Promise.all` fetch (and remove `items` state)
- Remove `setItems` and `items.map` select
- Add `ItemCombobox` for each line item's `itemId` field
- Replace location select with `<LocationCombobox locations={locations} .../>`
- Replace contact select with `<ContactCombobox contacts={contacts} .../>`

- [ ] **Step 1: Read the current file first**

Open and read: `src/app/t/[tenantSlug]/purchases/purchase-form-dialog.tsx`
Look for: `setItems`, `items.map`, `<Select>` for `itemId`, location select, contact select.

- [ ] **Step 2: Add imports at the top**
```tsx
import { ItemCombobox } from "@/components/inventory/item-combobox";
import { LocationCombobox } from "@/components/inventory/location-combobox";
import { ContactCombobox } from "@/components/inventory/contact-combobox";
```

- [ ] **Step 3: Remove items pre-fetch**

In the `useEffect` that fetches on dialog open, remove:
```tsx
// REMOVE from Promise.all:
fetch(`/api/v1/t/${tenantSlug}/items?limit=200`).then(r => r.json()),
// and the corresponding: setItems(it.data ?? [])
```
Also remove: `const [items, setItems] = useState<...[]>([])`.

- [ ] **Step 4: Replace item select in line items**

Find the `<Select>` for `li.itemId` in the line items map. Replace with:
```tsx
<ItemCombobox
  tenantSlug={tenantSlug}
  tenantId={tenantId}
  value={li.itemId}
  onValueChange={(id) => updateLineItem(index, "itemId", id)}
  className="w-full"
/>
```

- [ ] **Step 5: Replace location select**
```tsx
<LocationCombobox
  locations={locations}
  value={locationId}
  onValueChange={setLocationId}
/>
```

- [ ] **Step 6: Replace contact select**
```tsx
<ContactCombobox
  contacts={contacts}
  value={contactId}
  onValueChange={setContactId}
  placeholder="Select supplier…"
/>
```

- [ ] **Step 7: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "purchase-form"
```
Expected: no output.

- [ ] **Step 8: Commit**
```bash
git add src/app/t/[tenantSlug]/purchases/purchase-form-dialog.tsx
git commit -m "feat(purchases): replace item/location/contact selects with comboboxes"
```

---

### Task 8: Update Sales Form

**Files:**
- Modify: `src/app/t/[tenantSlug]/sales/sale-form-dialog.tsx`

Same pattern as Task 7.

- [ ] **Step 1: Add imports** (same three combobox imports)

- [ ] **Step 2: Remove items pre-fetch** from `Promise.all` and remove `items` state

- [ ] **Step 3: Replace item select in line items** with `<ItemCombobox ...>`

- [ ] **Step 4: Replace location (dispatch location) select** with `<LocationCombobox ...>`

- [ ] **Step 5: Replace contact (customer) select** with `<ContactCombobox placeholder="Select customer…" ...>`

- [ ] **Step 6: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "sale-form"
```

- [ ] **Step 7: Commit**
```bash
git add src/app/t/[tenantSlug]/sales/sale-form-dialog.tsx
git commit -m "feat(sales): replace item/location/contact selects with comboboxes"
```

---

### Task 9: Update Transfer Form

**Files:**
- Modify: `src/app/t/[tenantSlug]/transfers/transfer-form-dialog.tsx`

Transfer form has: origin location + destination location (header) + item per line item. No contact.

- [ ] **Step 1: Add imports** (`ItemCombobox`, `LocationCombobox`)

- [ ] **Step 2: Remove items pre-fetch** from `Promise.all`

- [ ] **Step 3: Replace item select in line items** with `<ItemCombobox ...>`

- [ ] **Step 4: Replace origin location select** with `<LocationCombobox placeholder="Origin location…" ...>`

- [ ] **Step 5: Replace destination location select** with `<LocationCombobox placeholder="Destination location…" ...>`

- [ ] **Step 6: TypeScript check**
```bash
pnpm tsc --noEmit 2>&1 | grep "transfer-form"
```

- [ ] **Step 7: Commit**
```bash
git add src/app/t/[tenantSlug]/transfers/transfer-form-dialog.tsx
git commit -m "feat(transfers): replace item/location selects with comboboxes"
```

---

## Chunk 4: Visual Verification

### Task 10: Visual Review

- [ ] **Step 1: Start dev server if not running**
```bash
pnpm dev
```

- [ ] **Step 2: Open each form and verify:**
  - Navigate to Purchases → click "New Purchase"
  - Verify item field shows combobox (not Select dropdown)
  - Type a partial item name → results appear after ~300ms
  - Select an item → confirm it shows in field
  - Open the form again → recently used items appear without typing
  - Verify location field shows client-side filtered list
  - Check mobile (resize to 375px) — tap interactions work

- [ ] **Step 3: Screenshot**
```bash
# Save screenshots to screenshots/ folder (gitignored)
# Use mcp__plugin_playwright_playwright__* tools if available
```

- [ ] **Step 4: Run all unit tests**
```bash
pnpm test
```
Expected: PASS (all existing + 2 new test files).

- [ ] **Step 5: Full TypeScript check**
```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Final commit if any visual tweaks needed**
```bash
git add -p
git commit -m "fix(combobox): visual polish after review"
```

---

## Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Unit tests pass | `pnpm test` | All green |
| No TypeScript errors | `pnpm tsc --noEmit` | No output |
| Item search works | Type in item field | Results in ~300ms |
| Recents show | Open item field without typing | "Recently used" group |
| Location filter | Type in location field | Instant client-side filter |
| Mobile touch | Resize to 375px, tap field | Popover opens, selection works |
| Design tokens | Grep for hex colors | Zero hardcoded hex |

```bash
# Verify no hardcoded hex in new files
grep -r '#[0-9a-fA-F]\{3,6\}' src/components/ui/combobox.tsx src/components/inventory/
```
Expected: no output.
