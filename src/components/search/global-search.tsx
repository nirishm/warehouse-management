"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/components/layout/tenant-provider";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Package, MapPin, Users } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  sub?: string;
}

interface SearchResults {
  items: SearchResult[];
  contacts: SearchResult[];
  locations: SearchResult[];
}

interface GlobalSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalSearch({ open: controlledOpen, onOpenChange }: GlobalSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  function setOpen(value: boolean) {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    items: [],
    contacts: [],
    locations: [],
  });
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tenantSlug } = useTenant();
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ items: [], contacts: [], locations: [] });
    }
  }, [open]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults({ items: [], contacts: [], locations: [] });
        return;
      }
      setSearching(true);
      try {
        const [itemsRes, contactsRes, locationsRes] = await Promise.all([
          fetch(`/api/v1/t/${tenantSlug}/items?search=${encodeURIComponent(q)}&limit=5`),
          fetch(`/api/v1/t/${tenantSlug}/contacts?search=${encodeURIComponent(q)}&limit=5`),
          fetch(`/api/v1/t/${tenantSlug}/locations?search=${encodeURIComponent(q)}&limit=5`),
        ]);

        const [itemsJson, contactsJson, locationsJson] = await Promise.all([
          itemsRes.ok ? itemsRes.json() : { data: [] },
          contactsRes.ok ? contactsRes.json() : { data: [] },
          locationsRes.ok ? locationsRes.json() : { data: [] },
        ]);

        setResults({
          items: (itemsJson.data ?? []).map(
            (i: { id: string; name: string; code?: string | null; category?: string | null }) => ({
              id: i.id,
              name: i.name,
              sub: i.code ?? i.category ?? undefined,
            })
          ),
          contacts: (contactsJson.data ?? []).map(
            (c: { id: string; name: string; contactType?: string; email?: string | null }) => ({
              id: c.id,
              name: c.name,
              sub: c.contactType ?? c.email ?? undefined,
            })
          ),
          locations: (locationsJson.data ?? []).map(
            (l: { id: string; name: string; locationType?: string; code?: string | null }) => ({
              id: l.id,
              name: l.name,
              sub: l.locationType ?? l.code ?? undefined,
            })
          ),
        });
      } catch {
        // Silently ignore search errors
      } finally {
        setSearching(false);
      }
    },
    [tenantSlug]
  );

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  }

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  const hasResults =
    results.items.length > 0 ||
    results.contacts.length > 0 ||
    results.locations.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search items, contacts, locations…"
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        {query.trim() && !searching && !hasResults && (
          <CommandEmpty>No results found for &ldquo;{query}&rdquo;</CommandEmpty>
        )}
        {!query.trim() && (
          <CommandEmpty style={{ color: "var(--text-dim)" }}>
            Start typing to search across your inventory…
          </CommandEmpty>
        )}
        {searching && (
          <CommandEmpty style={{ color: "var(--text-dim)" }}>
            Searching…
          </CommandEmpty>
        )}

        {results.items.length > 0 && (
          <CommandGroup heading="Items">
            {results.items.map((item) => (
              <CommandItem
                key={item.id}
                value={`item-${item.id}`}
                onSelect={() =>
                  navigate(`/t/${tenantSlug}/settings/items`)
                }
              >
                <Package className="size-4 shrink-0" style={{ color: "var(--accent-color)" }} />
                <div className="flex flex-col gap-0.5">
                  <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                  {item.sub && (
                    <span style={{ color: "var(--text-dim)" }} className="text-[11px]">
                      {item.sub}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.id}`}
                onSelect={() =>
                  navigate(`/t/${tenantSlug}/settings/contacts`)
                }
              >
                <Users className="size-4 shrink-0" style={{ color: "var(--blue)" }} />
                <div className="flex flex-col gap-0.5">
                  <span style={{ color: "var(--text-primary)" }}>{contact.name}</span>
                  {contact.sub && (
                    <span style={{ color: "var(--text-dim)" }} className="text-[11px] capitalize">
                      {contact.sub}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.locations.length > 0 && (
          <CommandGroup heading="Locations">
            {results.locations.map((location) => (
              <CommandItem
                key={location.id}
                value={`location-${location.id}`}
                onSelect={() =>
                  navigate(`/t/${tenantSlug}/settings/locations`)
                }
              >
                <MapPin className="size-4 shrink-0" style={{ color: "var(--green)" }} />
                <div className="flex flex-col gap-0.5">
                  <span style={{ color: "var(--text-primary)" }}>{location.name}</span>
                  {location.sub && (
                    <span style={{ color: "var(--text-dim)" }} className="text-[11px] capitalize">
                      {location.sub}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
