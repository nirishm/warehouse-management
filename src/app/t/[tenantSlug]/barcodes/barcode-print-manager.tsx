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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter commodities…"
              className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-mono text-amber-500 hover:text-amber-400 underline underline-offset-2"
            >
              Select all ({filtered.length})
            </button>
            <span className="text-zinc-700">·</span>
            <button
              onClick={clearAll}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              Clear
            </button>

            <Button
              onClick={handlePrint}
              disabled={selected.size === 0 || printing}
              className="ml-2 bg-amber-600 text-zinc-950 hover:bg-amber-500 font-semibold"
            >
              <Printer className="size-4 mr-2" />
              Print Labels ({selected.size})
            </Button>
          </div>
        </div>

        {/* Commodity list */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500 font-mono">
              No commodities found
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filtered.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-900/60 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="font-mono text-sm text-amber-500 w-28 shrink-0">
                    {c.code}
                  </span>
                  <span className="text-sm text-zinc-200 flex-1">{c.name}</span>
                  {c.category && (
                    <Badge
                      variant="outline"
                      className="border-zinc-700 text-zinc-500 text-xs font-mono"
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
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs font-mono uppercase text-zinc-500 mb-3 tracking-wider">
              Preview ({selectedCommodities.length} label{selectedCommodities.length !== 1 ? 's' : ''})
            </p>
            <BarcodePrintSheet commodities={selectedCommodities} />
          </div>
        )}
      </div>
    </>
  );
}
