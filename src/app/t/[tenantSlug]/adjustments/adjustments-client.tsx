"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, Trash2, CheckCircle } from "lucide-react";
import { AdjustmentFormDialog } from "./adjustment-form-dialog";

interface AdjustmentData {
  id: string;
  adjustmentNumber: string;
  locationId: string;
  type: "qty" | "value";
  reason: string | null;
  status: "draft" | "approved";
  notes: string | null;
  createdAt: string;
}

interface AdjustmentsClientProps {
  tenantSlug: string;
}

export function AdjustmentsClient({ tenantSlug }: AdjustmentsClientProps) {
  const [adjustments, setAdjustments] = useState<AdjustmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAdjustment, setEditAdjustment] = useState<AdjustmentData | null>(null);
  const [deleteAdjustment, setDeleteAdjustment] = useState<AdjustmentData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [approveAdjustment, setApproveAdjustment] = useState<AdjustmentData | null>(null);
  const [approving, setApproving] = useState(false);

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/adjustments?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setAdjustments(json.data ?? []);
    } catch {
      toast.error("Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  async function handleDelete() {
    if (!deleteAdjustment) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/adjustments/${deleteAdjustment.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message ?? "Failed to delete adjustment");
        return;
      }
      toast.success("Adjustment deleted");
      setDeleteAdjustment(null);
      fetchAdjustments();
    } finally {
      setDeleting(false);
    }
  }

  async function handleApprove() {
    if (!approveAdjustment) return;
    setApproving(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/adjustments/${approveAdjustment.id}/approve`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message ?? "Failed to approve adjustment");
        return;
      }
      toast.success("Adjustment approved");
      setApproveAdjustment(null);
      fetchAdjustments();
    } finally {
      setApproving(false);
    }
  }

  const columns: ColumnDef<AdjustmentData>[] = [
    {
      accessorKey: "adjustmentNumber",
      header: "Adjustment #",
      cell: ({ getValue }) => (
        <span
          style={{ fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 700 }}
          className="text-[13px]"
        >
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "locationId",
      header: "Location",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }} className="text-[12px]">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <Badge variant={type === "qty" ? "type-purchase" : "type-dispatch"}>
            {type === "qty" ? "Qty" : "Value"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {(getValue() as string | null) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as "draft" | "approved";
        return <Badge variant={status}>{status}</Badge>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[12px]">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 48,
      cell: ({ row }) => {
        const adjustment = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {adjustment.status === "draft" && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditAdjustment(adjustment);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setApproveAdjustment(adjustment)}>
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    style={{ color: "var(--red)" }}
                    onClick={() => setDeleteAdjustment(adjustment)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
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
          <h1 style={{ color: "var(--text-primary)" }} className="text-[22px] font-bold">
            Adjustments
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage stock quantity and value adjustments.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditAdjustment(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Create Adjustment
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search adjustments…"
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
          data={adjustments}
          searchValue={search}
          pageSize={25}
          emptyMessage="No adjustments found. Create an adjustment to correct stock quantities or values."
        />
      )}

      {/* Create / Edit Dialog */}
      <AdjustmentFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        adjustment={editAdjustment}
        onClose={() => {
          setFormOpen(false);
          setEditAdjustment(null);
        }}
        onSaved={() => {
          setFormOpen(false);
          setEditAdjustment(null);
          fetchAdjustments();
        }}
      />

      {/* Approve Confirmation Dialog */}
      <Dialog open={!!approveAdjustment} onOpenChange={() => setApproveAdjustment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Adjustment</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve adjustment{" "}
              <strong>{approveAdjustment?.adjustmentNumber}</strong>? Once approved, the
              stock levels will be updated and this action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveAdjustment(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              <CheckCircle className="size-4" />
              {approving ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteAdjustment} onOpenChange={() => setDeleteAdjustment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Adjustment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete adjustment{" "}
              <strong>{deleteAdjustment?.adjustmentNumber}</strong>? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdjustment(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="size-4" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
