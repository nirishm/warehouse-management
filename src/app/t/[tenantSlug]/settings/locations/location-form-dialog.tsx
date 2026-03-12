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
import { toast } from "sonner";

interface LocationData {
  id: string;
  name: string;
  code?: string | null;
  locationType: string;
  address?: string | null;
  capacity?: number | null;
  isActive: boolean;
}

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  location?: LocationData | null;
  onSuccess: () => void;
}

export function LocationFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  location,
  onSuccess,
}: LocationFormDialogProps) {
  const isEdit = Boolean(location);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    locationType: "warehouse",
    address: "",
    capacity: "",
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      if (location) {
        setForm({
          name: location.name ?? "",
          code: location.code ?? "",
          locationType: location.locationType ?? "warehouse",
          address: location.address ?? "",
          capacity: location.capacity != null ? String(location.capacity) : "",
          isActive: location.isActive ?? true,
        });
      } else {
        setForm({
          name: "",
          code: "",
          locationType: "warehouse",
          address: "",
          capacity: "",
          isActive: true,
        });
      }
    }
  }, [open, location]);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        locationType: form.locationType,
        isActive: form.isActive,
      };
      if (form.code.trim()) body.code = form.code.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.capacity !== "") body.capacity = Number(form.capacity);

      const url = isEdit
        ? `/api/v1/t/${tenantSlug}/locations/${location!.id}`
        : `/api/v1/t/${tenantSlug}/locations`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save location");
      }

      toast.success(isEdit ? "Location updated" : "Location created");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Location" : "Add Location"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "Edit location details" : "Create a new location"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Row: Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc-name">
                Name <span style={{ color: "var(--red)" }}>*</span>
              </Label>
              <Input
                id="loc-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Main Warehouse"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc-code">Code</Label>
              <Input
                id="loc-code"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="Auto-generated if blank"
              />
            </div>
          </div>

          {/* Row: Type + Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc-type">Type</Label>
              <Select
                value={form.locationType}
                onValueChange={(v) => set("locationType", v)}
              >
                <SelectTrigger id="loc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="yard">Yard</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc-capacity">Capacity</Label>
              <Input
                id="loc-capacity"
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc-active">Status</Label>
            <Select
              value={form.isActive ? "active" : "inactive"}
              onValueChange={(v) => set("isActive", v === "active")}
            >
              <SelectTrigger id="loc-active">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc-address">Address</Label>
            <Textarea
              id="loc-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Optional address"
              rows={3}
            />
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
