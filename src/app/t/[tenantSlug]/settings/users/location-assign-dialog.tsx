"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LocationOption {
  id: string;
  name: string;
}

interface LocationAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

export function LocationAssignDialog({
  open,
  onOpenChange,
  tenantSlug,
  userId,
  userName,
  onSuccess,
}: LocationAssignDialogProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoadingLocations(true);
      setLoadingAssignments(true);

      try {
        const [locRes, assignRes] = await Promise.all([
          fetch(`/api/v1/t/${tenantSlug}/locations?limit=200`),
          fetch(`/api/v1/t/${tenantSlug}/users/${userId}`),
        ]);

        if (!locRes.ok) throw new Error("Failed to fetch locations");
        if (!assignRes.ok) throw new Error("Failed to fetch user details");

        const locJson = await locRes.json();
        const assignJson = await assignRes.json();

        const locs: LocationOption[] = (locJson.data ?? []).map(
          (l: { id: string; name: string }) => ({ id: l.id, name: l.name })
        );
        setLocations(locs);

        const assignedIds: string[] = (assignJson.data?.locations ?? []).map(
          (l: { locationId: string }) => l.locationId
        );
        setSelectedIds(new Set(assignedIds));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load data"
        );
      } finally {
        setLoadingLocations(false);
        setLoadingAssignments(false);
      }
    }

    load();
  }, [open, tenantSlug, userId]);

  function toggleLocation(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/users/${userId}/locations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationIds: Array.from(selectedIds) }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error?.message ?? err.error ?? "Failed to update locations"
        );
      }

      toast.success("Location assignments updated");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update locations"
      );
    } finally {
      setSaving(false);
    }
  }

  const isLoading = loadingLocations || loadingAssignments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Locations</DialogTitle>
          <DialogDescription>
            Select which locations <strong>{userName}</strong> can access.
            Unassigned locations will be hidden from this user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))
          ) : locations.length === 0 ? (
            <p
              style={{ color: "var(--text-muted)" }}
              className="text-[13px] py-4 text-center"
            >
              No locations found. Create locations first.
            </p>
          ) : (
            locations.map((loc) => (
              <label
                key={loc.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-[var(--bg-off)] transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(loc.id)}
                  onCheckedChange={() => toggleLocation(loc.id)}
                />
                <span
                  style={{ color: "var(--text-primary)" }}
                  className="text-[13px]"
                >
                  {loc.name}
                </span>
              </label>
            ))
          )}
        </div>

        {!isLoading && locations.length > 0 && (
          <p
            style={{ color: "var(--text-dim)" }}
            className="text-[12px]"
          >
            {selectedIds.size} of {locations.length} location
            {locations.length !== 1 ? "s" : ""} selected
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isLoading}>
            {saving ? "Saving…" : "Save Locations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
