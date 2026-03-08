import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listReturns } from '@/modules/returns/queries/returns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ReturnStatus, ReturnType } from '@/modules/returns/validations/return';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const statusColors: Record<ReturnStatus, string> = {
  draft: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const typeLabels: Record<ReturnType, string> = {
  purchase_return: 'Purchase Return',
  sale_return: 'Sale Return',
};

export default async function ReturnsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('returns')) redirect(`/t/${tenantSlug}`);

  const returns = await listReturns(tenant.schema_name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Returns</h1>
          <p className="text-sm text-zinc-500 mt-1">Purchase and sale return management</p>
        </div>
        <Link
          href={`/t/${tenantSlug}/returns/new`}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors"
        >
          New Return
        </Link>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                Return #
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Type
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Location
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Contact
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Date
              </TableHead>
              <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pr-6">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-zinc-500 text-sm font-mono">
                  No returns found
                </TableCell>
              </TableRow>
            ) : (
              returns.map((ret) => (
                <TableRow key={ret.id} className="border-zinc-800/60 hover:bg-zinc-800/30">
                  <TableCell className="pl-6">
                    <Link
                      href={`/t/${tenantSlug}/returns/${ret.id}`}
                      className="font-mono text-amber-500 hover:text-amber-400 text-sm"
                    >
                      {ret.return_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400">
                    {typeLabels[ret.return_type]}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-300">
                    {ret.location?.name ?? '--'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400">
                    {ret.contact?.name ?? '--'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400 font-mono">
                    {new Date(ret.return_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="pr-6">
                    <Badge className={statusColors[ret.status]}>{ret.status}</Badge>
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
