import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { listSales } from '@/modules/sale/queries/sales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RealtimeListener } from '@/components/realtime/realtime-listener';
import { SalesTable } from './sales-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SalesPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'sale', permission: 'canSale' });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const sales = await listSales(tenant.schema_name);

  const totalConfirmed = sales.filter((s) => s.status === 'confirmed').length;
  const totalDispatched = sales.filter((s) => s.status === 'dispatched').length;

  return (
    <div className="space-y-6">
      <RealtimeListener table="sales" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            Sales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record outgoing goods to customers
          </p>
        </div>
        <Link prefetch={false} href={`/t/${tenantSlug}/sales/new`}>
          <Button variant="orange">
            New Sale
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Sales', value: sales.length },
          { label: 'Confirmed', value: totalConfirmed },
          { label: 'Dispatched', value: totalDispatched },
        ].map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
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

      <Card className="border-border bg-card">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Sales ({sales.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No sales found</p>
              <p className="text-xs mt-1">
                Create your first sale to get started
              </p>
            </div>
          ) : (
            <SalesTable data={sales} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
