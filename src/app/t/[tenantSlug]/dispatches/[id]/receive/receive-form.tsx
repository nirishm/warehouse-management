'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Truck,
  Package,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface DispatchInfo {
  id: string;
  dispatch_number: string;
  status: string;
  origin_name: string;
  dest_name: string;
  dispatched_at: string | null;
  transporter_name: string | null;
  vehicle_number: string | null;
}

interface FormItem {
  id: string;
  commodity_name: string;
  commodity_code: string;
  unit_name: string;
  unit_abbreviation: string;
  sent_quantity: number;
  sent_bags: number | null;
}

interface ItemState {
  received_quantity: string;
  received_bags: string;
}

interface Props {
  dispatch: DispatchInfo;
  items: FormItem[];
  tenantSlug: string;
}

function getShortageColor(shortagePercent: number): string {
  if (shortagePercent === 0) return 'text-[var(--green)]';
  if (shortagePercent > 0 && shortagePercent <= 2) return 'text-[var(--accent-color)]';
  return 'text-[var(--red)]';
}

function getShortageBgColor(shortagePercent: number): string {
  if (shortagePercent === 0) return 'bg-[var(--green-bg)] border-[var(--green)]/20';
  if (shortagePercent > 0 && shortagePercent <= 2)
    return 'bg-[var(--accent-tint)] border-[var(--accent-color)]/20';
  return 'bg-[var(--red-bg)] border-[var(--red)]/20';
}

