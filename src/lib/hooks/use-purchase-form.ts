'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface DropdownItem {
  id: string;
  name: string;
  code?: string;
  abbreviation?: string;
}

export interface PurchaseItemRow {
  key: string;
  commodity_id: string;
  unit_id: string;
  quantity: string;
  bags: string;
  unit_price: string;
}

function emptyRow(): PurchaseItemRow {
  return {
    key: crypto.randomUUID(),
    commodity_id: '',
    unit_id: '',
    quantity: '',
    bags: '',
    unit_price: '',
  };
}

export function usePurchaseForm() {
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
  const [items, setItems] = useState<PurchaseItemRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const base = `/api/t/${tenantSlug}`;
    const safeFetch = (url: string) =>
      fetch(url).then((r) => (r.ok ? r.json() : { data: [] }));
    Promise.all([
      safeFetch(`${base}/locations`),
      safeFetch(`${base}/commodities`),
      safeFetch(`${base}/units`),
    ]).then(([locRes, comRes, unitRes]) => {
      setLocations(locRes.data ?? locRes ?? []);
      setCommodities(comRes.data ?? comRes ?? []);
      setUnits(unitRes.data ?? unitRes ?? []);
    });
  }, [tenantSlug]);

  const updateItem = useCallback(
    (key: string, field: keyof PurchaseItemRow, value: string) => {
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

  const validateSupplierLocation = useCallback(() => {
    if (!locationId) {
      setError('Please select a location');
      return false;
    }
    setError('');
    return true;
  }, [locationId]);

  const validateItems = useCallback(() => {
    const hasValidItem = items.some(
      (item) => item.commodity_id && item.unit_id && item.quantity
    );
    if (!hasValidItem) {
      setError('At least one line item with an item, unit, and quantity is required');
      return false;
    }
    setError('');
    return true;
  }, [items]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
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

  return {
    tenantSlug,
    locations,
    commodities,
    units,
    locationId,
    setLocationId,
    contactId,
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
    submitting,
    error,
    setError,
    validateSupplierLocation,
    validateItems,
    handleSubmit,
    router,
  };
}
