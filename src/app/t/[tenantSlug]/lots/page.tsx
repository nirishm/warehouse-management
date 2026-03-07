import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listLots } from '@/modules/lot-tracking/queries/lots';
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
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Lots</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Batch/lot inventory with FIFO tracking
        </p>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                Lot #
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Commodity
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Received
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Expiry
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
                Initial Qty
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
                Current Qty
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                Unit
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-zinc-500 text-sm font-mono">
                  No lots found
                </TableCell>
              </TableRow>
            ) : (
              lots.map((lot) => (
                <TableRow key={lot.id} className="border-zinc-800/60 hover:bg-zinc-800/30">
                  <TableCell className="pl-6">
                    <Link
                      href={`/t/${tenantSlug}/lots/${lot.id}`}
                      className="font-mono text-amber-500 hover:text-amber-400 text-sm"
                    >
                      {lot.lot_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-200">
                    {lot.commodity ? (
                      <>
                        <span className="font-mono text-xs text-zinc-500 mr-2">
                          {lot.commodity.code}
                        </span>
                        {lot.commodity.name}
                      </>
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400 font-mono">
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
                          ? 'text-red-400'
                          : new Date(lot.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          ? 'text-amber-400'
                          : 'text-zinc-400'
                      }>
                        {new Date(lot.expiry_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-zinc-600">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400 font-mono text-right">
                    {lot.initial_quantity}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-right">
                    <span className={lot.current_quantity <= 0 ? 'text-zinc-600' : 'text-zinc-200'}>
                      {lot.current_quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400 font-mono text-right pr-6">
                    {lot.unit?.abbreviation ?? lot.unit?.name ?? '--'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
