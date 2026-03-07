'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  bags: string;
  unit_price: string;
}

function emptyRow(): ItemRow {
  return {
    key: crypto.randomUUID(),
    commodity_id: '',
    unit_id: '',
    quantity: '',
    bags: '',
    unit_price: '',
  };
}

export default function NewPurchasePage() {
  const router = useRouter();
  const routeParams = useParams<{ tenantSlug: string }>();
  const tenantSlug = routeParams.tenantSlug;

  const [locations, setLocations] = useState<DropdownItem[]>([]);
  const [commodities, setCommodities] = useState<DropdownItem[]>([]);
  const [units, setUnits] = useState<DropdownItem[]>([]);

  const [locationId, setLocationId] = useState('');
  const [contactId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
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
    ]).then(([locRes, comRes, unitRes]) => {
      setLocations(locRes.data ?? locRes ?? []);
      setCommodities(comRes.data ?? comRes ?? []);
      setUnits(unitRes.data ?? unitRes ?? []);
    });
  }, [tenantSlug]);

  const updateItem = useCallback(
    (key: string, field: keyof ItemRow, value: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyRow()]);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.key !== key);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        location_id: locationId,
        contact_id: contactId || null,
        transporter_name: transporterName,
        vehicle_number: vehicleNumber,
        driver_name: driverName,
        driver_phone: driverPhone,
        notes,
        items: items
          .filter((item) => item.commodity_id && item.unit_id && item.quantity)
          .map((item) => ({
            commodity_id: item.commodity_id,
            unit_id: item.unit_id,
            quantity: parseFloat(item.quantity),
            bags: item.bags ? parseInt(item.bags, 10) : undefined,
            unit_price: item.unit_price
              ? parseFloat(item.unit_price)
              : undefined,
          })),
      };

      const res = await fetch(`/api/t/${tenantSlug}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create purchase');
      }

      const { data } = await res.json();
      router.push(`/t/${tenantSlug}/purchases/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    'h-8 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          New Purchase
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Record an incoming purchase from a supplier
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header details */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Purchase Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Location *
                </Label>
                <select
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code ? `${loc.code} - ` : ''}
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport details */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Transport Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Transporter Name
                </Label>
                <Input
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  placeholder="Enter transporter name"
                  className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Vehicle Number
                </Label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MH-12-AB-1234"
                  className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Driver Name
                </Label>
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter driver name"
                  className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Driver Phone
                </Label>
                <Input
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
                className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Items *
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="h-7 text-xs font-mono border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              + Add Row
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-mono uppercase tracking-wider text-zinc-500 px-4 py-2">
                      Commodity
                    </th>
                    <th className="text-left text-xs font-mono uppercase tracking-wider text-zinc-500 px-4 py-2">
                      Unit
                    </th>
                    <th className="text-left text-xs font-mono uppercase tracking-wider text-zinc-500 px-4 py-2 w-28">
                      Quantity
                    </th>
                    <th className="text-left text-xs font-mono uppercase tracking-wider text-zinc-500 px-4 py-2 w-24">
                      Bags
                    </th>
                    <th className="text-left text-xs font-mono uppercase tracking-wider text-zinc-500 px-4 py-2 w-28">
                      Unit Price
                    </th>
                    <th className="w-12 px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.key}
                      className="border-b border-zinc-800/60"
                    >
                      <td className="px-4 py-2">
                        <select
                          required
                          value={item.commodity_id}
                          onChange={(e) =>
                            updateItem(item.key, 'commodity_id', e.target.value)
                          }
                          className={selectClass}
                        >
                          <option value="">Select</option>
                          {commodities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code ? `${c.code} - ` : ''}
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          required
                          value={item.unit_id}
                          onChange={(e) =>
                            updateItem(item.key, 'unit_id', e.target.value)
                          }
                          className={selectClass}
                        >
                          <option value="">Select</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.abbreviation ?? u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          required
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.key, 'quantity', e.target.value)
                          }
                          placeholder="0"
                          className="border-zinc-700 bg-zinc-800 text-zinc-200 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={item.bags}
                          onChange={(e) =>
                            updateItem(item.key, 'bags', e.target.value)
                          }
                          placeholder="0"
                          className="border-zinc-700 bg-zinc-800 text-zinc-200 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(item.key, 'unit_price', e.target.value)
                          }
                          placeholder="0.00"
                          className="border-zinc-700 bg-zinc-800 text-zinc-200 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-zinc-600 hover:text-red-400 text-sm font-mono"
                          title="Remove row"
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-medium"
          >
            {submitting ? 'Creating...' : 'Create Purchase'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/t/${tenantSlug}/purchases`)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
