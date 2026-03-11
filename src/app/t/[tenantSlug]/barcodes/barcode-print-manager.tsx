'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarcodePrintSheet } from '@/components/barcode/barcode-print-sheet';
import { Printer, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Commodity {
  id: string;
  code: string;
  name: string;
  category: string | null;
}

interface Props {
  commodities: Commodity[];
  tenantSlug: string;
}

export function BarcodePrintManager({ commodities, tenantSlug: _tenantSlug }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [printing, setPrinting] = useState(false);

  const filtered = filter.trim()
    ? commodities.filter(
        (c) =>
          c.name.toLowerCase().includes(filter.toLowerCase()) ||
          c.code.toLowerCase().includes(filter.toLowerCase()) ||
          (c.category?.toLowerCase() ?? '').includes(filter.toLowerCase())
      )
    : commodities;

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(filtered.map((c) => c.id)));
  }, [filtered]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const selectedCommodities = commodities.filter((c) => selected.has(c.id));

  const handlePrint = useCallback(() => {
    setPrinting(true);
    // Give React a tick to render the print sheet
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  }, []);

  return (
    <>
      {/* Print-only section */}
      <div className="hidden print:block">
        <BarcodePrintSheet commodities={selectedCommodities} />
      </div>

      {/* Screen UI — hidden during print */}
      <div className="print:hidden space-y-4">
        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-dim)]" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter items…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-mono text-[var(--accent-color)] hover:text-[var(--accent-dark)] underline underline-offset-2"
            >
              Select all ({filtered.length})
            </button>
            <span className="text-[var(--border-mid)]">·</span>
            <button
              onClick={clearAll}
              className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--text-body)] underline underline-offset-2"
            >
              Clear
            </button>

            <Button
              onClick={handlePrint}
              disabled={selected.size === 0 || printing}
              className="ml-2 bg-[var(--accent-color)] text-white hover:bg-[var(--accent-dark)] font-semibold"
            >
              <Printer className="size-4 mr-2" />
              Print Labels ({selected.size})
            </Button>
          </div>
        </div>

        {/* Commodity list */}
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-dim)] font-mono">
              No items found
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-off)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-[var(--border-mid)] bg-[var(--bg-off)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]/30"
                  />
                  <span className="font-mono text-sm text-[var(--accent-color)] w-28 shrink-0">
                    {c.code}
                  </span>
                  <span className="text-sm text-[var(--text-body)] flex-1">{c.name}</span>
                  {c.category && (
                    <Badge
                      variant="outline"
                      className="border-[var(--border)] text-[var(--text-dim)] text-xs font-mono"
                    >
                      {c.category}
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Preview strip */}
        {selectedCommodities.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-off)] p-4">
            <p className="text-xs font-mono uppercase text-[var(--text-dim)] mb-3 tracking-wider">
              Preview ({selectedCommodities.length} label{selectedCommodities.length !== 1 ? 's' : ''})
            </p>
            <BarcodePrintSheet commodities={selectedCommodities} />
          </div>
        )}
      </div>
    </>
  );
}
