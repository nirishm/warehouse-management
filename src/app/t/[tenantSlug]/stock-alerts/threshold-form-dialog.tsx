"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Threshold {
  id: string;
  tenantId: string;
  itemId: string;
  locationId: string | null;
  minQuantity: string;
  createdAt: string;
  updatedAt: string;
}

interface ThresholdFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  threshold: Threshold | null;
  onSuccess: () => void;
}

export function ThresholdFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  threshold,
  onSuccess,
}: ThresholdFormDialogProps) {
  const isEdit = threshold !== null;

  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form fields when dialog opens or threshold changes
  useEffect(() => {
    if (open) {
      if (isEdit && threshold) {
        setItemId(threshold.itemId);
        setLocationId(threshold.locationId ?? "");
        setMinQuantity(threshold.minQuantity);
      } else {
        setItemId("");
        setLocationId("");
        setMinQuantity("");
      }
    }
  }, [open, threshold, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const qty = Number(minQuantity);
    if (!itemId.trim()) {
      toast.error("Item ID is required.");
      return;
    }
    if (isNaN(qty) || qty < 0) {
      toast.error("Min Quantity must be a non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/v1/t/${tenantSlug}/stock-alerts/thresholds/${threshold!.id}`
        : `/api/v1/t/${tenantSlug}/stock-alerts/thresholds`;

      const body = isEdit
        ? { minQuantity: qty }
        : {
            itemId: itemId.trim(),
            locationId: locationId.trim() || null,
            minQuantity: qty,
          };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "Request failed");
      }

      toast.success(isEdit ? "Threshold updated." : "Threshold created.");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Threshold" : "Add Threshold"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the minimum stock quantity for this threshold."
              : "Set a minimum stock quantity alert for an item."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Item ID */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="threshold-item-id">
              Item ID{" "}
              <span style={{ color: "var(--red)" }} aria-hidden>
                *
              </span>
            </Label>
            <Input
              id="threshold-item-id"
              placeholder="UUID of the item"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              disabled={isEdit || saving}
              required
            />
            {isEdit && (
              <p
                style={{ color: "var(--text-dim)" }}
                className="text-[12px]"
              >
                Item cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Location ID */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="threshold-location-id">
              Location ID{" "}
              <span style={{ color: "var(--text-dim)" }} className="text-[12px] font-normal">
                (optional — leave blank for all locations)
              </span>
            </Label>
            <Input
              id="threshold-location-id"
              placeholder="UUID of the location, or leave blank"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={isEdit || saving}
            />
          </div>

          {/* Min Quantity */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="threshold-min-qty">
              Min Quantity{" "}
              <span style={{ color: "var(--red)" }} aria-hidden>
                *
              </span>
            </Label>
            <Input
              id="threshold-min-qty"
              type="number"
              min={0}
              step="any"
              placeholder="e.g. 10"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save Changes" : "Create Threshold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
