import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { listPayments } from '@/modules/payments/queries/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentsTable } from './payments-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PaymentsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'payments', permission: 'canManagePayments' });
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const { data: payments, total } = await listPayments(tenant.schema_name);

  const totalRecorded = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">Payments</h1>
        <div className="text-right">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Total Recorded</p>
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono">
            {'\u20B9'}{totalRecorded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <Card className="bg-[var(--bg-base)] border-[var(--border)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            All Payments ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-dim)]">
              <p className="text-sm font-mono">No payments recorded yet.</p>
              <p className="text-xs mt-1">Record payments from purchase or sale detail pages.</p>
            </div>
          ) : (
            <PaymentsTable data={payments} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
