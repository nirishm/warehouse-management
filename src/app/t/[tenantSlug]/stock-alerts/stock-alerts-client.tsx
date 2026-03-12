"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThresholdFormDialog } from "./threshold-form-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StockAlert {
  itemId: string;
  locationId: string | null;
  unitId: string | null;
  currentStock: number;
  minQuantity: number;
  deficit: number;
}

interface Threshold {
  id: string;
  tenantId: string;
  itemId: string;
  locationId: string | null;
  minQuantity: string;
  createdAt: string;
  updatedAt: string;
}

interface StockAlertsClientProps {
  tenantSlug: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function shortId(id: string | null, fallback = "All"): string {
  if (!id) return fallback;
  return id.slice(0, 8) + "…";
}

function formatQty(v: number | string | undefined | null): string {
  if (v == null) return "0";
  const n = Number(v);
  return isNaN(n) ? "0" : n % 1 === 0 ? n.toString() : n.toFixed(3);
}

// ─── Skeleton rows ───────────────────────────────────────────────────────────

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function StockAlertsClient({ tenantSlug }: StockAlertsClientProps) {
  const [activeTab, setActiveTab] = useState("alerts");

  // ── Alerts state
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // ── Thresholds state
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [thresholdsLoading, setThresholdsLoading] = useState(true);

  // ── Threshold dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Threshold | null>(null);

  // ── Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<Threshold | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/stock-alerts`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const json = await res.json();
      setAlerts(json.alerts ?? []);
    } catch {
      toast.error("Failed to load stock alerts.");
    } finally {
      setAlertsLoading(false);
    }
  }, [tenantSlug]);

  // ── Fetch thresholds
  const fetchThresholds = useCallback(async () => {
    setThresholdsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/stock-alerts/thresholds?limit=200`
      );
      if (!res.ok) throw new Error("Failed to fetch thresholds");
      const json = await res.json();
      setThresholds(json.data ?? []);
    } catch {
      toast.error("Failed to load thresholds.");
    } finally {
      setThresholdsLoading(false);
    }
  }, [tenantSlug]);

  // Initial fetch based on active tab
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (activeTab === "thresholds") {
      fetchThresholds();
    }
  }, [activeTab, fetchThresholds]);

  // ── Delete handler
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/stock-alerts/thresholds/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "Delete failed");
      }
      toast.success("Threshold deleted.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchThresholds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Alerts columns ────────────────────────────────────────────────────────

  const alertColumns: ColumnDef<StockAlert>[] = [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ getValue }) => (
        <span
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--mono)",
          }}
          className="text-[12px]"
        >
          {shortId(getValue() as string, "—")}
        </span>
      ),
    },
    {
      accessorKey: "locationId",
      header: "Location",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)", fontFamily: "var(--mono)" }}
          className="text-[12px]"
        >
          {shortId(getValue() as string | null)}
        </span>
      ),
    },
    {
      accessorKey: "currentStock",
      header: "Current Stock",
      size: 130,
      cell: ({ row }) => {
        const deficit = row.original.deficit;
        const isLow = deficit > 0;
        return (
          <span
            style={{
              color: isLow ? "var(--red)" : "var(--text-primary)",
              fontWeight: 700,
            }}
            className="text-[14px]"
          >
            {formatQty(row.original.currentStock)}
          </span>
        );
      },
    },
    {
      accessorKey: "minQuantity",
      header: "Min Quantity",
      size: 120,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {formatQty(getValue() as number)}
        </span>
      ),
    },
    {
      accessorKey: "deficit",
      header: "Deficit",
      size: 100,
      cell: ({ getValue }) => {
        const v = getValue() as number;
        if (v <= 0) {
          return (
            <span style={{ color: "var(--text-dim)" }} className="text-[13px]">
              —
            </span>
          );
        }
        return (
          <span
            style={{ color: "var(--red)", fontWeight: 700 }}
            className="text-[13px]"
          >
            {formatQty(v)}
          </span>
        );
      },
    },
  ];

  // ─── Thresholds columns ────────────────────────────────────────────────────

  const thresholdColumns: ColumnDef<Threshold>[] = [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-primary)", fontFamily: "var(--mono)" }}
          className="text-[12px]"
        >
          {shortId(getValue() as string, "—")}
        </span>
      ),
    },
    {
      accessorKey: "locationId",
      header: "Location",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)", fontFamily: "var(--mono)" }}
          className="text-[12px]"
        >
          {shortId(getValue() as string | null)}
        </span>
      ),
    },
    {
      accessorKey: "minQuantity",
      header: "Min Quantity",
      size: 130,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-primary)" }} className="text-[13px]">
          {formatQty(getValue() as string)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 48,
      enableSorting: false,
      cell: ({ row }) => {
        const t = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditTarget(t);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onClick={() => {
                  setDeleteTarget(t);
                  setDeleteOpen(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1
            style={{ color: "var(--text-primary)" }}
            className="text-[22px] font-bold"
          >
            Stock Alerts
          </h1>
          <p
            style={{ color: "var(--text-muted)" }}
            className="text-[13px] mt-0.5"
          >
            Monitor inventory levels and configure alert thresholds.
          </p>
        </div>

        {/* Add Threshold button — only visible in thresholds tab */}
        {activeTab === "thresholds" && (
          <Button
            size="default"
            onClick={() => {
              setEditTarget(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Threshold
          </Button>
        )}

        {/* Refresh button in alerts tab */}
        {activeTab === "alerts" && (
          <Button
            variant="outline"
            size="default"
            onClick={fetchAlerts}
            disabled={alertsLoading}
          >
            <RefreshCw
              className={`size-4 ${alertsLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        )}
      </div>

      {/* Summary stat for alerts tab */}
      {activeTab === "alerts" && !alertsLoading && alerts.length > 0 && (
        <div
          style={{
            background: "var(--red-bg)",
            border: "1px solid var(--red)",
            borderRadius: "var(--card-radius)",
          }}
          className="flex items-center gap-3 px-4 py-3"
        >
          <AlertTriangle
            style={{ color: "var(--red)", flexShrink: 0 }}
            className="size-5"
          />
          <p style={{ color: "var(--red)" }} className="text-[14px] font-bold">
            {alerts.length} item{alerts.length !== 1 ? "s are" : " is"} below
            minimum stock levels.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col gap-0"
      >
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
        </TabsList>

        {/* ── Active Alerts tab ── */}
        <TabsContent value="alerts">
          {alertsLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <DataTable
              columns={alertColumns}
              data={alerts}
              pageSize={25}
              emptyMessage="No active alerts. All items are at or above their minimum stock thresholds."
            />
          )}
        </TabsContent>

        {/* ── Thresholds tab ── */}
        <TabsContent value="thresholds">
          {thresholdsLoading ? (
            <TableSkeleton rows={8} />
          ) : (
            <DataTable
              columns={thresholdColumns}
              data={thresholds}
              pageSize={25}
              emptyMessage="No thresholds configured. Click 'Add Threshold' to create one."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <ThresholdFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditTarget(null);
        }}
        tenantSlug={tenantSlug}
        threshold={editTarget}
        onSuccess={fetchThresholds}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Threshold</DialogTitle>
            <DialogDescription>
              This will permanently remove the threshold for item{" "}
              <span
                style={{ fontFamily: "var(--mono)", color: "var(--text-primary)" }}
                className="text-[13px]"
              >
                {deleteTarget ? shortId(deleteTarget.itemId, deleteTarget.itemId) : ""}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
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
