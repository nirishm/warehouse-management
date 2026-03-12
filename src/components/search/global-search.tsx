'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/components/layout/tenant-provider';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { SearchIcon } from 'lucide-react';

interface SearchResults {
  dispatches: Array<{ id: string; dispatch_number: string }>;
  purchases: Array<{ id: string; purchase_number: string }>;
  sales: Array<{ id: string; sale_number: string }>;
  items: Array<{ id: string; name: string; code: string | null }>;
}

const EMPTY_RESULTS: SearchResults = {
  dispatches: [],
  purchases: [],
  sales: [],
  items: [],
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tenant = useTenant();
  const router = useRouter();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(EMPTY_RESULTS);
      setLoading(false);
    }
  }, [open]);

  const search = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();

      if (value.trim().length < 2) {
        setResults(EMPTY_RESULTS);
        setLoading(false);
        return;
      }

      setLoading(true);

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const res = await fetch(
            `/api/t/${tenant.tenantSlug}/search?q=${encodeURIComponent(value.trim())}`,
            {
              signal: controller.signal,
              headers: {
                'x-tenant-id': tenant.tenantId,
                'x-tenant-schema': tenant.schemaName,
                'x-tenant-modules': JSON.stringify(tenant.enabledModules),
              },
            }
          );
          if (res.ok) {
            const data: SearchResults = await res.json();
            setResults(data);
          }
        } catch {
          // aborted or network error — ignore
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [tenant]
  );

  function navigate(path: string) {
    setOpen(false);
    router.push(`/t/${tenant.tenantSlug}${path}`);
  }

  const hasResults =
    results.dispatches.length > 0 ||
    results.purchases.length > 0 ||
    results.sales.length > 0 ||
    results.items.length > 0;

  const showEmpty = query.trim().length >= 2 && !loading && !hasResults;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-[var(--bg-off)] px-3 py-1.5 text-sm text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:border-[var(--text-dim)] transition-colors cursor-pointer"
      >
        <SearchIcon className="size-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--text-dim)]">
          ⌘K
        </kbd>
      </button>

      {/* Mobile search icon */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center size-8 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors cursor-pointer"
        aria-label="Search"
      >
        <SearchIcon className="size-4" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search dispatches, purchases, sales, and items"
      >
        <CommandInput
          placeholder="Search dispatches, purchases, items..."
          value={query}
          onValueChange={search}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-[var(--text-dim)]">
              Searching...
            </div>
          )}

          {showEmpty && <CommandEmpty>No results found.</CommandEmpty>}

          {results.dispatches.length > 0 && (
            <CommandGroup heading="Dispatches">
              {results.dispatches.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.dispatch_number}
                  onSelect={() => navigate(`/dispatches/${d.id}`)}
                >
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {d.dispatch_number}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.dispatches.length > 0 && results.purchases.length > 0 && (
            <CommandSeparator />
          )}

          {results.purchases.length > 0 && (
            <CommandGroup heading="Purchases">
              {results.purchases.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.purchase_number}
                  onSelect={() => navigate(`/purchases/${p.id}`)}
                >
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {p.purchase_number}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(results.dispatches.length > 0 || results.purchases.length > 0) &&
            results.sales.length > 0 && <CommandSeparator />}

          {results.sales.length > 0 && (
            <CommandGroup heading="Sales">
              {results.sales.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.sale_number}
                  onSelect={() => navigate(`/sales/${s.id}`)}
                >
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {s.sale_number}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(results.dispatches.length > 0 ||
            results.purchases.length > 0 ||
            results.sales.length > 0) &&
            results.items.length > 0 && <CommandSeparator />}

          {results.items.length > 0 && (
            <CommandGroup heading="Items">
              {results.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.code ?? ''}`}
                  onSelect={() => navigate(`/commodities/${item.id}`)}
                >
                  <span className="text-[var(--text-body)]">{item.name}</span>
                  {item.code && (
                    <span className="ml-2 font-mono text-xs text-[var(--text-dim)]">
                      {item.code}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
