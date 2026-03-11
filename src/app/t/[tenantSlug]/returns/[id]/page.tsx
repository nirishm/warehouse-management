import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getReturn } from '@/modules/returns/queries/returns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ReturnStatus } from '@/modules/returns/validations/return';
import { ConfirmReturnButton } from './confirm-return-button';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

const statusColors: Record<ReturnStatus, string> = {
  draft: 'bg-[var(--bg-off)] text-[var(--text-muted)] border border-[var(--border)]',
  confirmed: 'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(22,163,74,0.2)]',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(220,38,38,0.2)]',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ReturnDetailPage({ params }: Props) {
  const { tenantSlug, id } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'returns', permission: 'canManageReturns' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('returns')) redirect(`/t/${tenantSlug}`);

  const ret = await getReturn(tenant.schema_name, id);

  if (!ret) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-dim)]">
        <p className="text-sm font-mono">Return not found</p>
        <Link
          href={`/t/${tenantSlug}/returns`}
          className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] text-xs mt-2 font-mono underline underline-offset-2"
        >
          Back to returns
        </Link>
      </div>
    );
  }

  const typeLabel = ret.return_type === 'purchase_return' ? 'Purchase Return' : 'Sale Return';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
              {ret.return_number}
            </h1>
            <Badge className={statusColors[ret.status]}>{ret.status}</Badge>
          </div>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            {typeLabel} · {formatDate(ret.return_date)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {ret.status === 'draft' && (
            <ConfirmReturnButton tenantSlug={tenantSlug} returnId={id} />
          )}
          <Link
            href={`/t/${tenantSlug}/returns`}
            className="text-xs font-mono text-[var(--accent-color)] hover:text-[var(--accent-dark)] underline underline-offset-2"
          >
            Back to returns
          </Link>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[var(--bg-base)] border-[var(--border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Return Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Type">{typeLabel}</DetailRow>
            <DetailRow label="Location">{ret.location?.name ?? '--'}</DetailRow>
            <DetailRow label="Contact">{ret.contact?.name ?? '--'}</DetailRow>
            <DetailRow label="Reason">{ret.reason || '--'}</DetailRow>
            <DetailRow label="Notes">{ret.notes || '--'}</DetailRow>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--bg-base)] border-[var(--border)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Items ({ret.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border)] hover:bg-transparent">
                <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] pl-6">
                  Item
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                  Unit
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] text-right pr-6">
                  Quantity
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ret.items.map((item) => (
                <TableRow key={item.id} className="border-[var(--border)] hover:bg-[var(--bg-off)]">
                  <TableCell className="pl-6 text-sm text-[var(--text-body)]">
                    {item.commodity ? (
                      <>
                        <span className="font-mono text-[var(--accent-color)] text-xs mr-2">
                          {item.commodity.code}
                        </span>
                        {item.commodity.name}
                      </>
                    ) : '--'}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                    {item.unit?.abbreviation ?? item.unit?.name ?? '--'}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-body)] font-mono text-right pr-6">
                    {item.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-[var(--text-body)]">{children}</span>
    </div>
  );
}
