'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarcodeScannerInput } from '@/components/barcode/barcode-scanner-input';
import { CheckCircle2, AlertTriangle, ArrowRight, Package } from 'lucide-react';

interface DispatchInfo {
  id: string;
  dispatch_number: string;
  origin_name: string;
  dest_name: string;
}

interface FormItem {
  id: string;
  commodity_name: string;
  commodity_code: string;
  unit_name: string;
  unit_abbreviation: string;
  sent_quantity: number;
  sent_bags: number | null;
}

interface ItemState {
  received_quantity: string;
  received_bags: string;
}

interface Props {
  dispatch: DispatchInfo;
  items: FormItem[];
  tenantSlug: string;
  barcodeEnabled?: boolean;
}

export function MobileReceiveForm({
  dispatch,
  items,
  tenantSlug,
  barcodeEnabled,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanFilter, setScanFilter] = useState('');

  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() => {
    const initial: Record<string, ItemState> = {};
    for (const item of items) {
      initial[item.id] = {
        received_quantity: String(item.sent_quantity),
        received_bags: item.sent_bags !== null ? String(item.sent_bags) : '',
      };
    }
    return initial;
  });

  const updateItem = useCallback(
    (itemId: string, field: keyof ItemState, value: string) => {
      setItemStates((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], [field]: value },
      }));
    },
    []
  );

  const getReceivedQty = (itemId: string): number => {
    const val = parseFloat(itemStates[itemId]?.received_quantity ?? '0');
    return isNaN(val) ? 0 : val;
  };

  const hasValidationErrors = items.some((item) => {
    const val = parseFloat(itemStates[item.id]?.received_quantity ?? '');
    return isNaN(val) || val < 0;
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        items: items.map((item) => {
          const bagsVal = itemStates[item.id]?.received_bags;
          const parsed = bagsVal ? parseInt(bagsVal, 10) : undefined;
          return {
            id: item.id,
            received_quantity: getReceivedQty(item.id),
            ...(parsed !== undefined && !isNaN(parsed) ? { received_bags: parsed } : {}),
          };
        }),
      };

      const response = await fetch(
        `/api/t/${tenantSlug}/dispatches/${dispatch.id}/receive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to receive dispatch');
      }

      router.push(`/t/${tenantSlug}/dispatches/${dispatch.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items by scanned/typed code
  const visibleItems = scanFilter.trim()
    ? items.filter((item) =>
        item.commodity_code.toLowerCase().includes(scanFilter.toLowerCase()) ||
        item.commodity_name.toLowerCase().includes(scanFilter.toLowerCase())
      )
    : items;

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Dispatch summary */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
        <p className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider">Route</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-body)]">
          <span>{dispatch.origin_name}</span>
          <ArrowRight className="size-3 text-[var(--text-dim)]" />
          <span>{dispatch.dest_name}</span>
        </div>
        <p className="font-mono text-[var(--accent-color)] text-sm mt-0.5">
          {dispatch.dispatch_number}
        </p>
      </div>

      {/* Optional barcode scan to jump to item */}
      {barcodeEnabled && (
        <div className="space-y-1">
          <Label className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-wider">
            Scan or search commodity
          </Label>
          <BarcodeScannerInput
            value={scanFilter}
            onChange={setScanFilter}
            placeholder="Scan or type commodity code…"
          />
        </div>
      )}

      {/* Item cards */}
      <div className="space-y-3">
        {visibleItems.length === 0 && (
          <p className="text-sm text-[var(--text-dim)] text-center py-6">No matching items</p>
        )}
        {visibleItems.map((item) => {
          const received = getReceivedQty(item.id);
          const shortage = item.sent_quantity - received;
          const hasShortage = shortage > 0;

          return (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-4 space-y-4"
            >
              {/* Commodity header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-[var(--text-dim)]" />
                    <p className="text-sm font-medium text-[var(--text-body)]">
                      {item.commodity_name}
                    </p>
                  </div>
                  <p className="text-xs font-mono text-[var(--accent-color)] mt-0.5">
                    {item.commodity_code}
                  </p>
                </div>
                {hasShortage ? (
                  <Badge className="bg-[var(--red-bg)] text-[var(--red)] border-[rgba(220,38,38,0.2)] font-mono text-xs shrink-0">
                    -{shortage} shortage
                  </Badge>
                ) : (
                  <Badge className="bg-[var(--green-bg)] text-[var(--green)] border-[rgba(22,163,74,0.2)] font-mono text-xs shrink-0">
                    OK
                  </Badge>
                )}
              </div>

              {/* Sent qty reference */}
              <div className="flex items-center justify-between text-xs text-[var(--text-dim)] font-mono bg-[var(--bg-off)] rounded px-3 py-1.5">
                <span>Sent</span>
                <span className="text-[var(--text-body)]">
                  {item.sent_quantity.toLocaleString()} {item.unit_abbreviation}
                  {item.sent_bags !== null && (
                    <span className="text-[var(--text-dim)] ml-2">({item.sent_bags} bags)</span>
                  )}
                </span>
              </div>

              {/* Received qty input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                    Received Qty <span className="text-[var(--text-dim)]">({item.unit_abbreviation})</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={itemStates[item.id]?.received_quantity ?? ''}
                    onChange={(e) =>
                      updateItem(item.id, 'received_quantity', e.target.value)
                    }
                    className="h-12 text-base font-mono"
                  />
                </div>
                {item.sent_bags !== null && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      Received Bags
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={itemStates[item.id]?.received_bags ?? ''}
                      onChange={(e) =>
                        updateItem(item.id, 'received_bags', e.target.value)
                      }
                      className="h-12 text-base font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-[rgba(220,38,38,0.2)] bg-[var(--red-bg)] p-4">
          <AlertTriangle className="size-5 text-[var(--red)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--red)]">{error}</p>
        </div>
      )}

      {/* Sticky submit — fixed to bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-[var(--border)] p-4 md:hidden">
        <Button
          onClick={handleSubmit}
          disabled={hasValidationErrors || submitting}
          className="w-full h-12 text-base bg-[var(--accent-color)] text-white hover:bg-[var(--accent-dark)] font-semibold"
        >
          <CheckCircle2 className="size-5 mr-2" />
          {submitting ? 'Processing…' : 'Confirm Receipt'}
        </Button>
      </div>
    </div>
  );
}
