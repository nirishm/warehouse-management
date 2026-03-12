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
import { SaleFormDialog } from "./sale-form-dialog";

interface SaleData {
  id: string;
  saleNumber: string;
  contactId?: string | null;
  locationId?: string | null;
  status: string;
  trackingNumber?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface SalesClientProps {
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
    confirmed: "confirmed",
    dispatched: "dispatched",
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

export function SalesClient({ tenantSlug }: SalesClientProps) {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSale, setEditSale] = useState<SaleData | null>(null);
  const [deleteSale, setDeleteSale] = useState<SaleData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/sales?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setSales(json.data ?? []);
    } catch {
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  async function handleDelete() {
    if (!deleteSale) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/sales/${deleteSale.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to delete");
      }
      toast.success("Sale deleted");
      setDeleteSale(null);
      fetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete sale");
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/v1/t/${tenantSlug}/sales/${id}/status`, {
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
    fetchSales();
  }

  const columns: ColumnDef<SaleData>[] = [
    {
      accessorKey: "saleNumber",
      header: "Sale #",
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
      accessorKey: "trackingNumber",
      header: "Tracking #",
      size: 140,
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return (
          <span
            style={{ color: v ? "var(--text-primary)" : "var(--text-muted)", fontFamily: v ? "monospace" : undefined }}
            className="text-[13px]"
          >
            {v ?? "—"}
          </span>
        );
      },
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
        const sale = row.original;
        const isDraft = sale.status === "draft";
        const isConfirmed = sale.status === "confirmed";
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
                      setEditSale(sale);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(sale.id, "confirmed")}
                  >
                    <ArrowRight className="size-4" />
                    Confirm
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(sale.id, "cancelled")}
                  >
                    <XCircle className="size-4" />
                    Cancel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    className="gap-2 cursor-pointer"
                    onClick={() => setDeleteSale(sale)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isConfirmed && (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(sale.id, "dispatched")}
                  >
                    <ArrowRight className="size-4" />
                    Mark as Dispatched
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    className="gap-2 cursor-pointer"
                    onClick={() => handleStatusChange(sale.id, "cancelled")}
                  >
                    <XCircle className="size-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
              {!isDraft && !isConfirmed && (
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
            Sales
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage sales orders and track dispatch status.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditSale(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Create Sale
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search sales…"
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
          data={sales}
          searchValue={search}
          pageSize={20}
          emptyMessage="No sales yet. Create your first sale order to get started."
        />
      )}

      {/* Create/Edit Dialog */}
      <SaleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditSale(null);
        }}
        tenantSlug={tenantSlug}
        sale={editSale}
        onSuccess={fetchSales}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteSale)}
        onOpenChange={() => setDeleteSale(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete sale{" "}
              <strong>{deleteSale?.saleNumber}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSale(null)}
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
