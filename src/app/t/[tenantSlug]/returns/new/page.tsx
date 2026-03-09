'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, redirect } from 'next/navigation';
import { useTenant } from '@/components/layout/tenant-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DropdownItem {
  id: string;
  name: string;
  code?: string;
  abbreviation?: string;
}

interface ItemRow {
  key: string;
  commodity_id: string;
  unit_id: string;
  quantity: string;
  notes: string;
}

function emptyRow(): ItemRow {
  return { key: crypto.randomUUID(), commodity_id: '', unit_id: '', quantity: '', notes: '' };
}

export default function NewReturnPage() {
  const router = useRouter();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const ctx = useTenant();
  if (ctx.role !== 'tenant_admin' && !ctx.permissions.canManageReturns) redirect(`/t/${tenantSlug}`);

  const [locations, setLocations] = useState<DropdownItem[]>([]);
  const [commodities, setCommodities] = useState<DropdownItem[]>([]);
  const [units, setUnits] = useState<DropdownItem[]>([]);

  const [returnType, setReturnType] = useState<'purchase_return' | 'sale_return'>('purchase_return');
  const [originalTxnId, setOriginalTxnId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const base = `/api/t/${tenantSlug}`;
    Promise.all([
      fetch(`${base}/locations`).then((r) => r.json()),
      fetch(`${base}/commodities`).then((r) => r.json()),
      fetch(`${base}/units`).then((r) => r.json()),
    ]).then(([loc, com, uni]) => {
      setLocations(loc.data ?? []);
      setCommodities(com.data ?? []);
      setUnits(uni.data ?? []);
    });
  }, [tenantSlug]);

  function updateItem(key: string, field: keyof ItemRow, value: string) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function removeItem(key: string) {
    setItems((rows) => rows.filter((r) => r.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId) { setError('Please select a location'); return; }
    if (!originalTxnId) { setError('Please enter the original transaction ID'); return; }
    const validItems = items.filter((r) => r.commodity_id && r.unit_id && Number(r.quantity) > 0);
    if (validItems.length === 0) { setError('Add at least one item'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/t/${tenantSlug}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_type: returnType,
          original_txn_id: originalTxnId,
          location_id: locationId,
          reason: reason || null,
          notes: notes || null,
          items: validItems.map((r) => ({
            commodity_id: r.commodity_id,
            unit_id: r.unit_id,
            quantity: Number(r.quantity),
            notes: r.notes || null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create return');
      router.push(`/t/${tenantSlug}/returns/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  const selectCls = 'w-full bg-[var(--bg-off)] border border-[var(--border)] text-[var(--text-body)] text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">New Return</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">Record a purchase or sale return</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-[var(--bg-base)] border-[var(--border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Return Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[var(--text-muted)] text-xs">Return Type *</Label>
                <select
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value as typeof returnType)}
                  className={selectCls}
                >
                  <option value="purchase_return">Purchase Return</option>
                  <option value="sale_return">Sale Return</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--text-muted)] text-xs">Location *</Label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select location…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[var(--text-muted)] text-xs">
                Original {returnType === 'purchase_return' ? 'Purchase' : 'Sale'} ID *
              </Label>
              <Input
                value={originalTxnId}
                onChange={(e) => setOriginalTxnId(e.target.value)}
                placeholder="UUID of the original transaction"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[var(--text-muted)] text-xs">Reason</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for return"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[var(--text-muted)] text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-base)] border-[var(--border)]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Items
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setItems((r) => [...r, emptyRow()])}
              className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] text-xs h-auto py-1"
            >
              + Add Row
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((row) => (
              <div key={row.key} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <select
                    value={row.commodity_id}
                    onChange={(e) => updateItem(row.key, 'commodity_id', e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Commodity…</option>
                    {commodities.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <select
                    value={row.unit_id}
                    onChange={(e) => updateItem(row.key, 'unit_id', e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Unit…</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.abbreviation ?? u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={row.quantity}
                    onChange={(e) => updateItem(row.key, 'quantity', e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    value={row.notes}
                    onChange={(e) => updateItem(row.key, 'notes', e.target.value)}
                    placeholder="Notes"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(row.key)}
                    disabled={items.length === 1}
                    className="text-[var(--text-dim)] hover:text-[var(--red)] h-9 w-9 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--red)]">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} variant="orange">
            {submitting ? 'Saving…' : 'Create Return'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/t/${tenantSlug}/returns`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
