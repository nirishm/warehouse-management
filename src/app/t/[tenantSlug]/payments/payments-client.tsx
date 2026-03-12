"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentFormDialog } from "./payment-form-dialog";

interface PaymentData {
  id: string;
  paymentNumber: string;
  type: string;
  referenceId: string;
  amount: string;
  paymentMethod: string | null;
  paymentDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface PaymentsClientProps {
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
  | "default"
  | "type-purchase"
  | "type-sale";

function typeVariant(type: string): BadgeVariant {
  if (type === "purchase") return "type-purchase";
  if (type === "sale") return "type-sale";
  return "default";
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

export function PaymentsClient({ tenantSlug }: PaymentsClientProps) {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "sale">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState<PaymentData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/payments?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setPayments(json.data ?? []);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  async function handleDelete() {
    if (!deletePayment) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/payments/${deletePayment.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to delete");
      }
      toast.success("Payment deleted");
      setDeletePayment(null);
      fetchPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete payment");
    } finally {
      setDeleting(false);
    }
  }

  const filteredPayments =
    typeFilter === "all"
      ? payments
      : payments.filter((p) => p.type === typeFilter);

  const columns: ColumnDef<PaymentData>[] = [
    {
      accessorKey: "paymentNumber",
      header: "Payment #",
      size: 140,
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
      accessorKey: "type",
      header: "Type",
      size: 100,
      cell: ({ getValue }) => {
        const t = getValue() as string;
        return (
          <Badge variant={typeVariant(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "referenceId",
      header: "Reference",
      size: 130,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span
            style={{ color: "var(--text-muted)", fontFamily: "monospace" }}
            className="text-[13px]"
          >
            {v ? v.slice(0, 8) + "…" : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      size: 130,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span
            style={{ color: "var(--text-primary)" }}
            className="text-[13px] font-bold"
          >
            ₹{Number(v).toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      size: 130,
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        const display = v
          ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ")
          : "—";
        return (
          <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
            {display}
          </span>
        );
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      size: 120,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {formatDate(getValue() as string | null)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      size: 120,
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
        const payment = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                destructive
                className="gap-2 cursor-pointer"
                onClick={() => setDeletePayment(payment)}
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
            Payments
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Track payments against purchases and sales.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="size-4" />
          Record Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
            style={{ color: "var(--text-dim)" }}
          />
          <Input
            placeholder="Search payments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "all" | "purchase" | "sale")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
          </SelectContent>
        </Select>
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
          data={filteredPayments}
          searchValue={search}
          pageSize={20}
          emptyMessage="No payments yet. Record your first payment to get started."
        />
      )}

      {/* Create Dialog */}
      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantSlug={tenantSlug}
        onSuccess={fetchPayments}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deletePayment)}
        onOpenChange={() => setDeletePayment(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete payment{" "}
              <strong>{deletePayment?.paymentNumber}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletePayment(null)}
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
