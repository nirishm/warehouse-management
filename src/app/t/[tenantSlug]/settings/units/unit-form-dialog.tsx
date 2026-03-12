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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface UnitData {
  id: string;
  name: string;
  abbreviation: string;
  unitType?: string | null;
  conversionFactor?: string | number | null;
}

interface UnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  unit?: UnitData | null;
  onSuccess: () => void;
}

export function UnitFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  unit,
  onSuccess,
}: UnitFormDialogProps) {
  const isEdit = Boolean(unit);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    abbreviation: "",
    unitType: "quantity",
    conversionFactor: "1",
  });

  useEffect(() => {
    if (open) {
      if (unit) {
        setForm({
          name: unit.name ?? "",
          abbreviation: unit.abbreviation ?? "",
          unitType: unit.unitType ?? "quantity",
          conversionFactor:
            unit.conversionFactor != null ? String(unit.conversionFactor) : "1",
        });
      } else {
        setForm({
          name: "",
          abbreviation: "",
          unitType: "quantity",
          conversionFactor: "1",
        });
      }
    }
  }, [open, unit]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.abbreviation.trim()) {
      toast.error("Abbreviation is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        abbreviation: form.abbreviation.trim(),
        unitType: form.unitType,
        conversionFactor: Number(form.conversionFactor) || 1,
      };

      const url = isEdit
        ? `/api/v1/t/${tenantSlug}/units/${unit!.id}`
        : `/api/v1/t/${tenantSlug}/units`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save unit");
      }

      toast.success(isEdit ? "Unit updated" : "Unit created");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save unit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Unit" : "Add Unit"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "Edit unit of measurement" : "Create a new unit of measurement"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Row: Name + Abbreviation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-name">
                Name <span style={{ color: "var(--red)" }}>*</span>
              </Label>
              <Input
                id="unit-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Kilogram"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-abbr">
                Abbreviation <span style={{ color: "var(--red)" }}>*</span>
              </Label>
              <Input
                id="unit-abbr"
                value={form.abbreviation}
                onChange={(e) => set("abbreviation", e.target.value)}
                placeholder="e.g. kg"
                required
              />
            </div>
          </div>

          {/* Row: Type + Conversion Factor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-type">Type</Label>
              <Select
                value={form.unitType}
                onValueChange={(v) => set("unitType", v)}
              >
                <SelectTrigger id="unit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="length">Length</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-conversion">Conversion Factor</Label>
              <Input
                id="unit-conversion"
                type="number"
                min="0"
                step="any"
                value={form.conversionFactor}
                onChange={(e) => set("conversionFactor", e.target.value)}
                placeholder="1"
              />
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
