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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  onSuccess: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  tenantSlug,
  onSuccess,
}: InviteUserDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    role: "operator",
  });

  useEffect(() => {
    if (open) {
      setForm({ email: "", displayName: "", role: "operator" });
    }
  }, [open]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        email: form.email.trim(),
        role: form.role,
      };
      if (form.displayName.trim()) {
        body.displayName = form.displayName.trim();
      }

      const res = await fetch(`/api/v1/t/${tenantSlug}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to invite user");
      }

      toast.success("Invitation sent successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They will receive an email
            to join your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">
              Email <span style={{ color: "var(--red)" }}>*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="colleague@example.com"
              required
            />
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-display-name">Display Name</Label>
            <Input
              id="invite-display-name"
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger id="invite-role">
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
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Sending…" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
