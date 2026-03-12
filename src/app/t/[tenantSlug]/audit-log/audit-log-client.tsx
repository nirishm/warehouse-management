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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogClientProps {
  tenantSlug: string;
}

interface Filters {
  entityType: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

type BadgeVariant =
  | "active"
  | "ordered"
  | "cancelled"
  | "dispatched"
  | "default";

function actionVariant(action: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    create: "active",
    update: "ordered",
    delete: "cancelled",
    status_change: "dispatched",
  };
  return map[action] ?? "default";
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

function capitalizeEntityType(entityType: string): string {
  return entityType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditLogClient({ tenantSlug }: AuditLogClientProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    entityType: "",
    action: "",
    dateFrom: "",
    dateTo: "",
  });
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.action) params.set("action", filters.action);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(
        `/api/v1/t/${tenantSlug}/audit-log?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setEntries(json.data ?? []);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const columns: ColumnDef<AuditEntry>[] = [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      size: 170,
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)" }}
          className="text-[13px]"
        >
          {formatDateTime(getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      size: 130,
      cell: ({ getValue }) => {
        const action = getValue() as string;
        return (
          <Badge variant={actionVariant(action)}>
            {action.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "entityType",
      header: "Entity",
      size: 160,
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-primary)" }}
          className="text-[13px]"
        >
          {capitalizeEntityType(getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: "entityId",
      header: "Entity ID",
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
      accessorKey: "userId",
      header: "User",
      size: 130,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <span
            style={{ color: "var(--text-muted)" }}
            className="text-[13px]"
          >
            {v ? v.slice(0, 8) + "…" : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 120,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDetailEntry(row.original)}
          style={{ color: "var(--accent-color)" }}
          className="text-[13px] font-bold"
        >
          View Details
        </Button>
      ),
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
            Audit Log
          </h1>
          <p
            style={{ color: "var(--text-muted)" }}
            className="text-[13px] mt-0.5"
          >
            Track all changes made across your organization.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search audit log…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={filters.entityType || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, entityType: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="item">Item</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="user_membership">User Membership</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="alert_threshold">Alert Threshold</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.action || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, action: v === "all" ? "" : v }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="status_change">Status Change</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) =>
            setFilters((f) => ({ ...f, dateFrom: e.target.value }))
          }
          className="w-[160px]"
          aria-label="From date"
        />

        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) =>
            setFilters((f) => ({ ...f, dateTo: e.target.value }))
          }
          className="w-[160px]"
          aria-label="To date"
        />

        {(filters.entityType || filters.action || filters.dateFrom || filters.dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ entityType: "", action: "", dateFrom: "", dateTo: "" })
            }
            style={{ color: "var(--text-muted)" }}
            className="text-[13px]"
          >
            Clear filters
          </Button>
        )}
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
          data={entries}
          searchValue={search}
          pageSize={20}
          emptyMessage="No audit log entries found. Actions across your organization will appear here."
        />
      )}

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(detailEntry)}
        onOpenChange={() => setDetailEntry(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              {detailEntry?.action?.replace(/_/g, " ")} on{" "}
              {detailEntry?.entityType
                ? capitalizeEntityType(detailEntry.entityType)
                : ""}{" "}
              at {formatDateTime(detailEntry?.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {/* Metadata row */}
          <div className="flex flex-col gap-1 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 text-[13px]">
              <span style={{ color: "var(--text-muted)" }} className="w-20 shrink-0">
                Entity ID
              </span>
              <span
                style={{ color: "var(--text-primary)", fontFamily: "monospace" }}
              >
                {detailEntry?.entityId ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span style={{ color: "var(--text-muted)" }} className="w-20 shrink-0">
                User ID
              </span>
              <span
                style={{ color: "var(--text-primary)", fontFamily: "monospace" }}
              >
                {detailEntry?.userId ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span style={{ color: "var(--text-muted)" }} className="w-20 shrink-0">
                Action
              </span>
              {detailEntry?.action && (
                <Badge variant={actionVariant(detailEntry.action)}>
                  {detailEntry.action.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          </div>

          {/* Before / After diff */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3
                style={{ color: "var(--text-primary)" }}
                className="text-[13px] font-bold mb-2"
              >
                Before
              </h3>
              <pre
                className="bg-[var(--bg-off)] rounded-lg p-3 text-[12px] overflow-x-auto"
                style={{ color: "var(--text-muted)" }}
              >
                {detailEntry?.oldData
                  ? JSON.stringify(detailEntry.oldData, null, 2)
                  : "—"}
              </pre>
            </div>
            <div>
              <h3
                style={{ color: "var(--text-primary)" }}
                className="text-[13px] font-bold mb-2"
              >
                After
              </h3>
              <pre
                className="bg-[var(--bg-off)] rounded-lg p-3 text-[12px] overflow-x-auto"
                style={{ color: "var(--text-muted)" }}
              >
                {detailEntry?.newData
                  ? JSON.stringify(detailEntry.newData, null, 2)
                  : "—"}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
