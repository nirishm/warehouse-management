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
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseFormDialog } from "./purchase-form-dialog";

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

interface PurchasesClientProps {
  tenantSlug: string;
}

type BadgeVariant =
  | "draft"
  | "ordered"
  | "received"
  | "cancelled"
  | "confirmed"
  | "dispatched"
  | "in_transit"
  | "approved"
  | "active"
  | "default";

function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    draft: "draft",
    ordered: "ordered",
    received: "received",
    cancelled: "cancelled",
  };
  return map[status] ?? "default";
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function PurchasesClient({ tenantSlug }: PurchasesClientProps) {
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editPurchase, setEditPurchase] = useState<PurchaseData | null>(null);
  const [deletePurchase, setDeletePurchase] = useState<PurchaseData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/purchases?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setPurchases(json.data ?? []);
    } catch {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  async function handleDelete() {
    if (!deletePurchase) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/purchases/${deletePurchase.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to delete");
      }
      toast.success("Purchase deleted");
      setDeletePurchase(null);
      fetchPurchases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete purchase");
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/v1/t/${tenantSlug}/purchases/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error?.message ?? err.error ?? "Failed to update status");
      return;
    }
    toast.success(`Status updated to ${status}`);
    fetchPurchases();
  }

  const columns: ColumnDef<PurchaseData>[] = [
    {
      accessorKey: "purchaseNumber",
      header: "Purchase #",
      size: 150,
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-primary)", fontFamily: "monospace" }}
          className="text-[13px] font-bold"
        >
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "contactId",
      header: "Contact",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return (
          <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
            {v ? v.slice(0, 8) + "…" : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "locationId",
      header: "Location",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return (
          <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
            {v ? v.slice(0, 8) + "…" : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return (
          <Badge variant={statusVariant(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Expected Delivery",
      size: 150,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {formatDate(getValue() as string | null)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      size: 130,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {formatDate(getValue() as string)}
        </span>
      ),
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const purchase = row.original;
        const isDraft = purchase.status === "draft";
        const isOrdered = purchase.status === "ordered";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isDraft && (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => {
                      setEditPurchase(purchase);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(purchase.id, "ordered")}
                  >
                    <ArrowRight className="size-4" />
                    Mark as Ordered
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(purchase.id, "cancelled")}
                  >
                    <XCircle className="size-4" />
                    Cancel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    className="gap-2 cursor-pointer"
                    onClick={() => setDeletePurchase(purchase)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isOrdered && (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(purchase.id, "received")}
                  >
                    <ArrowRight className="size-4" />
                    Mark as Received
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(purchase.id, "cancelled")}
                  >
                    <XCircle className="size-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
              {!isDraft && !isOrdered && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  disabled
                >
                  <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
                    No actions available
                  </span>
                </DropdownMenuItem>
              )}
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
            Purchases
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage purchase orders and track delivery status.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditPurchase(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Create Purchase
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search purchases…"
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
          data={purchases}
          searchValue={search}
          pageSize={20}
          emptyMessage="No purchases yet. Create your first purchase order to get started."
        />
      )}

      {/* Create/Edit Dialog */}
      <PurchaseFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditPurchase(null);
        }}
        tenantSlug={tenantSlug}
        purchase={editPurchase}
        onSuccess={fetchPurchases}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deletePurchase)}
        onOpenChange={() => setDeletePurchase(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete purchase{" "}
              <strong>{deletePurchase?.purchaseNumber}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletePurchase(null)}
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
