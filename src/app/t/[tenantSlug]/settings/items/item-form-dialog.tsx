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

interface ItemData {
  id: string;
  name: string;
  code?: string | null;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  itemType: string;
  defaultUnitId?: string | null;
  purchasePrice?: string | number | null;
  sellingPrice?: string | number | null;
  hsnCode?: string | null;
  reorderLevel?: number | null;
  shelfLifeDays?: number | null;
  isActive: boolean;
}

interface UnitOption {
  id: string;
  name: string;
  abbreviation: string;
}

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  item?: ItemData | null;
  onSuccess: () => void;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  item,
  onSuccess,
}: ItemFormDialogProps) {
  const isEdit = Boolean(item);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);

  const [form, setForm] = useState({
    name: "",
    code: "",
    sku: "",
    description: "",
    category: "",
    itemType: "goods",
    defaultUnitId: "",
    purchasePrice: "",
    sellingPrice: "",
    hsnCode: "",
    reorderLevel: "",
    shelfLifeDays: "",
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          name: item.name ?? "",
          code: item.code ?? "",
          sku: item.sku ?? "",
          description: item.description ?? "",
          category: item.category ?? "",
          itemType: item.itemType ?? "goods",
          defaultUnitId: item.defaultUnitId ?? "",
          purchasePrice: item.purchasePrice != null ? String(item.purchasePrice) : "",
          sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : "",
          hsnCode: item.hsnCode ?? "",
          reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
          shelfLifeDays: item.shelfLifeDays != null ? String(item.shelfLifeDays) : "",
          isActive: item.isActive ?? true,
        });
      } else {
        setForm({
          name: "",
          code: "",
          sku: "",
          description: "",
          category: "",
          itemType: "goods",
          defaultUnitId: "",
          purchasePrice: "",
          sellingPrice: "",
          hsnCode: "",
          reorderLevel: "",
          shelfLifeDays: "",
          isActive: true,
        });
      }
      // Fetch units for selector
      fetch(`/api/v1/t/${tenantSlug}/units?limit=100`)
        .then((r) => r.json())
        .then((json) => setUnits(json.data ?? []))
        .catch(() => setUnits([]));
    }
  }, [open, item, tenantSlug]);

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
        itemType: form.itemType,
        isActive: form.isActive,
      };
      if (form.code.trim()) body.code = form.code.trim();
      if (form.sku.trim()) body.sku = form.sku.trim();
      if (form.description.trim()) body.description = form.description.trim();
      if (form.category.trim()) body.category = form.category.trim();
      if (form.defaultUnitId) body.defaultUnitId = form.defaultUnitId;
      if (form.purchasePrice !== "") body.purchasePrice = form.purchasePrice;
      if (form.sellingPrice !== "") body.sellingPrice = form.sellingPrice;
      if (form.hsnCode.trim()) body.hsnCode = form.hsnCode.trim();
      if (form.reorderLevel !== "") body.reorderLevel = Number(form.reorderLevel);
      if (form.shelfLifeDays !== "") body.shelfLifeDays = Number(form.shelfLifeDays);

      const url = isEdit
        ? `/api/v1/t/${tenantSlug}/items/${item!.id}`
        : `/api/v1/t/${tenantSlug}/items`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save item");
      }

      toast.success(isEdit ? "Item updated" : "Item created");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Item" : "Add Item"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "Edit item details" : "Create a new inventory item"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Row: Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-name">
                Name <span style={{ color: "var(--red)" }}>*</span>
              </Label>
              <Input
                id="item-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Cement Bag 50kg"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-code">Code</Label>
              <Input
                id="item-code"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="Auto-generated if blank"
              />
            </div>
          </div>

          {/* Row: SKU + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="Stock keeping unit"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-category">Category</Label>
              <Input
                id="item-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Building Materials"
              />
            </div>
          </div>

          {/* Row: Type + Default Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-type">Type</Label>
              <Select
                value={form.itemType}
                onValueChange={(v) => set("itemType", v)}
              >
                <SelectTrigger id="item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods">Goods</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-unit">Default Unit</Label>
              <Select
                value={form.defaultUnitId}
                onValueChange={(v) => set("defaultUnitId", v)}
              >
                <SelectTrigger id="item-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Purchase Price + Selling Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-purchase-price">Purchase Price</Label>
              <Input
                id="item-purchase-price"
                type="number"
                min="0"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => set("purchasePrice", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-selling-price">Selling Price</Label>
              <Input
                id="item-selling-price"
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => set("sellingPrice", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row: HSN Code + Reorder Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-hsn">HSN Code</Label>
              <Input
                id="item-hsn"
                value={form.hsnCode}
                onChange={(e) => set("hsnCode", e.target.value)}
                placeholder="e.g. 2523"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-reorder">Reorder Level</Label>
              <Input
                id="item-reorder"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Row: Shelf Life Days + Is Active */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-shelf-life">Shelf Life (Days)</Label>
              <Input
                id="item-shelf-life"
                type="number"
                min="0"
                value={form.shelfLifeDays}
                onChange={(e) => set("shelfLifeDays", e.target.value)}
                placeholder="Leave blank if N/A"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-active">Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) => set("isActive", v === "active")}
              >
                <SelectTrigger id="item-active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-description">Description</Label>
            <Textarea
              id="item-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional description"
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
