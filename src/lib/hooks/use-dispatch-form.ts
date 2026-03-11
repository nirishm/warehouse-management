'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface LocationOption {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
}

interface CommodityOption {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
}

interface UnitOption {
  id: string;
  name: string;
  abbreviation: string;
}

export interface DispatchItemRow {
  key: string;
  commodity_id: string;
  unit_id: string;
  sent_quantity: string;
  sent_bags: string;
}

function generateKey(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useDispatchForm() {
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
          (locData.data ?? []).filter((l: LocationOption) => l.is_active !== false)
        );
      }
      if (comRes.ok) {
        const comData = await comRes.json();
        const comArray = Array.isArray(comData) ? comData : (comData.data ?? []);
        setCommodities(
          comArray.filter((c: CommodityOption) => c.is_active !== false)
        );
      }
      if (unitRes.ok) {
        const unitData = await unitRes.json();
        setUnits(Array.isArray(unitData) ? unitData : (unitData.data ?? []));
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

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { key: generateKey(), commodity_id: '', unit_id: '', sent_quantity: '', sent_bags: '' },
    ]);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.key !== key);
    });
  }, []);

  const updateItem = useCallback((key: string, field: keyof DispatchItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }, []);

  const validateLocations = useCallback(() => {
    if (!originLocationId || !destLocationId) {
      setError('Please select both origin and destination locations');
      return false;
    }
    if (originLocationId === destLocationId) {
      setError('Origin and destination must be different');
      return false;
    }
    setError(null);
    return true;
  }, [originLocationId, destLocationId]);

  const validateItems = useCallback(() => {
    const hasValidItem = items.some(
      (item) => item.commodity_id && item.unit_id && item.sent_quantity
    );
    if (!hasValidItem) {
      setError('At least one line item with an item, unit, and quantity is required');
      return false;
    }
    setError(null);
    return true;
  }, [items]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateLocations()) {
      setLoading(false);
      return;
    }

    if (!validateItems()) {
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

  return {
    tenantSlug,
    locations,
    commodities,
    units,
    loading,
    loadingData,
    error,
    originLocationId,
    setOriginLocationId,
    destLocationId,
    setDestLocationId,
    transporterName,
    setTransporterName,
    vehicleNumber,
    setVehicleNumber,
    driverName,
    setDriverName,
    driverPhone,
    setDriverPhone,
    notes,
    setNotes,
    items,
    addItem,
    removeItem,
    updateItem,
    validateLocations,
    validateItems,
    handleSubmit,
    router,
  };
}
