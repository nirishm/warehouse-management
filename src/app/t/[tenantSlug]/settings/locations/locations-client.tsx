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
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationFormDialog } from "./location-form-dialog";

interface LocationData {
  id: string;
  name: string;
  code?: string | null;
  locationType: string;
  address?: string | null;
  capacity?: number | null;
  isActive: boolean;
}

interface LocationsClientProps {
  tenantSlug: string;
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  warehouse: "Warehouse",
  store: "Store",
  yard: "Yard",
  external: "External",
};

export function LocationsClient({ tenantSlug }: LocationsClientProps) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationData | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<LocationData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (typeFilter !== "all") params.set("locationType", typeFilter);
      const res = await fetch(`/api/v1/t/${tenantSlug}/locations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setLocations(json.data ?? []);
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, typeFilter]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  async function handleDelete() {
    if (!deleteLocation) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/locations/${deleteLocation.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Location deleted");
      setDeleteLocation(null);
      fetchLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete location");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<LocationData>[] = [
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
      accessorKey: "locationType",
      header: "Type",
      size: 120,
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
            {LOCATION_TYPE_LABELS[type] ?? type}
          </span>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px] truncate max-w-[200px] block">
          {(getValue() as string) ?? "—"}
        </span>
      ),
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
        const loc = row.original;
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
                  setEditLocation(loc);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                className="gap-2 cursor-pointer"
                onClick={() => setDeleteLocation(loc)}
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
            Locations
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage warehouses, stores, yards and external locations.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditLocation(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
            style={{ color: "var(--text-dim)" }}
          />
          <Input
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="store">Store</SelectItem>
            <SelectItem value="yard">Yard</SelectItem>
            <SelectItem value="external">External</SelectItem>
          </SelectContent>
        </Select>
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
          data={locations}
          searchValue={search}
          pageSize={20}
          emptyMessage="No locations yet. Create your first location to get started."
        />
      )}

      {/* Create/Edit Dialog */}
      <LocationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditLocation(null);
        }}
        tenantSlug={tenantSlug}
        location={editLocation}
        onSuccess={fetchLocations}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteLocation)}
        onOpenChange={() => setDeleteLocation(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteLocation?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteLocation(null)}
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
