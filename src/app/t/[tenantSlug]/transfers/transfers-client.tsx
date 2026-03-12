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
import { Plus, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { TransferFormDialog } from "./transfer-form-dialog";
import { TransferReceiveDialog } from "./transfer-receive-dialog";

interface TransferData {
  id: string;
  transferNumber: string;
  originLocationId: string;
  destLocationId: string;
  status: "draft" | "dispatched" | "in_transit" | "received";
  notes: string | null;
  createdAt: string;
}

interface TransfersClientProps {
  tenantSlug: string;
}

type TransferStatus = "draft" | "dispatched" | "in_transit" | "received";

const STATUS_BADGE_VARIANT: Record<TransferStatus, TransferStatus> = {
  draft: "draft",
  dispatched: "dispatched",
  in_transit: "in_transit",
  received: "received",
};

export function TransfersClient({ tenantSlug }: TransfersClientProps) {
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTransfer, setEditTransfer] = useState<TransferData | null>(null);
  const [deleteTransfer, setDeleteTransfer] = useState<TransferData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiveTransfer, setReceiveTransfer] = useState<TransferData | null>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/transfers?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setTransfers(json.data ?? []);
    } catch {
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/v1/t/${tenantSlug}/transfers/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error?.message ?? "Failed to update status");
      return;
    }
    toast.success("Status updated");
    fetchTransfers();
  }

  async function handleDelete() {
    if (!deleteTransfer) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/transfers/${deleteTransfer.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message ?? "Failed to delete transfer");
        return;
      }
      toast.success("Transfer deleted");
      setDeleteTransfer(null);
      fetchTransfers();
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<TransferData>[] = [
    {
      accessorKey: "transferNumber",
      header: "Transfer #",
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
      accessorKey: "originLocationId",
      header: "From Location",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }} className="text-[12px]">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "destLocationId",
      header: "To Location",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }} className="text-[12px]">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as TransferStatus;
        return (
          <Badge variant={STATUS_BADGE_VARIANT[status] ?? "default"}>
            {status.replace("_", " ")}
          </Badge>
        );
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
        const transfer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {transfer.status === "draft" && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditTransfer(transfer);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(transfer.id, "dispatched")}
                  >
                    Dispatch
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    style={{ color: "var(--red)" }}
                    onClick={() => setDeleteTransfer(transfer)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {transfer.status === "dispatched" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(transfer.id, "in_transit")}
                >
                  Mark In Transit
                </DropdownMenuItem>
              )}
              {transfer.status === "in_transit" && (
                <DropdownMenuItem onClick={() => setReceiveTransfer(transfer)}>
                  Receive
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
          <h1 style={{ color: "var(--text-primary)" }} className="text-[22px] font-bold">
            Transfers
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage stock movements between locations.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditTransfer(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Create Transfer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search transfers…"
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
          data={transfers}
          searchValue={search}
          pageSize={25}
          emptyMessage="No transfers found. Create your first transfer to move stock between locations."
        />
      )}

      {/* Create / Edit Dialog */}
      <TransferFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        transfer={editTransfer}
        onClose={() => {
          setFormOpen(false);
          setEditTransfer(null);
        }}
        onSaved={() => {
          setFormOpen(false);
          setEditTransfer(null);
          fetchTransfers();
        }}
      />

      {/* Receive Dialog */}
      {receiveTransfer && (
        <TransferReceiveDialog
          open={!!receiveTransfer}
          tenantSlug={tenantSlug}
          transferId={receiveTransfer.id}
          transferNumber={receiveTransfer.transferNumber}
          onClose={() => setReceiveTransfer(null)}
          onReceived={() => {
            setReceiveTransfer(null);
            fetchTransfers();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTransfer} onOpenChange={() => setDeleteTransfer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transfer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete transfer{" "}
              <strong>{deleteTransfer?.transferNumber}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTransfer(null)}>
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
