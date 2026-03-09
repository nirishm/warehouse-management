import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listLots } from '@/modules/lot-tracking/queries/lots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LotAgeBadge } from '@/components/lot-tracking/lot-age-badge';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LotsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'lot-tracking', permission: 'canManageLots' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('lot-tracking')) redirect(`/t/${tenantSlug}`);

  const lots = await listLots(tenant.schema_name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">Lots</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Batch/lot inventory with FIFO tracking
        </p>
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Lots ({lots.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No lots found</p>
              <p className="text-xs mt-1">Lots are created when receiving purchase orders</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-6">
                    Lot #
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Commodity
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Received
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Expiry
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Initial Qty
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Current Qty
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right pr-6">
                    Unit
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id} className="border-border hover:bg-muted/50">
                    <TableCell className="pl-6">
                      <Link
                        href={`/t/${tenantSlug}/lots/${lot.id}`}
                        className="font-mono text-[var(--accent-color)] hover:text-[var(--accent-color)]/80 text-sm font-medium"
                      >
                        {lot.lot_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-body)]">
                      {lot.commodity ? (
                        <>
                          <span className="font-mono text-xs text-[var(--text-dim)] mr-2">
                            {lot.commodity.code}
                          </span>
                          {lot.commodity.name}
                        </>
                      ) : (
                        '--'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                      {new Date(lot.received_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      <LotAgeBadge receivedDate={lot.received_date} className="ml-2" />
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {lot.expiry_date ? (
                        <span className={
                          new Date(lot.expiry_date) < new Date()
                            ? 'text-[var(--red)]'
                            : new Date(lot.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? 'text-[var(--accent-color)]'
                            : 'text-[var(--text-muted)]'
                        }>
                          {new Date(lot.expiry_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-[var(--text-dim)]">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono text-right">
                      {lot.initial_quantity}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-right">
                      <span className={lot.current_quantity <= 0 ? 'text-[var(--text-dim)]' : 'text-[var(--text-body)]'}>
                        {lot.current_quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono text-right pr-6">
                      {lot.unit?.abbreviation ?? lot.unit?.name ?? '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
