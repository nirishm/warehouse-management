'use client';

import { useEffect, useState } from 'react';
import type { LotStockLevel } from '@/modules/lot-tracking/validations/lot';

interface FIFOLotSelectorProps {
  tenantSlug: string;
  commodityId: string;
  selectedLotId: string | null;
  onSelect: (lot: LotStockLevel | null) => void;
  disabled?: boolean;
}

export function FIFOLotSelector({
  tenantSlug,
  commodityId,
  selectedLotId,
  onSelect,
  disabled,
}: FIFOLotSelectorProps) {
  const [lots, setLots] = useState<LotStockLevel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!commodityId) {
      setLots([]);
      return;
    }
    setLoading(true);
    fetch(`/api/t/${tenantSlug}/lots?commodity_id=${commodityId}`)
      .then((r) => r.json())
      .then((json) => {
        const available = (json.data ?? []).filter(
          (l: LotStockLevel) => l.current_quantity > 0
        );
        // Sort FIFO: oldest first
        available.sort(
          (a: LotStockLevel, b: LotStockLevel) =>
            new Date(a.received_date).getTime() - new Date(b.received_date).getTime()
        );
        setLots(available);
      })
      .catch(() => setLots([]))
      .finally(() => setLoading(false));
  }, [tenantSlug, commodityId]);

  if (!commodityId) return null;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
        Lot (FIFO)
      </label>
      {loading ? (
        <div className="text-xs text-zinc-600 font-mono">Loading lots…</div>
      ) : lots.length === 0 ? (
        <div className="text-xs text-zinc-600 font-mono">No lots available</div>
      ) : (
        <select
          value={selectedLotId ?? ''}
          onChange={(e) => {
            const lot = lots.find((l) => l.lot_id === e.target.value) ?? null;
            onSelect(lot);
          }}
          disabled={disabled}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-mono rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">No lot assigned</option>
          {lots.map((lot, idx) => (
            <option key={lot.lot_id} value={lot.lot_id}>
              {idx === 0 ? '★ ' : ''}{lot.lot_number} — {lot.current_quantity} avail
              {lot.expiry_date
                ? ` · exp ${new Date(lot.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
