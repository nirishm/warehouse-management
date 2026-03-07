import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { DispatchWithLocations } from '@/modules/dispatch/validations/dispatch';
import { RealtimeListener } from '@/components/realtime/realtime-listener';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  dispatched: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_transit: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  received: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function DispatchesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: dispatches } = await tenantClient
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(id)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const items = ((dispatches ?? []) as Record<string, unknown>[]).map((row) => {
    const dispatchItems = row.dispatch_items as { id: string }[] | null;
    return {
      ...row,
      item_count: dispatchItems?.length ?? 0,
    } as DispatchWithLocations;
  });

  return (
    <div className="space-y-6">
      <RealtimeListener table="dispatches" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Dispatches
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track commodity dispatches between locations
          </p>
        </div>
        <Link href={`/t/${tenantSlug}/dispatches/new`}>
          <Button className="bg-amber-600 text-zinc-950 hover:bg-amber-500 font-medium">
            <Plus className="size-4 mr-1" />
            New Dispatch
          </Button>
        </Link>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            All Dispatches ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-sm font-mono">No dispatches found</p>
              <p className="text-xs mt-1">
                Create your first dispatch to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                    Dispatch #
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Origin &rarr; Destination
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                    Items
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((dispatch) => (
                  <TableRow
                    key={dispatch.id}
                    className="border-zinc-800/60 hover:bg-zinc-800/30"
                  >
                    <TableCell className="pl-6">
                      <Link
                        href={`/t/${tenantSlug}/dispatches/${dispatch.id}`}
                        className="font-mono text-sm text-amber-500 font-medium hover:text-amber-400 underline-offset-4 hover:underline"
                      >
                        {dispatch.dispatch_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-200">
                      <span className="text-zinc-300">
                        {dispatch.origin_location?.name ?? 'Unknown'}
                      </span>
                      <span className="text-zinc-600 mx-2">&rarr;</span>
                      <span className="text-zinc-300">
                        {dispatch.dest_location?.name ?? 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${statusColors[dispatch.status] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'}`}
                      >
                        {statusLabels[dispatch.status] ?? dispatch.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400 font-mono">
                      {formatDate(dispatch.dispatched_at ?? dispatch.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400 font-mono text-right pr-6">
                      {dispatch.item_count ?? 0}
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
