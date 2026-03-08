import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listPayments } from '@/modules/payments/queries/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PaymentsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const payments = await listPayments(tenant.schema_name);

  const totalRecorded = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">Payments</h1>
        <div className="text-right">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Total Recorded</p>
          <p className="text-lg font-bold text-zinc-100 font-mono">
            ₹{totalRecorded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            All Payments ({payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-sm font-mono">No payments recorded yet.</p>
              <p className="text-xs mt-1">Record payments from purchase or sale detail pages.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                    Payment #
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Method
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Reference
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className="border-zinc-800/60 hover:bg-zinc-800/30">
                    <TableCell className="pl-6 font-mono text-amber-500 text-xs">
                      {p.payment_number}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/t/${tenantSlug}/${p.transaction_type}s/${p.transaction_id}`}
                        className="text-xs text-zinc-300 hover:text-amber-400 capitalize"
                      >
                        {p.transaction_type}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 capitalize">
                      {p.payment_method.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {p.reference_number ?? '--'}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono text-zinc-200 font-semibold text-sm">
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
