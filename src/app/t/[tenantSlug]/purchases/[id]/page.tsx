import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPurchaseById } from '@/modules/purchase/queries/purchases';
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
import type { PurchaseStatus } from '@/modules/purchase/validations/purchase';
import { PaymentPanel } from '@/components/payments/payment-panel';
import { DownloadDocumentButton } from '@/components/document-gen/download-document-button';
import { createTenantClient } from '@/core/db/tenant-query';
import type { Permission } from '@/core/auth/types';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

const statusColors: Record<PurchaseStatus, string> = {
  draft: 'bg-muted/50 text-[var(--text-muted)] border border-[var(--text-muted)]/20',
  ordered: 'bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent)]/20',
  received: 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20',
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

export default async function PurchaseDetailPage({ params }: Props) {
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
  const returnsModuleEnabled = (tenant.enabled_modules ?? []).includes('returns');

  const purchase = await getPurchaseById(tenant.schema_name, id);

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="text-sm font-mono">Purchase not found</p>
        <Link
          href={`/t/${tenantSlug}/purchases`}
          className="text-[var(--accent)] hover:text-[var(--accent-dark)] text-xs mt-2 font-mono underline underline-offset-2"
        >
          Back to purchases
        </Link>
      </div>
    );
  }

  const items = purchase.items ?? [];
  const totalValue = items.reduce((sum, item) => {
    return sum + (item.quantity ?? 0) * (item.unit_price ?? 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-mono">
              {purchase.purchase_number}
            </h1>
            <Badge
              className={statusColors[purchase.status as PurchaseStatus] ?? statusColors.draft}
            >
              {purchase.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(purchase.received_at ?? purchase.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {docGenEnabled && (
            <DownloadDocumentButton
              href={`/api/t/${tenantSlug}/documents/grn/${id}`}
              label="Download GRN"
            />
          )}
          {returnsModuleEnabled && (
            <Link
              href={`/t/${tenantSlug}/returns/new?from=purchase&id=${id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-off)] border border-border px-3 py-1.5 text-xs font-mono font-medium text-foreground hover:bg-muted transition-colors"
            >
              Create Return
            </Link>
          )}
          <Link
            href={`/t/${tenantSlug}/purchases`}
            className="text-xs font-mono text-[var(--accent)] hover:text-[var(--accent-dark)] underline underline-offset-2"
          >
            Back to purchases
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Purchase Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Location">
              {purchase.location ? (
                <>
                  <span className="font-mono text-[var(--accent)] text-xs mr-2">
                    {purchase.location.code}
                  </span>
                  {purchase.location.name}
                </>
              ) : (
                '--'
              )}
            </DetailRow>
            <DetailRow label="Contact">
              {purchase.contact?.name ?? '--'}
            </DetailRow>
            <DetailRow label="Notes">
              {purchase.notes || '--'}
            </DetailRow>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Transport Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Transporter">
              {purchase.transporter_name || '--'}
            </DetailRow>
            <DetailRow label="Vehicle #">
              {purchase.vehicle_number || '--'}
            </DetailRow>
            <DetailRow label="Driver">
              {purchase.driver_name || '--'}
            </DetailRow>
            <DetailRow label="Driver Phone">
              {purchase.driver_phone || '--'}
            </DetailRow>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                  Quantity
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                  Bags
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                  Unit Price
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right pr-6">
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
                    className="border-border hover:bg-muted"
                  >
                    <TableCell className="pl-6 text-sm text-foreground">
                      {item.commodity ? (
                        <>
                          <span className="font-mono text-[var(--accent)] text-xs mr-2">
                            {item.commodity.code}
                          </span>
                          {item.commodity.name}
                        </>
                      ) : (
                        '--'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                      {item.unit?.abbreviation ?? item.unit?.name ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-mono text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono text-right">
                      {item.bags ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] font-mono text-right">
                      {item.unit_price != null
                        ? item.unit_price.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })
                        : '--'}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-mono text-right pr-6">
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
            <div className="flex justify-end px-6 py-3 border-t border-border">
              <div className="text-right">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mr-4">
                  Total
                </span>
                <span className="text-lg font-bold text-foreground font-mono">
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
          transactionType="purchase"
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
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}
