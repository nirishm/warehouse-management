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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, MoreHorizontal, Trash2, Shield, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteUserDialog } from "./invite-user-dialog";
import { LocationAssignDialog } from "./location-assign-dialog";

interface UserData {
  userId: string;
  membershipId: string;
  role: string;
  isDefault: boolean;
  displayName: string | null;
  phone: string | null;
}

interface UsersClientProps {
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

function roleVariant(role: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    owner: "active",
    admin: "confirmed",
    manager: "ordered",
    operator: "dispatched",
    viewer: "draft",
  };
  return map[role] ?? "default";
}

export function UsersClient({ tenantSlug }: UsersClientProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Role change dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogUser, setRoleDialogUser] = useState<UserData | null>(null);
  const [newRole, setNewRole] = useState("operator");
  const [savingRole, setSavingRole] = useState(false);

  // Location assignment dialog state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDialogUser, setLocationDialogUser] = useState<UserData | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/users?limit=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openRoleDialog(user: UserData) {
    setRoleDialogUser(user);
    setNewRole(user.role === "owner" ? "admin" : user.role);
    setRoleDialogOpen(true);
  }

  async function handleRoleChange() {
    if (!roleDialogUser) return;
    setSavingRole(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/users/${roleDialogUser.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to update role");
      }
      toast.success(`Role updated to ${newRole}`);
      setRoleDialogOpen(false);
      setRoleDialogUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/users/${deleteUser.userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to remove user");
      }
      toast.success("User removed from workspace");
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: "displayName",
      header: "Name",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-primary)" }}
          className="text-[13px] font-bold"
        >
          {(getValue() as string | null) ?? "Unnamed User"}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      size: 130,
      cell: ({ getValue }) => {
        const r = getValue() as string;
        return (
          <Badge variant={roleVariant(r)}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {(getValue() as string | null) ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      size: 60,
      cell: ({ row }) => {
        const user = row.original;
        if (user.role === "owner") return null;
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
                onClick={() => openRoleDialog(user)}
              >
                <Shield className="size-4" />
                Change Role
              </DropdownMenuItem>
              {!["owner", "admin"].includes(user.role) && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => {
                    setLocationDialogUser(user);
                    setLocationDialogOpen(true);
                  }}
                >
                  <MapPin className="size-4" />
                  Manage Locations
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                destructive
                className="gap-2 cursor-pointer"
                onClick={() => setDeleteUser(user)}
              >
                <Trash2 className="size-4" />
                Remove
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
            Users
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage team members and their roles.
          </p>
        </div>
        <Button size="lg" onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" />
          Invite User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search users…"
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
          data={users}
          searchValue={search}
          pageSize={20}
          emptyMessage="No users yet. Invite your first team member to get started."
        />
      )}

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tenantSlug={tenantSlug}
        onSuccess={fetchUsers}
      />

      {/* Change Role Dialog */}
      <Dialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (!open) setRoleDialogUser(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for{" "}
              <strong>
                {roleDialogUser?.displayName ?? "this user"}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="role-select">New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger id="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              disabled={savingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={savingRole}>
              {savingRole ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Assignment Dialog */}
      {locationDialogUser && (
        <LocationAssignDialog
          open={locationDialogOpen}
          onOpenChange={(open) => {
            setLocationDialogOpen(open);
            if (!open) setLocationDialogUser(null);
          }}
          tenantSlug={tenantSlug}
          userId={locationDialogUser.userId}
          userName={locationDialogUser.displayName ?? "this user"}
          onSuccess={fetchUsers}
        />
      )}

      {/* Remove User Confirmation */}
      <Dialog
        open={Boolean(deleteUser)}
        onOpenChange={() => setDeleteUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteUser?.displayName ?? "this user"}</strong> from
              your workspace? They will lose all access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUser(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Removing…" : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
