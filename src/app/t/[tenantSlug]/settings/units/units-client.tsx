"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UnitFormDialog } from "./unit-form-dialog";

interface UnitData {
  id: string;
  name: string;
  abbreviation: string;
  unitType?: string | null;
  conversionFactor?: string | number | null;
}

interface UnitsClientProps {
  tenantSlug: string;
}

export function UnitsClient({ tenantSlug }: UnitsClientProps) {
  const [units, setUnits] = useState<UnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitData | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<UnitData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/units?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setUnits(json.data ?? []);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  async function handleDelete() {
    if (!deleteUnit) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/units/${deleteUnit.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Unit deleted");
      setDeleteUnit(null);
      fetchUnits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete unit");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<UnitData>[] = [
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
      accessorKey: "abbreviation",
      header: "Abbreviation",
      size: 120,
      cell: ({ getValue }) => (
        <span
          style={{
            color: "var(--accent-color)",
            background: "var(--accent-tint)",
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "unitType",
      header: "Type",
      size: 120,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <span
            style={{
              background: "var(--bg-off)",
              color: "var(--text-muted)",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {type ?? "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "conversionFactor",
      header: "Conversion Factor",
      size: 150,
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
            {v != null ? Number(v).toString() : "1"}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const unit = row.original;
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
                  setEditUnit(unit);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                className="gap-2 cursor-pointer"
                onClick={() => setDeleteUnit(unit)}
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
            Units of Measurement
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Define units used across inventory items (kg, pcs, litre, etc).
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditUnit(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Unit
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search units…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={units}
          searchValue={search}
          pageSize={20}
          emptyMessage="No units yet. Add your first unit of measurement."
        />
      )}

      {/* Create/Edit Dialog */}
      <UnitFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditUnit(null);
        }}
        tenantSlug={tenantSlug}
        unit={editUnit}
        onSuccess={fetchUnits}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteUnit)}
        onOpenChange={() => setDeleteUnit(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteUnit?.name} ({deleteUnit?.abbreviation})
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUnit(null)}
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
