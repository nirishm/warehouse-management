import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listSales } from '@/modules/sale/queries/sales';
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
import type { Sale, SaleStatus } from '@/modules/sale/validations/sale';
import { RealtimeListener } from '@/components/realtime/realtime-listener';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const statusColors: Record<SaleStatus, string> = {
  draft: 'bg-muted/50 text-[var(--text-muted)] border border-border',
  confirmed: 'bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent)]/20',
  dispatched: 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
  cancelled: 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeTotal(sale: Sale): number {
  const items = (sale.items ?? []) as Array<{
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

export default async function SalesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const sales = await listSales(tenant.schema_name);

  const totalConfirmed = sales.filter((s) => s.status === 'confirmed').length;
  const totalDispatched = sales.filter((s) => s.status === 'dispatched').length;

  return (
    <div className="space-y-6">
      <RealtimeListener table="sales" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Sales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record outgoing goods to customers
          </p>
        </div>
        <Link href={`/t/${tenantSlug}/sales/new`}>
          <Button className="bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-medium">
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
        <CardHeader className="pb-3">
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
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-6">
                    Sale #
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
                {sales.map((sale) => {
                  const itemCount = (sale.items ?? []).length;
                  const total = computeTotal(sale);
                  return (
                    <TableRow
                      key={sale.id}
                      className="border-border hover:bg-muted"
                    >
                      <TableCell className="pl-6">
                        <Link
                          href={`/t/${tenantSlug}/sales/${sale.id}`}
                          className="font-mono text-sm text-[var(--accent)] hover:text-[var(--accent)] font-medium"
                        >
                          {sale.sale_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {sale.location ? (
                          <>
                            <span className="font-mono text-[var(--accent)] text-xs mr-2">
                              {sale.location.code}
                            </span>
                            {sale.location.name}
                          </>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[sale.status as SaleStatus] ?? statusColors.draft}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-muted)] font-mono">
                        {formatDate(sale.sold_at ?? sale.created_at)}
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
