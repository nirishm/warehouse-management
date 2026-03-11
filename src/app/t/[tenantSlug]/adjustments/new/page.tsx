'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, redirect } from 'next/navigation';
import { useTenant } from '@/components/layout/tenant-provider';
import Link from 'next/link';
import { FormSection } from '@/components/ui/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface LocationOption {
  id: string;
  name: string;
  code: string;
}

interface CommodityOption {
  id: string;
  name: string;
  code: string;
}

interface UnitOption {
  id: string;
  name: string;
  abbreviation: string;
}

interface ReasonOption {
  id: string;
  name: string;
  direction: 'add' | 'remove';
}

export default function NewAdjustmentPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const ctx = useTenant();
  if (ctx.role !== 'tenant_admin' && !ctx.permissions.canManageAdjustments) redirect(`/t/${tenantSlug}`);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [reasons, setReasons] = useState<ReasonOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [locationId, setLocationId] = useState('');
  const [commodityId, setCommodityId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const fetchDropdownData = useCallback(async () => {
    try {
      const [locRes, comRes, unitRes, reasonRes] = await Promise.all([
        fetch(`/api/t/${tenantSlug}/locations`),
        fetch(`/api/t/${tenantSlug}/commodities`),
        fetch(`/api/t/${tenantSlug}/units`),
        fetch(`/api/t/${tenantSlug}/adjustment-reasons`),
      ]);

      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(
          (locData.data ?? []).filter((l: LocationOption & { is_active?: boolean }) => l.is_active !== false)
        );
      }
      if (comRes.ok) {
        const comData = await comRes.json();
        const comArray = Array.isArray(comData) ? comData : (comData.data ?? []);
        setCommodities(
          comArray.filter((c: CommodityOption & { is_active?: boolean }) => c.is_active !== false)
        );
      }
      if (unitRes.ok) {
        const unitData = await unitRes.json();
        setUnits(Array.isArray(unitData) ? unitData : (unitData.data ?? []));
      }
      if (reasonRes.ok) {
        const reasonData = await reasonRes.json();
        setReasons(reasonData.data ?? []);
      }
    } catch {
      setError('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const selectedReason = reasons.find((r) => r.id === reasonId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!locationId) {
      setError('Please select a location');
      setLoading(false);
      return;
    }
    if (!commodityId) {
      setError('Please select an item');
      setLoading(false);
      return;
    }
    if (!unitId) {
      setError('Please select a unit');
      setLoading(false);
      return;
    }
    if (!reasonId) {
      setError('Please select a reason');
      setLoading(false);
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0');
      setLoading(false);
      return;
    }

    const payload = {
      location_id: locationId,
      commodity_id: commodityId,
      unit_id: unitId,
      reason_id: reasonId,
      quantity: parseFloat(quantity),
      ...(notes ? { notes } : {}),
    };

    try {
      const res = await fetch(`/api/t/${tenantSlug}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create adjustment');
      }

      router.push(`/t/${tenantSlug}/adjustments`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link prefetch={false} href={`/t/${tenantSlug}/adjustments`}>
          <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            New Adjustment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record a stock adjustment for breakage, spillage, or correction
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && (
          <div className="rounded-md border border-[var(--red)]/30 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
            {error}
          </div>
        )}

        {/* Location & Item */}
        <FormSection title="Location & Item">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Location
              </Label>
              <Select value={locationId} onValueChange={(val) => setLocationId(val ?? '')}>
                <SelectTrigger className="w-full bg-background border-border text-foreground">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-off)] border-border">
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} label={`${loc.code} — ${loc.name}`} className="text-foreground focus:bg-muted">
                      <span className="font-mono text-[var(--accent-color)] mr-2">{loc.code}</span>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Item
              </Label>
              <Select value={commodityId} onValueChange={(val) => setCommodityId(val ?? '')}>
                <SelectTrigger className="w-full bg-background border-border text-foreground">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-off)] border-border">
                  {commodities.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={`${c.code} — ${c.name}`} className="text-foreground focus:bg-muted">
                      <span className="font-mono text-[var(--accent-color)] mr-2">{c.code}</span>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Unit
              </Label>
              <Select value={unitId} onValueChange={(val) => setUnitId(val ?? '')}>
                <SelectTrigger className="w-full bg-background border-border text-foreground">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-off)] border-border">
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.abbreviation})`} className="text-foreground focus:bg-muted">
                      {u.name}
                      <span className="text-muted-foreground ml-1">({u.abbreviation})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        {/* Reason & Quantity */}
        <FormSection title="Reason & Quantity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Reason
              </Label>
              <Select value={reasonId} onValueChange={(val) => setReasonId(val ?? '')}>
                <SelectTrigger className="w-full bg-background border-border text-foreground">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-off)] border-border">
                  {reasons.map((r) => (
                    <SelectItem key={r.id} value={r.id} label={r.name} className="text-foreground focus:bg-muted">
                      {r.name}
                      <span className={`ml-2 text-xs font-mono ${r.direction === 'add' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        ({r.direction === 'add' ? '+' : '-'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReason && (
                <p className={`text-xs font-mono ${selectedReason.direction === 'add' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  This will {selectedReason.direction === 'add' ? 'increase' : 'decrease'} stock
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="bg-background border-border text-foreground font-mono placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
              />
            </div>
          </div>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes" defaultOpen={false} badge="optional">
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason details, reference numbers, etc."
              rows={3}
              className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>
        </FormSection>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link prefetch={false} href={`/t/${tenantSlug}/adjustments`}>
            <Button
              type="button"
              variant="outline"
              className="border-border text-[var(--text-body)] hover:bg-muted"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            variant="orange"
          >
            {loading && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create Adjustment
          </Button>
        </div>
      </form>
    </div>
  );
}