export function ReceiveForm({ dispatch, items, tenantSlug }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Initialize item states with sent_quantity as default
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() => {
    const initial: Record<string, ItemState> = {};
    for (const item of items) {
      initial[item.id] = {
        received_quantity: String(item.sent_quantity),
        received_bags: item.sent_bags !== null ? String(item.sent_bags) : '',
      };
    }
    return initial;
  });

  const updateItem = useCallback(
    (itemId: string, field: keyof ItemState, value: string) => {
      setItemStates((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], [field]: value },
      }));
    },
    []
  );

  const getReceivedQuantity = (itemId: string): number => {
    const val = parseFloat(itemStates[itemId]?.received_quantity ?? '0');
    return isNaN(val) ? 0 : val;
  };

  const getReceivedBags = (itemId: string): number | undefined => {
    const val = itemStates[itemId]?.received_bags;
    if (!val || val === '') return undefined;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  };

  const computeShortage = (sent: number, received: number) => {
    return sent - received;
  };

  const computeShortagePercent = (sent: number, received: number) => {
    if (sent === 0) return 0;
    return ((sent - received) / sent) * 100;
  };

  const hasAnyShortage = items.some((item) => {
    const received = getReceivedQuantity(item.id);
    return computeShortage(item.sent_quantity, received) > 0;
  });

  const hasValidationErrors = items.some((item) => {
    const val = parseFloat(itemStates[item.id]?.received_quantity ?? '');
    return isNaN(val) || val < 0;
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      items: items.map((item) => {
        const received_bags = getReceivedBags(item.id);
        return {
          id: item.id,
          received_quantity: getReceivedQuantity(item.id),
          ...(received_bags !== undefined ? { received_bags } : {}),
        };
      }),
    };

    try {
      const response = await fetch(
        `/api/t/${tenantSlug}/dispatches/${dispatch.id}/receive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to receive dispatch');
      }

      router.push(`/t/${tenantSlug}/dispatches/${dispatch.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = dispatch.dispatched_at
    ? new Date(dispatch.dispatched_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Dispatch Info Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Dispatch Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Dispatch #
              </Label>
              <p className="text-sm font-mono text-[var(--accent-color)] mt-1">
                {dispatch.dispatch_number}
              </p>
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Route
              </Label>
              <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-body)]">
                <span>{dispatch.origin_name}</span>
                <ArrowRight className="size-3 text-[var(--text-dim)]" />
                <span>{dispatch.dest_name}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Dispatched
              </Label>
              <p className="text-sm text-[var(--text-body)] mt-1">{formattedDate}</p>
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Transport
              </Label>
              <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-body)]">
                <Truck className="size-3 text-[var(--text-dim)]" />
                <span>
                  {dispatch.transporter_name || dispatch.vehicle_number || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Items to Receive
            </CardTitle>
            <Badge
              variant="outline"
              className="border-border text-[var(--text-muted)] font-mono text-xs"
            >
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-4">
                  Item
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Unit
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                  Sent Qty
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                  Sent Bags
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Received Qty
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Received Bags
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right pr-4">
                  Shortage
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const receivedQty = getReceivedQuantity(item.id);
                const shortage = computeShortage(item.sent_quantity, receivedQty);
                const shortagePercent = computeShortagePercent(
                  item.sent_quantity,
                  receivedQty
                );
                const shortageColor = getShortageColor(
                  shortagePercent > 0 ? shortagePercent : shortage < 0 ? -1 : 0
                );
                const shortageBg = getShortageBgColor(
                  shortagePercent > 0 ? shortagePercent : shortage < 0 ? -1 : 0
                );

                return (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="pl-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.commodity_name}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {item.commodity_code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--text-muted)]">
                        {item.unit_abbreviation || item.unit_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-[var(--text-body)]">
                        {item.sent_quantity.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-[var(--text-muted)]">
                        {item.sent_bags !== null ? item.sent_bags : '--'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={itemStates[item.id]?.received_quantity ?? ''}
                        onChange={(e) =>
                          updateItem(item.id, 'received_quantity', e.target.value)
                        }
                        className="w-28 h-8 font-mono text-sm bg-muted border-border text-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                      />
                    </TableCell>
                    <TableCell>
                      {item.sent_bags !== null ? (
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={itemStates[item.id]?.received_bags ?? ''}
                          onChange={(e) =>
                            updateItem(item.id, 'received_bags', e.target.value)
                          }
                          className="w-24 h-8 font-mono text-sm bg-muted border-border text-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                        />
                      ) : (
                        <span className="text-sm text-[var(--text-dim)]">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${shortageBg}`}
                      >
                        <span className={`font-mono text-sm font-medium ${shortageColor}`}>
                          {shortage > 0 ? '+' : ''}
                          {shortage.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {item.sent_quantity > 0 && (
                          <span className={`font-mono text-xs ${shortageColor} opacity-70`}>
                            ({shortagePercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary and Submit */}
      {hasAnyShortage && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--accent-color)]/20 bg-[var(--accent-tint)] p-4">
          <AlertTriangle className="size-5 text-[var(--accent-color)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--accent-color)]">
              Shortage Detected
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              One or more items have received quantities less than sent quantities.
              This will be recorded in the shortage tracking system.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] p-4">
          <AlertTriangle className="size-5 text-[var(--red)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--red)]">Error</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-border text-[var(--text-body)] hover:bg-muted"
        >
          Cancel
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger
            render={
              <Button
                size="lg"
                disabled={hasValidationErrors || submitting}
                className="bg-[var(--accent-color)] text-white hover:bg-[var(--accent-dark)] font-semibold px-8"
              />
            }
          >
            <CheckCircle2 className="size-4 mr-2" />
            Confirm Receipt
          </DialogTrigger>
          <DialogContent className="bg-muted border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Confirm Dispatch Receipt
              </DialogTitle>
              <DialogDescription className="text-[var(--text-muted)]">
                You are about to mark dispatch{' '}
                <span className="font-mono text-[var(--accent-color)]">
                  {dispatch.dispatch_number}
                </span>{' '}
                as received. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-mono text-[var(--text-body)]">{items.length}</span>
              </div>
              {items.map((item) => {
                const receivedQty = getReceivedQuantity(item.id);
                const shortage = computeShortage(item.sent_quantity, receivedQty);
                const shortagePercent = computeShortagePercent(
                  item.sent_quantity,
                  receivedQty
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm border-t border-border pt-2"
                  >
                    <span className="text-[var(--text-muted)]">
                      <Package className="size-3 inline mr-1.5" />
                      {item.commodity_name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[var(--text-body)]">
                        {receivedQty.toLocaleString()}{' '}
                        <span className="text-[var(--text-dim)]">
                          / {item.sent_quantity.toLocaleString()}
                        </span>
                      </span>
                      {shortage > 0 && (
                        <span
                          className={`font-mono text-xs ${getShortageColor(shortagePercent)}`}
                        >
                          -{shortage.toLocaleString()} ({shortagePercent.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2">
              <DialogClose
                render={
                  <Button
                    variant="outline"
                    className="border-border text-[var(--text-body)]"
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[var(--accent-color)] text-white hover:bg-[var(--accent-dark)] font-semibold"
              >
                {submitting ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
