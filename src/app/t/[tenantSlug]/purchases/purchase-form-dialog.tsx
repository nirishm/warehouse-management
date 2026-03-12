"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PurchaseData {
  id: string;
  purchaseNumber: string;
  contactId?: string | null;
  locationId?: string | null;
  status: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface ContactOption {
  id: string;
  name: string;
  contactType?: string | null;
}

interface LocationOption {
  id: string;
  name: string;
  locationType?: string | null;
}

interface ItemOption {
  id: string;
  name: string;
  code?: string | null;
}

interface UnitOption {
  id: string;
  name: string;
  abbreviation: string;
}

interface LineItem {
  itemId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  purchase?: PurchaseData | null;
  onSuccess: () => void;
}

const emptyLineItem = (): LineItem => ({
  itemId: "",
  unitId: "",
  quantity: "",
  unitPrice: "",
});

export function PurchaseFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  purchase,
  onSuccess,
}: PurchaseFormDialogProps) {
  const isEdit = Boolean(purchase);
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);

  const [form, setForm] = useState({
    contactId: "",
    locationId: "",
    expectedDeliveryDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);

  useEffect(() => {
    if (!open) return;

    // Reset form
    if (purchase) {
      setForm({
        contactId: purchase.contactId ?? "",
        locationId: purchase.locationId ?? "",
        expectedDeliveryDate: purchase.expectedDeliveryDate
          ? purchase.expectedDeliveryDate.slice(0, 10)
          : "",
        notes: purchase.notes ?? "",
      });
    } else {
      setForm({
        contactId: "",
        locationId: "",
        expectedDeliveryDate: "",
        notes: "",
      });
      setLineItems([emptyLineItem()]);
    }

    // Fetch supporting data in parallel
    Promise.all([
      fetch(`/api/v1/t/${tenantSlug}/contacts?limit=200`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/v1/t/${tenantSlug}/locations?limit=100`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/v1/t/${tenantSlug}/items?limit=200`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/v1/t/${tenantSlug}/units?limit=100`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([c, l, it, u]) => {
      setContacts(c.data ?? []);
      setLocations(l.data ?? []);
      setItems(it.data ?? []);
      setUnits(u.data ?? []);
    });

    // If editing, fetch the purchase with items
    if (purchase) {
      fetch(`/api/v1/t/${tenantSlug}/purchases/${purchase.id}`)
        .then((r) => r.json())
        .then((json) => {
          const data = json.data ?? json;
          if (data.items && Array.isArray(data.items)) {
            setLineItems(
              data.items.map((li: { itemId: string; unitId?: string | null; quantity: string | number; unitPrice: string | number }) => ({
                itemId: li.itemId ?? "",
                unitId: li.unitId ?? "",
                quantity: String(li.quantity ?? ""),
                unitPrice: String(li.unitPrice ?? ""),
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [open, purchase, tenantSlug]);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: string, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const total = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validItems = lineItems.filter(
      (li) => li.itemId && li.quantity && li.unitPrice
    );
    if (validItems.length === 0) {
      toast.error("Add at least one line item with item, quantity, and price");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        items: validItems.map((li) => ({
          itemId: li.itemId,
          ...(li.unitId ? { unitId: li.unitId } : {}),
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
        })),
      };
      if (form.contactId) body.contactId = form.contactId;
      if (form.locationId) body.locationId = form.locationId;
      if (form.expectedDeliveryDate) body.expectedDeliveryDate = form.expectedDeliveryDate;
      if (form.notes.trim()) body.notes = form.notes.trim();

      const url = isEdit
        ? `/api/v1/t/${tenantSlug}/purchases/${purchase!.id}`
        : `/api/v1/t/${tenantSlug}/purchases`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to save purchase");
      }

      toast.success(isEdit ? "Purchase updated" : "Purchase created");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Purchase" : "Create Purchase"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "Edit purchase order details" : "Create a new purchase order"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Top section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchase-contact">Contact (Supplier)</Label>
              <Select
                value={form.contactId}
                onValueChange={(v) => setField("contactId", v)}
              >
                <SelectTrigger id="purchase-contact">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchase-location">Destination Location</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) => setField("locationId", v)}
              >
                <SelectTrigger id="purchase-location">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchase-delivery-date">Expected Delivery Date</Label>
              <Input
                id="purchase-delivery-date"
                type="date"
                value={form.expectedDeliveryDate}
                onChange={(e) => setField("expectedDeliveryDate", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchase-notes">Notes</Label>
            <Textarea
              id="purchase-notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional notes or instructions"
              rows={2}
            />
          </div>

          <Separator />

          {/* Line Items */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span
                style={{ color: "var(--text-primary)" }}
                className="text-[14px] font-bold"
              >
                Line Items
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
              >
                <Plus className="size-4" />
                Add Item
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_140px_100px_120px_40px] gap-2 px-1">
              {["Item", "Unit", "Quantity", "Unit Price", ""].map((h) => (
                <span
                  key={h}
                  style={{ color: "var(--text-muted)" }}
                  className="text-[11px] font-bold uppercase tracking-[0.05em]"
                >
                  {h}
                </span>
              ))}
            </div>

            {lineItems.map((li, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_140px_100px_120px_40px] gap-2 items-center"
              >
                {/* Item selector */}
                <Select
                  value={li.itemId}
                  onValueChange={(v) => updateLineItem(index, "itemId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.code ? `[${it.code}] ` : ""}{it.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Unit selector */}
                <Select
                  value={li.unitId}
                  onValueChange={(v) => updateLineItem(index, "unitId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.abbreviation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quantity */}
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                  value={li.quantity}
                  onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                />

                {/* Unit Price */}
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={li.unitPrice}
                  onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)}
                />

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  aria-label="Remove line item"
                >
                  <Trash2 className="size-4" style={{ color: "var(--red)" }} />
                </Button>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-end pt-1">
              <div
                style={{
                  background: "var(--bg-off)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--card-radius)",
                  padding: "10px 16px",
                }}
                className="flex items-center gap-3"
              >
                <span
                  style={{ color: "var(--text-muted)" }}
                  className="text-[13px] font-bold uppercase tracking-[0.05em]"
                >
                  Total
                </span>
                <span
                  style={{ color: "var(--text-primary)" }}
                  className="text-[18px] font-bold"
                >
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
