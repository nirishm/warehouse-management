"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemFormDialog } from "./item-form-dialog";

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

interface ItemsClientProps {
  tenantSlug: string;
}

export function ItemsClient({ tenantSlug }: ItemsClientProps) {
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemData | null>(null);
  const [deleteItem, setDeleteItem] = useState<ItemData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      const res = await fetch(`/api/v1/t/${tenantSlug}/items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/items/${deleteItem.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Item deleted");
      setDeleteItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<ItemData>[] = [
    {
      accessorKey: "code",
      header: "Code",
      size: 120,
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)", fontFamily: "monospace" }}
          className="text-[13px]"
        >
          {(getValue() as string) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-primary)" }}
          className="font-bold text-[14px]"
        >
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {(getValue() as string) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "itemType",
      header: "Type",
      size: 100,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <span
            style={{
              backgroundColor: "var(--bg-off)",
              color: "var(--text-muted)",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "purchasePrice",
      header: "Purchase Price",
      size: 130,
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
            {v != null ? `₹${Number(v).toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "sellingPrice",
      header: "Selling Price",
      size: 120,
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
            {v != null ? `₹${Number(v).toFixed(2)}` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      size: 90,
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="active">Active</Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        ),
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => {
                  setEditItem(item);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                className="gap-2 cursor-pointer"
                onClick={() => setDeleteItem(item)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            style={{ color: "var(--text-primary)" }}
            className="text-[22px] font-bold"
          >
            Items
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage your inventory items and products.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditItem(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchValue={search}
          pageSize={20}
          emptyMessage="No items yet. Create your first item to get started."
        />
      )}

      {/* Create/Edit Dialog */}
      <ItemFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditItem(null);
        }}
        tenantSlug={tenantSlug}
        item={editItem}
        onSuccess={fetchItems}
      />

      {/* Delete Confirmation */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteItem?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteItem(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
