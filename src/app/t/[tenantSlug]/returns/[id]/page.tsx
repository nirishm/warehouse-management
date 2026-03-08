import { redirect } from 'next/navigation';
import Link from 'next/link';
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
  draft: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
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
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <p className="text-sm font-mono">Return not found</p>
        <Link
          href={`/t/${tenantSlug}/returns`}
          className="text-amber-500 hover:text-amber-400 text-xs mt-2 font-mono underline underline-offset-2"
        >
          Back to returns
        </Link>
      </div>
    );
  }

  const typeLabel = ret.return_type === 'purchase_return' ? 'Purchase Return' : 'Sale Return';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">
              {ret.return_number}
            </h1>
            <Badge className={statusColors[ret.status]}>{ret.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {typeLabel} · {formatDate(ret.return_date)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ret.status === 'draft' && (
            <ConfirmReturnButton tenantSlug={tenantSlug} returnId={id} />
          )}
          <Link
            href={`/t/${tenantSlug}/returns`}
            className="text-xs font-mono text-amber-500 hover:text-amber-400 underline underline-offset-2"
          >
            Back to returns
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
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

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Items ({ret.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                  Commodity
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Unit
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                  Quantity
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ret.items.map((item) => (
                <TableRow key={item.id} className="border-zinc-800/60 hover:bg-zinc-800/30">
                  <TableCell className="pl-6 text-sm text-zinc-200">
                    {item.commodity ? (
                      <>
                        <span className="font-mono text-amber-500 text-xs mr-2">
                          {item.commodity.code}
                        </span>
                        {item.commodity.name}
                      </>
                    ) : '--'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400 font-mono">
                    {item.unit?.abbreviation ?? item.unit?.name ?? '--'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-200 font-mono text-right pr-6">
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
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-zinc-200">{children}</span>
    </div>
  );
}
