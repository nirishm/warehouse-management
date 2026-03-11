import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLot, getLotMovements } from '@/modules/lot-tracking/queries/lots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function LotDetailPage({ params }: Props) {
  const { tenantSlug, id } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'lot-tracking', permission: 'canManageLots' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('lot-tracking')) redirect(`/t/${tenantSlug}`);

  const [lot, movements] = await Promise.all([
    getLot(tenant.schema_name, id),
    getLotMovements(tenant.schema_name, id),
  ]);

  if (!lot) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-dim)]">
        <p className="text-sm font-mono">Lot not found</p>
        <Link
          href={`/t/${tenantSlug}/lots`}
          className="text-[var(--accent-color)] hover:text-[var(--accent-dark)] text-xs mt-2 font-mono underline underline-offset-2"
        >
          Back to lots
        </Link>
      </div>
    );
  }

  const consumedQty = lot.initial_quantity - lot.current_quantity;
  const consumedPct = lot.initial_quantity > 0 ? (consumedQty / lot.initial_quantity) * 100 : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {lot.lot_number}
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            {lot.commodity?.name ?? 'Unknown item'} ·{' '}
            Received {new Date(lot.received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <Link
          href={`/t/${tenantSlug}/lots`}
          className="text-xs font-mono text-[var(--accent-color)] hover:text-[var(--accent-dark)] underline underline-offset-2"
        >
          Back to lots
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[var(--bg-base)] border-[var(--border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Lot Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Item">
              {lot.commodity ? (
                <>
                  <span className="font-mono text-[var(--accent-color)] text-xs mr-2">{lot.commodity.code}</span>
                  {lot.commodity.name}
                </>
              ) : '--'}
            </DetailRow>
            <DetailRow label="Unit">
              {lot.unit?.abbreviation ?? lot.unit?.name ?? '--'}
            </DetailRow>
            <DetailRow label="Received">
              {formatDate(lot.received_date)}
            </DetailRow>
            <DetailRow label="Expiry">
              {lot.expiry_date ? (
                <span className={new Date(lot.expiry_date) < new Date() ? 'text-[var(--red)]' : 'text-[var(--text-body)]'}>
                  {formatDate(lot.expiry_date)}
                  {new Date(lot.expiry_date) < new Date() && ' (Expired)'}
                </span>
              ) : '--'}
            </DetailRow>
            <DetailRow label="Notes">{lot.notes || '--'}</DetailRow>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-base)] border-[var(--border)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Stock Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-md bg-[var(--bg-off)]">
                <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                  {lot.initial_quantity}
                </div>
                <div className="text-xs font-mono uppercase text-[var(--text-dim)] mt-1">Initial</div>
              </div>
              <div className="text-center p-3 rounded-md bg-[var(--bg-off)]">
                <div className={`text-2xl font-bold font-mono ${lot.current_quantity <= 0 ? 'text-[var(--text-dim)]' : 'text-[var(--green)]'}`}>
                  {lot.current_quantity}
                </div>
                <div className="text-xs font-mono uppercase text-[var(--text-dim)] mt-1">Remaining</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono text-[var(--text-dim)] mb-1">
                <span>Consumed</span>
                <span>{consumedPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[var(--bg-off)] rounded-full h-2">
                <div
                  className="bg-[var(--accent-color)] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(consumedPct, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--bg-base)] border-[var(--border)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Movement History ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-[var(--text-dim)] text-sm font-mono">
              No movements yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--border)] hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] pl-6">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                    Reference
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] text-right pr-6">
                    Quantity
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id} className="border-[var(--border)] hover:bg-[var(--bg-off)]">
                    <TableCell className="pl-6">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                        m.movement_type === 'dispatch'
                          ? 'bg-[var(--blue-bg)] text-[var(--blue)] border-[rgba(37,99,235,0.2)]'
                          : 'bg-[var(--green-bg)] text-[var(--green)] border-[rgba(22,163,74,0.2)]'
                      }`}>
                        {m.movement_type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[var(--accent-color)]">
                      {m.reference_number}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                      {formatDate(m.movement_date)}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-right pr-6 text-[var(--red)]">
                      -{m.quantity}
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
