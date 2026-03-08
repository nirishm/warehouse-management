'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  tenantSlug: string;
  transactionType: 'purchase' | 'sale';
  transactionId: string;
  onSuccess: () => void;
}

export function RecordPaymentDialog({ tenantSlug, transactionType, transactionId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = `/api/t/${tenantSlug}/${transactionType}s/${transactionId}/payments`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: method,
          reference_number: reference || null,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setAmount('');
        setReference('');
        setNotes('');
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold text-xs"
          />
        }
      >
        Record Payment
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 font-mono">Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v ?? 'cash')}>
              <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {(['cash', 'bank_transfer', 'cheque', 'upi', 'other'] as const).map((m) => (
                  <SelectItem key={m} value={m} className="text-zinc-200 focus:bg-zinc-800">
                    {m.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Reference #</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200"
              placeholder="Optional"
            />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200"
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !amount}
              className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold"
            >
              {saving ? 'Saving...' : 'Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
