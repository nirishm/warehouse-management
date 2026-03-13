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
