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

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  onSuccess: () => void;
}

interface FormState {
  type: string;
  referenceId: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  type: "",
  referenceId: "",
  amount: "",
  paymentMethod: "",
  paymentDate: "",
  notes: "",
});

export function PaymentFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  onSuccess,
}: PaymentFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
  }, [open]);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.type) {
      toast.error("Please select a payment type");
      return;
    }
    if (!form.referenceId.trim()) {
      toast.error("Reference ID is required");
      return;
    }
    if (!form.amount.trim() || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        referenceId: form.referenceId.trim(),
        amount: form.amount.trim(),
      };
      if (form.paymentMethod.trim()) body.paymentMethod = form.paymentMethod.trim();
      if (form.paymentDate) body.paymentDate = form.paymentDate;
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch(`/api/v1/t/${tenantSlug}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? "Failed to record payment");
      }

      toast.success("Payment recorded");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription className="sr-only">
            Record a new payment against a purchase or sale
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-type">
              Type <span style={{ color: "var(--accent-color)" }}>*</span>
            </Label>
            <Select
              value={form.type}
              onValueChange={(v) => setField("type", v)}
            >
              <SelectTrigger id="payment-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference ID */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-reference">
              Reference ID <span style={{ color: "var(--accent-color)" }}>*</span>
            </Label>
            <Input
              id="payment-reference"
              value={form.referenceId}
              onChange={(e) => setField("referenceId", e.target.value)}
              placeholder="UUID of the purchase or sale"
              style={{ fontFamily: "monospace" }}
            />
            <p style={{ color: "var(--text-muted)" }} className="text-[12px]">
              Enter the ID of the purchase order or sale this payment is for.
            </p>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">
              Amount (₹) <span style={{ color: "var(--accent-color)" }}>*</span>
            </Label>
            <Input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Method */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Input
              id="payment-method"
              value={form.paymentMethod}
              onChange={(e) => setField("paymentMethod", e.target.value)}
              placeholder="e.g. bank_transfer, cash, card"
            />
          </div>

          {/* Payment Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="datetime-local"
              value={form.paymentDate}
              onChange={(e) => setField("paymentDate", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-notes">Notes</Label>
            <Textarea
              id="payment-notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional notes about this payment"
              rows={2}
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
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
