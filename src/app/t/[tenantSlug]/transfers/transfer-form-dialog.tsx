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

interface TransferData {
  id: string;
  transferNumber: string;
  originLocationId: string;
  destLocationId: string;
  notes: string | null;
  status: string;
}

interface LineItem {
  itemId: string;
  unitId: string;
  sentQty: string;
}

interface TransferFormDialogProps {
  open: boolean;
  tenantSlug: string;
  transfer: TransferData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TransferFormDialog({
  open,
  tenantSlug,
  transfer,
  onClose,
  onSaved,
}: TransferFormDialogProps) {
  const [originLocationId, setOriginLocationId] = useState("");
  const [destLocationId, setDestLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { itemId: "", unitId: "", sentQty: "" },
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
    if (transfer) {
      setOriginLocationId(transfer.originLocationId);
      setDestLocationId(transfer.destLocationId);
      setNotes(transfer.notes ?? "");
    } else {
      setOriginLocationId("");
      setDestLocationId("");
      setNotes("");
      setLineItems([{ itemId: "", unitId: "", sentQty: "" }]);
    }
  }, [transfer, open]);

  function addLineItem() {
    setLineItems((prev) => [...prev, { itemId: "", unitId: "", sentQty: "" }]);
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
    if (!originLocationId) {
      toast.error("Origin location is required");
      return;
    }
    if (!destLocationId) {
      toast.error("Destination location is required");
      return;
    }
    if (originLocationId === destLocationId) {
      toast.error("Origin and destination must be different");
      return;
    }
    const validItems = lineItems.filter((li) => li.itemId && li.sentQty);
    if (validItems.length === 0) {
      toast.error("At least one line item is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        originLocationId,
        destLocationId,
        notes: notes || undefined,
        items: validItems.map((li) => ({
          itemId: li.itemId,
          unitId: li.unitId || undefined,
          sentQty: li.sentQty,
        })),
      };

      const url = transfer
        ? `/api/v1/t/${tenantSlug}/transfers/${transfer.id}`
        : `/api/v1/t/${tenantSlug}/transfers`;
      const method = transfer ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message ?? "Failed to save transfer");
        return;
      }

      toast.success(transfer ? "Transfer updated" : "Transfer created");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transfer ? "Edit Transfer" : "Create Transfer"}</DialogTitle>
          <DialogDescription>
            {transfer
              ? `Update transfer ${transfer.transferNumber}`
              : "Move stock between locations."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Locations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Origin Location</Label>
              <Select
                value={originLocationId}
                onValueChange={setOriginLocationId}
                disabled={loadingDropdowns}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin…" />
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
              <Label>Destination Location</Label>
              <Select
                value={destLocationId}
                onValueChange={setDestLocationId}
                disabled={loadingDropdowns}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination…" />
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
          </div>

          {/* Notes */}
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
                className="grid grid-cols-[1fr_140px_100px_36px] gap-2 items-end"
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
                      Sent Qty
                    </Label>
                  )}
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="0"
                    value={li.sentQty}
                    onChange={(e) => updateLineItem(index, "sentQty", e.target.value)}
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
            {saving ? "Saving…" : transfer ? "Update Transfer" : "Create Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
