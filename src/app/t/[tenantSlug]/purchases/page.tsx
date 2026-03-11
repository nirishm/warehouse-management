import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { listPurchases } from '@/modules/purchase/queries/purchases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RealtimeListener } from '@/components/realtime/realtime-listener';
import { PurchasesTable } from './purchases-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PurchasesPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'purchase', permission: 'canPurchase' });

  const tenant = await getTenantBySlug(tenantSlug);
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
        <Link prefetch={false} href={`/t/${tenantSlug}/purchases/new`}>
          <Button className="bg-[var(--accent-color)] hover:bg-[var(--accent-color)]/90 text-white font-medium">
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
        <CardHeader className="pb-0">
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
            <PurchasesTable data={purchases} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
