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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  contact?: ContactData | null;
  onSuccess: () => void;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  const isEdit = Boolean(contact);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactType: "supplier",
    email: "",
    phone: "",
    gstNumber: "",
    address: "",
    creditLimit: "",
    paymentTermsDays: "",
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        setForm({
          name: contact.name ?? "",
          contactType: contact.contactType ?? "supplier",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          gstNumber: contact.gstNumber ?? "",
          address: contact.address ?? "",
          creditLimit: contact.creditLimit != null ? String(contact.creditLimit) : "",
          paymentTermsDays:
            contact.paymentTermsDays != null
              ? String(contact.paymentTermsDays)
              : "",
          isActive: contact.isActive ?? true,
        });
      } else {
        setForm({
          name: "",
          contactType: "supplier",
          email: "",
          phone: "",
          gstNumber: "",
          address: "",
          creditLimit: "",
          paymentTermsDays: "",
          isActive: true,
        });
      }
    }
  }, [open, contact]);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        contactType: form.contactType,
        isActive: form.isActive,
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.gstNumber.trim()) body.gstNumber = form.gstNumber.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.creditLimit !== "") body.creditLimit = form.creditLimit;
      if (form.paymentTermsDays !== "")
        body.paymentTermsDays = Number(form.paymentTermsDays);

      const url = isEdit
        ? `/api/v1/t/${tenantSlug}/contacts/${contact!.id}`
        : `/api/v1/t/${tenantSlug}/contacts`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save contact");
      }

      toast.success(isEdit ? "Contact updated" : "Contact created");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "Edit contact details" : "Create a new contact"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Row: Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-name">
                Name <span style={{ color: "var(--red)" }}>*</span>
              </Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Sharma Traders"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-type">Type</Label>
              <Select
                value={form.contactType}
                onValueChange={(v) => set("contactType", v)}
              >
                <SelectTrigger id="contact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Row: GST Number + Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-gst">GST Number</Label>
              <Input
                id="contact-gst"
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value)}
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-payment-terms">Payment Terms (Days)</Label>
              <Input
                id="contact-payment-terms"
                type="number"
                min="0"
                value={form.paymentTermsDays}
                onChange={(e) => set("paymentTermsDays", e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          </div>

          {/* Row: Credit Limit + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-credit">Credit Limit</Label>
              <Input
                id="contact-credit"
                type="number"
                min="0"
                step="0.01"
                value={form.creditLimit}
                onChange={(e) => set("creditLimit", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-active">Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) => set("isActive", v === "active")}
              >
                <SelectTrigger id="contact-active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-address">Address</Label>
            <Textarea
              id="contact-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Optional address"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
