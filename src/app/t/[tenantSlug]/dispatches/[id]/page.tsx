import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { DownloadDocumentButton } from '@/components/document-gen/download-document-button';
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
import { ArrowLeft } from 'lucide-react';
import type {
  DispatchWithLocations,
  DispatchItemWithNames,
} from '@/modules/dispatch/validations/dispatch';
import { RealtimeListener } from '@/components/realtime/realtime-listener';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted/50 text-[var(--text-muted)] border-border',
  dispatched: 'bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent)]/20',
  in_transit: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue)]/20',
  received: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/20',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function DispatchDetailPage({ params }: Props) {
  const { tenantSlug, id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const docGenEnabled = tenant.enabled_modules?.includes('document-gen') ?? false;
  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: dispatch, error } = await tenantClient
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(*, commodity:commodities(name, code), unit:units(name, abbreviation))'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !dispatch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm font-mono">Dispatch not found</p>
        <Link href={`/t/${tenantSlug}/dispatches`}>
          <Button variant="outline" className="mt-4 border-border text-[var(--text-body)]">
            Back to Dispatches
          </Button>
        </Link>
      </div>
    );
  }

  const d = dispatch as unknown as DispatchWithLocations & {
    dispatch_items: DispatchItemWithNames[];
  };
  const items = d.dispatch_items ?? [];

  const details = [
    { label: 'Dispatch Number', value: d.dispatch_number },
    { label: 'Origin', value: d.origin_location?.name ?? 'Unknown' },
    { label: 'Destination', value: d.dest_location?.name ?? 'Unknown' },
    { label: 'Dispatched At', value: formatDateTime(d.dispatched_at) },
    { label: 'Received At', value: formatDateTime(d.received_at) },
    { label: 'Transporter', value: d.transporter_name ?? '--' },
    { label: 'Vehicle', value: d.vehicle_number ?? '--' },
    { label: 'Driver', value: d.driver_name ?? '--' },
    { label: 'Driver Phone', value: d.driver_phone ?? '--' },
  ];

  return (
    <div className="space-y-6">
      <RealtimeListener table="dispatches" />
      <RealtimeListener table="dispatch_items" />
      <div className="flex items-center gap-4">
        <Link href={`/t/${tenantSlug}/dispatches`}>
          <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-mono">
              {d.dispatch_number}
            </h1>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${statusColors[d.status] ?? 'bg-muted/50 text-[var(--text-muted)] border-border'}`}
            >
              {statusLabels[d.status] ?? d.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {d.origin_location?.name ?? 'Unknown'} &rarr;{' '}
            {d.dest_location?.name ?? 'Unknown'}
          </p>
        </div>
        {docGenEnabled && (
          <DownloadDocumentButton
            href={`/api/t/${tenantSlug}/documents/dispatch-challan/${id}`}
            label="Download Challan"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Dispatch Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {details.map((item) => (
              <div key={item.label} className="flex justify-between items-baseline">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-sm text-foreground">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-body)] whitespace-pre-wrap">
              {d.notes ?? 'No notes'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm font-mono">No items in this dispatch</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-6">
                    Commodity
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Unit
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Sent Qty
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Sent Bags
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Received Qty
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Received Bags
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right pr-6">
                    Shortage
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-border hover:bg-muted"
                  >
                    <TableCell className="pl-6">
                      <div>
                        <span className="text-sm text-foreground">
                          {item.commodity?.name ?? 'Unknown'}
                        </span>
                        {item.commodity?.code && (
                          <span className="ml-2 text-xs font-mono text-muted-foreground">
                            {item.commodity.code}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {item.unit?.abbreviation ?? item.unit?.name ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-mono text-right">
                      {item.sent_quantity}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono text-right">
                      {item.sent_bags ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-mono text-right">
                      {item.received_quantity ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono text-right">
                      {item.received_bags ?? '--'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {item.shortage != null && item.shortage > 0 ? (
                        <span className="text-sm font-mono text-[var(--red)]">
                          -{item.shortage}
                          {item.shortage_percent != null && (
                            <span className="text-xs text-[var(--red)] ml-1">
                              ({item.shortage_percent.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm font-mono text-muted-foreground">--</span>
                      )}
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
