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
import { ContactFormDialog } from "./contact-form-dialog";

interface ContactData {
  id: string;
  name: string;
  contactType: string;
  email?: string | null;
  phone?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  creditLimit?: string | number | null;
  paymentTermsDays?: number | null;
  isActive: boolean;
}

interface ContactsClientProps {
  tenantSlug: string;
}

const TYPE_BADGE_VARIANT: Record<string, "type-purchase" | "type-sale" | "type-dispatch"> = {
  supplier: "type-purchase",
  customer: "type-sale",
  both: "type-dispatch",
};

export function ContactsClient({ tenantSlug }: ContactsClientProps) {
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactData | null>(null);
  const [deleteContact, setDeleteContact] = useState<ContactData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (typeFilter !== "all") params.set("contactType", typeFilter);
      const res = await fetch(`/api/v1/t/${tenantSlug}/contacts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setContacts(json.data ?? []);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, typeFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  async function handleDelete() {
    if (!deleteContact) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/contacts/${deleteContact.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Contact deleted");
      setDeleteContact(null);
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<ContactData>[] = [
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
      accessorKey: "contactType",
      header: "Type",
      size: 110,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        const variant = TYPE_BADGE_VARIANT[type] ?? "type-dispatch";
        return (
          <Badge variant={variant}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
          {(getValue() as string) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      size: 140,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
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
        const contact = row.original;
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
                  setEditContact(contact);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                className="gap-2 cursor-pointer"
                onClick={() => setDeleteContact(contact)}
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
            Contacts
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Manage suppliers, customers and other business contacts.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditContact(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Contact
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
            placeholder="Search contacts…"
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
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="both">Both</SelectItem>
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
          data={contacts}
          searchValue={search}
          pageSize={20}
          emptyMessage="No contacts yet. Add your first supplier or customer to get started."
        />
      )}

      {/* Create/Edit Dialog */}
      <ContactFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditContact(null);
        }}
        tenantSlug={tenantSlug}
        contact={editContact}
        onSuccess={fetchContacts}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={Boolean(deleteContact)}
        onOpenChange={() => setDeleteContact(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteContact?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteContact(null)}
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
