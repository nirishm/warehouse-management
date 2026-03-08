import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSaleById } from '@/modules/sale/queries/sales';
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
import type { SaleStatus } from '@/modules/sale/validations/sale';
import { PaymentPanel } from '@/components/payments/payment-panel';
import { DownloadDocumentButton } from '@/components/document-gen/download-document-button';
import { createTenantClient } from '@/core/db/tenant-query';
import type { Permission } from '@/core/auth/types';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

const statusColors: Record<SaleStatus, string> = {
  draft: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
  confirmed: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  dispatched: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function SaleDetailPage({ params }: Props) {
  const { tenantSlug, id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const { data: { user } } = await supabase.auth.getUser();
  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: profile } = user
    ? await tenantClient.from('user_profiles').select('permissions').eq('user_id', user.id).single()
    : { data: null };
  const permissions = (profile?.permissions ?? {}) as Record<Permission, boolean>;

  const paymentsModuleEnabled = (tenant.enabled_modules ?? []).includes('payments');
  const canManagePayments = permissions.canManagePayments ?? false;
  const docGenEnabled = (tenant.enabled_modules ?? []).includes('document-gen');

  const sale = await getSaleById(tenant.schema_name, id);

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <p className="text-sm font-mono">Sale not found</p>
        <Link
          href={`/t/${tenantSlug}/sales`}
          className="text-amber-500 hover:text-amber-400 text-xs mt-2 font-mono underline underline-offset-2"
        >
          Back to sales
        </Link>
      </div>
    );
  }

  const items = sale.items ?? [];
  const totalValue = items.reduce((sum, item) => {
    return sum + (item.quantity ?? 0) * (item.unit_price ?? 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">
              {sale.sale_number}
            </h1>
            <Badge
              className={statusColors[sale.status as SaleStatus] ?? statusColors.draft}
            >
              {sale.status}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {formatDate(sale.sold_at ?? sale.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {docGenEnabled && (
            <DownloadDocumentButton
              href={`/api/t/${tenantSlug}/documents/delivery-note/${id}`}
              label="Download Delivery Note"
            />
          )}
          <Link
            href={`/t/${tenantSlug}/sales`}
            className="text-xs font-mono text-amber-500 hover:text-amber-400 underline underline-offset-2"
          >
            Back to sales
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Sale Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Location">
              {sale.location ? (
                <>
                  <span className="font-mono text-amber-500 text-xs mr-2">
                    {sale.location.code}
                  </span>
                  {sale.location.name}
                </>
              ) : (
                '--'
              )}
            </DetailRow>
            <DetailRow label="Contact">
              {sale.contact?.name ?? '--'}
            </DetailRow>
            <DetailRow label="Notes">
              {sale.notes || '--'}
            </DetailRow>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Transport Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Transporter">
              {sale.transporter_name || '--'}
            </DetailRow>
            <DetailRow label="Vehicle #">
              {sale.vehicle_number || '--'}
            </DetailRow>
            <DetailRow label="Driver">
              {sale.driver_name || '--'}
            </DetailRow>
            <DetailRow label="Driver Phone">
              {sale.driver_phone || '--'}
            </DetailRow>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Items ({items.length})
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
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
                  Quantity
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
                  Bags
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right">
                  Unit Price
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const lineTotal = (item.quantity ?? 0) * (item.unit_price ?? 0);
                return (
                  <TableRow
                    key={item.id}
                    className="border-zinc-800/60 hover:bg-zinc-800/30"
                  >
                    <TableCell className="pl-6 text-sm text-zinc-200">
                      {item.commodity ? (
                        <>
                          <span className="font-mono text-amber-500 text-xs mr-2">
                            {item.commodity.code}
                          </span>
                          {item.commodity.name}
                        </>
                      ) : (
                        '--'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400 font-mono">
                      {item.unit?.abbreviation ?? item.unit?.name ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-200 font-mono text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400 font-mono text-right">
                      {item.bags ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400 font-mono text-right">
                      {item.unit_price != null
                        ? item.unit_price.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })
                        : '--'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-200 font-mono text-right pr-6">
                      {lineTotal > 0
                        ? lineTotal.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })
                        : '--'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {totalValue > 0 && (
            <div className="flex justify-end px-6 py-3 border-t border-zinc-800">
              <div className="text-right">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 mr-4">
                  Total
                </span>
                <span className="text-lg font-bold text-zinc-100 font-mono">
                  {totalValue.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments panel — shown when payments module is enabled */}
      {paymentsModuleEnabled && (
        <PaymentPanel
          tenantSlug={tenantSlug}
          transactionType="sale"
          transactionId={id}
          canManage={canManagePayments}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-zinc-200">{children}</span>
    </div>
  );
}
