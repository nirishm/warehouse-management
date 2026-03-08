'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RecordPaymentDialog } from './record-payment-dialog';
import type { Payment, TransactionBalance } from '@/modules/payments/validations/payment';

interface Props {
  tenantSlug: string;
  transactionType: 'purchase' | 'sale';
  transactionId: string;
  canManage: boolean;
}

export function PaymentPanel({ tenantSlug, transactionType, transactionId, canManage }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<TransactionBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = `/api/t/${tenantSlug}/${transactionType}s/${transactionId}/payments`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data ?? []);
        setBalance(json.balance ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, transactionType, transactionId]);

  useEffect(() => { load(); }, [load]);

  const outstandingColor = balance
    ? balance.outstanding <= 0
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    : '';

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Payments
        </CardTitle>
        <div className="flex items-center gap-3">
          {balance && (
            <Badge className={outstandingColor}>
              {balance.outstanding <= 0
                ? 'Fully Paid'
                : `Outstanding: ₹${balance.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </Badge>
          )}
          {canManage && (
            <RecordPaymentDialog
              tenantSlug={tenantSlug}
              transactionType={transactionType}
              transactionId={transactionId}
              onSuccess={load}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-zinc-500 font-mono">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono">No payments recorded.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-2 border-b border-zinc-800/60 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-amber-500 text-xs">{p.payment_number}</span>
                  <span className="text-zinc-400 text-xs capitalize">
                    {p.payment_method.replace('_', ' ')}
                  </span>
                  {p.reference_number && (
                    <span className="text-zinc-600 text-xs">Ref: {p.reference_number}</span>
                  )}
                </div>
                <span className="font-mono text-zinc-200 font-semibold">
                  ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            {balance && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Total Paid</span>
                <span className="font-mono text-zinc-200 font-bold">
                  ₹{balance.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
