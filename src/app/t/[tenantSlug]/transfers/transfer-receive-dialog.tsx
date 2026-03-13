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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";

interface ReceiveItem {
  id: string;
  itemId: string;
  unitId: string | null;
  sentQty: string;
  receivedQty: string;
}

interface TransferReceiveDialogProps {
  open: boolean;
  tenantSlug: string;
  transferId: string;
  transferNumber: string;
  onClose: () => void;
  onReceived: () => void;
}

function formatQty(v: string | number | null | undefined): string {
  if (v == null) return "0";
  const n = Number(v);
  return isNaN(n) ? "0" : n % 1 === 0 ? n.toString() : n.toFixed(3);
}

export function TransferReceiveDialog({
  open,
  tenantSlug,
  transferId,
  transferNumber,
  onClose,
  onReceived,
}: TransferReceiveDialogProps) {
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !transferId) return;
    setLoading(true);
    fetch(`/api/v1/t/${tenantSlug}/transfers/${transferId}`)
      .then((r) => r.json())
      .then((json) => {
        const transferItems = json.data?.items ?? json.items ?? [];
        setItems(
          transferItems.map(
            (item: {
              id: string;
              itemId: string;
              unitId: string | null;
              sentQty: string | number;
              receivedQty?: string | number | null;
            }) => ({
              id: item.id,
              itemId: item.itemId,
              unitId: item.unitId ?? null,
              sentQty: String(item.sentQty),
              receivedQty: formatQty(item.sentQty),
            })
          )
        );
      })
      .catch(() => toast.error("Failed to load transfer details"))
      .finally(() => setLoading(false));
  }, [open, transferId, tenantSlug]);

  function updateReceivedQty(index: number, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, receivedQty: value } : item))
    );
  }

  function computeShortage(item: ReceiveItem): number {
    const sent = Number(item.sentQty) || 0;
    const received = Number(item.receivedQty) || 0;
    return Math.max(0, sent - received);
  }

  async function handleSubmit() {
    const hasInvalid = items.some(
      (item) => item.receivedQty === "" || isNaN(Number(item.receivedQty))
    );
    if (hasInvalid) {
      toast.error("All received quantities are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/transfers/${transferId}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              receivedQty: item.receivedQty,
            })),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message ?? "Failed to receive transfer");
        return;
      }

      toast.success("Transfer received successfully");
      onReceived();
    } finally {
      setSubmitting(false);
    }
  }

  const totalShortage = items.reduce((acc, item) => acc + computeShortage(item), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Transfer</DialogTitle>
          <DialogDescription>
            Enter received quantities for transfer{" "}
            <strong>{transferNumber}</strong>. Shortages will be recorded
            automatically.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p
            style={{ color: "var(--text-muted)" }}
            className="text-[13px] py-4 text-center"
          >
            No line items found for this transfer.
          </p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {/* Column headers */}
            <div
              className="grid grid-cols-[1fr_100px_120px_100px] gap-2 px-1"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.06em]">Item ID</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.06em]">Sent Qty</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.06em]">Received Qty</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.06em]">Shortage</span>
            </div>

            {/* Items */}
            {items.map((item, index) => {
              const shortage = computeShortage(item);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_100px_120px_100px] gap-2 items-center"
                  style={{
                    backgroundColor: "var(--bg-off)",
                    borderRadius: "var(--card-radius)",
                    padding: "10px 12px",
                  }}
                >
                  {/* Item ID */}
                  <span
                    style={{ fontFamily: "monospace", color: "var(--text-muted)" }}
                    className="text-[12px]"
                  >
                    {item.itemId.slice(0, 8)}…
                  </span>

                  {/* Sent Qty */}
                  <span
                    style={{ color: "var(--text-primary)" }}
                    className="text-[13px] font-bold"
                  >
                    {formatQty(item.sentQty)}
                  </span>

                  {/* Received Qty input */}
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.receivedQty}
                    onChange={(e) => updateReceivedQty(index, e.target.value)}
                    className="h-8 text-[13px]"
                  />

                  {/* Shortage */}
                  <span
                    style={{
                      color: shortage > 0 ? "var(--accent-color)" : "var(--green)",
                      fontWeight: 700,
                    }}
                    className="text-[13px]"
                  >
                    {shortage > 0 ? `-${formatQty(shortage)}` : "None"}
                  </span>
                </div>
              );
            })}

            {/* Total shortage summary */}
            {totalShortage > 0 && (
              <div
                style={{
                  backgroundColor: "var(--orange-bg)",
                  border: "1px solid var(--accent-color)",
                  borderRadius: "var(--card-radius)",
                }}
                className="px-4 py-3 flex items-center justify-between"
              >
                <span style={{ color: "var(--accent-color)" }} className="text-[13px] font-bold">
                  Total shortage across all items
                </span>
                <span style={{ color: "var(--accent-color)" }} className="text-[15px] font-bold">
                  {formatQty(totalShortage)}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || items.length === 0}
          >
            <PackageCheck className="size-4" />
            {submitting ? "Confirming…" : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
