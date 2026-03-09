'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { StockAlertThreshold } from '@/modules/stock-alerts/validations/threshold';

interface Commodity { id: string; name: string; code: string }
interface Location { id: string; name: string }
interface Unit { id: string; name: string; abbreviation: string }

interface Props {
  tenantSlug: string;
  initialThresholds: StockAlertThreshold[];
  commodities: Commodity[];
  locations: Location[];
  units: Unit[];
}

interface FormState {
  commodity_id: string;
  location_id: string;
  unit_id: string;
  min_stock: string;
  reorder_point: string;
}

const emptyForm: FormState = {
  commodity_id: '',
  location_id: '',
  unit_id: '',
  min_stock: '0',
  reorder_point: '0',
};

export function ThresholdsManager({
  tenantSlug,
  initialThresholds,
  commodities,
  locations,
  units,
}: Props) {
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/stock-alerts/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity_id: form.commodity_id,
          location_id: form.location_id,
          unit_id: form.unit_id,
          min_stock: parseFloat(form.min_stock) || 0,
          reorder_point: parseFloat(form.reorder_point) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');

      // Refresh list
      const listRes = await fetch(`/api/t/${tenantSlug}/stock-alerts/thresholds`);
      const listJson = await listRes.json();
      setThresholds(listJson.data ?? []);
      setOpen(false);
      setForm(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this threshold?')) return;
    await fetch(`/api/t/${tenantSlug}/stock-alerts/thresholds/${id}`, { method: 'DELETE' });
    setThresholds((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">
            Alert Thresholds
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Configure min stock and reorder points per commodity and location
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/t/${tenantSlug}/stock-alerts`}>
            <Button variant="outline" size="sm">← Alerts</Button>
          </Link>
          <Button size="sm" onClick={() => setOpen(true)}>
            Add Threshold
          </Button>
        </div>
      </div>

      {thresholds.length === 0 ? (
        <div className="border border-[var(--border)] rounded-lg p-8 text-center text-[var(--text-dim)]">
          No thresholds configured yet.
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-off)]">
                {['Commodity', 'Location', 'Unit', 'Min Stock', 'Reorder Point', 'Active', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[var(--text-dim)] font-mono text-xs uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {thresholds.map((t) => {
                const commodity = commodities.find((c) => c.id === t.commodity_id);
                const location = locations.find((l) => l.id === t.location_id);
                const unit = units.find((u) => u.id === t.unit_id);
                return (
                  <tr key={t.id} className="hover:bg-[var(--bg-off)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {commodity ? `${commodity.name} (${commodity.code})` : t.commodity_id}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-body)]">{location?.name ?? t.location_id}</td>
                    <td className="px-4 py-3 text-[var(--text-body)] font-mono">
                      {unit?.abbreviation ?? t.unit_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{t.min_stock}</td>
                    <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{t.reorder_point}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-mono ${t.is_active ? 'text-[var(--green)]' : 'text-[var(--text-dim)]'}`}
                      >
                        {t.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-[var(--text-dim)] hover:text-[var(--red)] transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Threshold</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[var(--text-muted)] text-xs">Commodity</Label>
              <Select
                value={form.commodity_id}
                onValueChange={(v) => setForm((f) => ({ ...f, commodity_id: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[var(--text-muted)] text-xs">Location</Label>
              <Select
                value={form.location_id}
                onValueChange={(v) => setForm((f) => ({ ...f, location_id: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[var(--text-muted)] text-xs">Unit</Label>
              <Select
                value={form.unit_id}
                onValueChange={(v) => setForm((f) => ({ ...f, unit_id: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[var(--text-muted)] text-xs">Min Stock</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--text-muted)] text-xs">Reorder Point</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.reorder_point}
                  onChange={(e) => setForm((f) => ({ ...f, reorder_point: e.target.value }))}
                />
              </div>
            </div>

            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !form.commodity_id || !form.location_id || !form.unit_id
              }
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
