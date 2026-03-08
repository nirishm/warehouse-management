import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listPurchases } from '@/modules/purchase/queries/purchases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Purchase, PurchaseStatus } from '@/modules/purchase/validations/purchase';
import { RealtimeListener } from '@/components/realtime/realtime-listener';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const statusColors: Record<PurchaseStatus, string> = {
  draft: 'bg-muted text-muted-foreground border border-border',
  ordered: 'bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent)]/20',
  received: 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeTotal(purchase: Purchase): number {
  const items = (purchase.items ?? []) as Array<{
    id: string;
    quantity?: number;
    unit_price?: number | null;
  }>;
  return items.reduce((sum, item) => {
    const qty = item.quantity ?? 0;
    const price = item.unit_price ?? 0;
    return sum + qty * price;
  }, 0);
}

export default async function PurchasesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const purchases = await listPurchases(tenant.schema_name);

  const totalReceived = purchases.filter((p) => p.status === 'received').length;
  const totalOrdered = purchases.filter((p) => p.status === 'ordered').length;

  return (
    <div className="space-y-6">
      <RealtimeListener table="purchases" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            Purchases
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record incoming goods from suppliers
          </p>
        </div>
        <Link href={`/t/${tenantSlug}/purchases/new`}>
          <Button className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-medium">
            New Purchase
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Purchases', value: purchases.length },
          { label: 'Received', value: totalReceived },
          { label: 'Ordered', value: totalOrdered },
        ].map((stat) => (
          <Card key={stat.label} className="border-border bg-[var(--bg-off)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground font-mono">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Purchases ({purchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No purchases found</p>
              <p className="text-xs mt-1">
                Create your first purchase to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-6">
                    Purchase #
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right">
                    Items
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-right pr-6">
                    Total Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => {
                  const itemCount = (purchase.items ?? []).length;
                  const total = computeTotal(purchase);
                  return (
                    <TableRow
                      key={purchase.id}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell className="pl-6">
                        <Link
                          href={`/t/${tenantSlug}/purchases/${purchase.id}`}
                          className="font-mono text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 font-medium"
                        >
                          {purchase.purchase_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {purchase.location ? (
                          <>
                            <span className="font-mono text-[var(--accent)] text-xs mr-2">
                              {purchase.location.code}
                            </span>
                            {purchase.location.name}
                          </>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[purchase.status as PurchaseStatus] ?? statusColors.draft}
                        >
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {formatDate(purchase.received_at ?? purchase.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-body)] font-mono text-right">
                        {itemCount}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-body)] font-mono text-right pr-6">
                        {total > 0
                          ? total.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '--'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
