'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';

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

interface DispatchItemRow {
  key: string;
  commodity_id: string;
  unit_id: string;
  sent_quantity: string;
  sent_bags: string;
}

function generateKey(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function NewDispatchPage() {
  const router = useRouter();
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [originLocationId, setOriginLocationId] = useState('');
  const [destLocationId, setDestLocationId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DispatchItemRow[]>([
    { key: generateKey(), commodity_id: '', unit_id: '', sent_quantity: '', sent_bags: '' },
  ]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [locRes, comRes, unitRes] = await Promise.all([
        fetch(`/api/t/${tenantSlug}/locations`),
        fetch(`/api/t/${tenantSlug}/commodities`),
        fetch(`/api/t/${tenantSlug}/units`),
      ]);

      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(
          (locData.data ?? []).filter((l: LocationOption & { is_active?: boolean }) => l.is_active !== false)
        );
      }
      if (comRes.ok) {
        const comData = await comRes.json();
        setCommodities(
          (comData.data ?? []).filter((c: CommodityOption & { is_active?: boolean }) => c.is_active !== false)
        );
      }
      if (unitRes.ok) {
        const unitData = await unitRes.json();
        setUnits(unitData.data ?? []);
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

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: generateKey(), commodity_id: '', unit_id: '', sent_quantity: '', sent_bags: '' },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.key !== key);
    });
  }

  function updateItem(key: string, field: keyof DispatchItemRow, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!originLocationId || !destLocationId) {
      setError('Please select both origin and destination locations');
      setLoading(false);
      return;
    }

    if (originLocationId === destLocationId) {
      setError('Origin and destination must be different');
      setLoading(false);
      return;
    }

    const parsedItems = items
      .filter((item) => item.commodity_id && item.unit_id && item.sent_quantity)
      .map((item) => ({
        commodity_id: item.commodity_id,
        unit_id: item.unit_id,
        sent_quantity: parseFloat(item.sent_quantity),
        ...(item.sent_bags ? { sent_bags: parseInt(item.sent_bags, 10) } : {}),
      }));

    if (parsedItems.length === 0) {
      setError('At least one item with commodity, unit, and quantity is required');
      setLoading(false);
      return;
    }

    const payload = {
      origin_location_id: originLocationId,
      dest_location_id: destLocationId,
      ...(transporterName ? { transporter_name: transporterName } : {}),
      ...(vehicleNumber ? { vehicle_number: vehicleNumber } : {}),
      ...(driverName ? { driver_name: driverName } : {}),
      ...(driverPhone ? { driver_phone: driverPhone } : {}),
      ...(notes ? { notes } : {}),
      items: parsedItems,
    };

    try {
      const res = await fetch(`/api/t/${tenantSlug}/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create dispatch');
      }

      const data = await res.json();
      router.push(`/t/${tenantSlug}/dispatches/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/t/${tenantSlug}/dispatches`}>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            New Dispatch
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create a new commodity dispatch between locations
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Locations */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Origin Location
                </Label>
                <Select value={originLocationId} onValueChange={(val) => setOriginLocationId(val ?? '')}>
                  <SelectTrigger className="w-full bg-zinc-950 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id} className="text-zinc-200 focus:bg-zinc-800">
                        <span className="font-mono text-amber-500 mr-2">{loc.code}</span>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Destination Location
                </Label>
                <Select value={destLocationId} onValueChange={(val) => setDestLocationId(val ?? '')}>
                  <SelectTrigger className="w-full bg-zinc-950 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id} className="text-zinc-200 focus:bg-zinc-800">
                        <span className="font-mono text-amber-500 mr-2">{loc.code}</span>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport Details */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Transport Details
              <span className="text-zinc-600 normal-case font-sans ml-2">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transporter" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Transporter Name
                </Label>
                <Input
                  id="transporter"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  placeholder="Transport company name"
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Vehicle Number
                </Label>
                <Input
                  id="vehicle"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. KA-01-AB-1234"
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Driver Name
                </Label>
                <Input
                  id="driver"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver full name"
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Driver Phone
                </Label>
                <Input
                  id="phone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="notes" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this dispatch..."
                rows={3}
                className="bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Dispatch Items ({items.length})
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Plus className="size-3.5 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                    Commodity
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Unit
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Quantity
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Bags
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 w-12 pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.key} className="border-zinc-800/60 hover:bg-zinc-800/30">
                    <TableCell className="pl-6">
                      <Select
                        value={item.commodity_id}
                        onValueChange={(val) => updateItem(item.key, 'commodity_id', val ?? '')}
                      >
                        <SelectTrigger className="w-full min-w-[180px] bg-zinc-950 border-zinc-700 text-zinc-100">
                          <SelectValue placeholder="Select commodity" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {commodities.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800">
                              <span className="font-mono text-amber-500 mr-2">{c.code}</span>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.unit_id}
                        onValueChange={(val) => updateItem(item.key, 'unit_id', val ?? '')}
                      >
                        <SelectTrigger className="w-full min-w-[120px] bg-zinc-950 border-zinc-700 text-zinc-100">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-zinc-200 focus:bg-zinc-800">
                              {u.name}
                              <span className="text-zinc-500 ml-1">({u.abbreviation})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.sent_quantity}
                        onChange={(e) => updateItem(item.key, 'sent_quantity', e.target.value)}
                        placeholder="0.00"
                        className="w-28 bg-zinc-950 border-zinc-700 text-zinc-100 font-mono placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.sent_bags}
                        onChange={(e) => updateItem(item.key, 'sent_bags', e.target.value)}
                        placeholder="0"
                        className="w-20 bg-zinc-950 border-zinc-700 text-zinc-100 font-mono placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                      />
                    </TableCell>
                    <TableCell className="pr-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(item.key)}
                        disabled={items.length <= 1}
                        className="text-zinc-500 hover:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/t/${tenantSlug}/dispatches`}>
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-amber-600 text-zinc-950 hover:bg-amber-500 font-medium"
          >
            {loading && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create Dispatch
          </Button>
        </div>
      </form>
    </div>
  );
}
