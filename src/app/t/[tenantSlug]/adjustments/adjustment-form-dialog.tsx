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
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface LocationOption {
  id: string;
  name: string;
}

interface ItemOption {
  id: string;
  name: string;
}

interface UnitOption {
  id: string;
  name: string;
}

interface AdjustmentData {
  id: string;
  adjustmentNumber: string;
  locationId: string;
  type: "qty" | "value";
  reason: string | null;
  notes: string | null;
  status: string;
}

interface LineItem {
  itemId: string;
  unitId: string;
  qtyChange: string;
  valueChange: string;
}

interface AdjustmentFormDialogProps {
  open: boolean;
  tenantSlug: string;
  adjustment: AdjustmentData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdjustmentFormDialog({
  open,
  tenantSlug,
  adjustment,
  onClose,
  onSaved,
}: AdjustmentFormDialogProps) {
  const [locationId, setLocationId] = useState("");
  const [type, setType] = useState<"qty" | "value">("qty");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { itemId: "", unitId: "", qtyChange: "", valueChange: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingDropdowns(true);
    Promise.all([
      fetch(`/api/v1/t/${tenantSlug}/locations?limit=100`).then((r) => r.json()),
      fetch(`/api/v1/t/${tenantSlug}/items?limit=200`).then((r) => r.json()),
      fetch(`/api/v1/t/${tenantSlug}/units?limit=100`).then((r) => r.json()),
    ])
      .then(([locRes, itemRes, unitRes]) => {
        setLocations(locRes.data ?? []);
        setItems(itemRes.data ?? []);
        setUnits(unitRes.data ?? []);
      })
      .catch(() => toast.error("Failed to load dropdown data"))
      .finally(() => setLoadingDropdowns(false));
  }, [open, tenantSlug]);

  useEffect(() => {
    if (adjustment) {
      setLocationId(adjustment.locationId);
      setType(adjustment.type);
      setReason(adjustment.reason ?? "");
      setNotes(adjustment.notes ?? "");
    } else {
      setLocationId("");
      setType("qty");
      setReason("");
      setNotes("");
      setLineItems([{ itemId: "", unitId: "", qtyChange: "", valueChange: "" }]);
    }
  }, [adjustment, open]);

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { itemId: "", unitId: "", qtyChange: "", valueChange: "" },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit() {
    if (!locationId) {
      toast.error("Location is required");
      return;
    }
    const validItems = lineItems.filter((li) => li.itemId);
    if (validItems.length === 0) {
      toast.error("At least one line item is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        locationId,
        type,
        reason: reason || undefined,
        notes: notes || undefined,
        items: validItems.map((li) => ({
          itemId: li.itemId,
          unitId: li.unitId || undefined,
          qtyChange: li.qtyChange !== "" ? li.qtyChange : undefined,
          valueChange: li.valueChange !== "" ? li.valueChange : undefined,
        })),
      };

      const url = adjustment
        ? `/api/v1/t/${tenantSlug}/adjustments/${adjustment.id}`
        : `/api/v1/t/${tenantSlug}/adjustments`;
      const method = adjustment ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message ?? "Failed to save adjustment");
        return;
      }

      toast.success(adjustment ? "Adjustment updated" : "Adjustment created");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {adjustment ? "Edit Adjustment" : "Create Adjustment"}
          </DialogTitle>
          <DialogDescription>
            {adjustment
              ? `Update adjustment ${adjustment.adjustmentNumber}`
              : "Correct stock quantities or values for a location."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Top fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Location</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
                disabled={loadingDropdowns}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location…" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Adjustment Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "qty" | "value")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qty">Quantity Adjustment</SelectItem>
                  <SelectItem value="value">Value Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. Damaged goods, Stock count correction…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Separator />

          {/* Line Items */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 style={{ color: "var(--text-primary)" }} className="text-[14px] font-bold">
                Line Items
              </h3>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="size-3" />
                Add Line Item
              </Button>
            </div>

            {lineItems.map((li, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_120px_100px_100px_36px] gap-2 items-end"
              >
                <div className="flex flex-col gap-1">
                  {index === 0 && (
                    <Label style={{ color: "var(--text-muted)" }} className="text-[11px]">
                      Item
                    </Label>
                  )}
                  <Select
                    value={li.itemId}
                    onValueChange={(v) => updateLineItem(index, "itemId", v)}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item…" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  {index === 0 && (
                    <Label style={{ color: "var(--text-muted)" }} className="text-[11px]">
                      Unit
                    </Label>
                  )}
                  <Select
                    value={li.unitId}
                    onValueChange={(v) => updateLineItem(index, "unitId", v)}
                    disabled={loadingDropdowns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit…" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  {index === 0 && (
                    <Label style={{ color: "var(--text-muted)" }} className="text-[11px]">
                      Qty Change
                    </Label>
                  )}
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0"
                    value={li.qtyChange}
                    onChange={(e) => updateLineItem(index, "qtyChange", e.target.value)}
                    disabled={type === "value"}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  {index === 0 && (
                    <Label style={{ color: "var(--text-muted)" }} className="text-[11px]">
                      Value Change
                    </Label>
                  )}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={li.valueChange}
                    onChange={(e) => updateLineItem(index, "valueChange", e.target.value)}
                    disabled={type === "qty"}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  style={{ color: "var(--red)" }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? "Saving…"
              : adjustment
              ? "Update Adjustment"
              : "Create Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
