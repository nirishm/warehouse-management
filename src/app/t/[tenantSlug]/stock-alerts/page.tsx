import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStockAlerts } from '@/modules/stock-alerts/queries/alerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { StockAlertsTable } from './stock-alerts-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function StockAlertsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'stock-alerts', permission: 'canManageAlerts' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);

  const alerts = await getStockAlerts(tenant.schema_name);

  const critical = alerts.filter((a) => a.alert_state === 'CRITICAL');
  const warning = alerts.filter((a) => a.alert_state === 'WARNING');
  const ok = alerts.filter((a) => a.alert_state === 'OK');

  // Sort: critical first, then warning, then ok
  const sortedAlerts = [...critical, ...warning, ...ok];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">Stock Alerts</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Real-time stock levels vs configured thresholds
          </p>
        </div>
        <Link href={`/t/${tenantSlug}/stock-alerts/thresholds`}>
          <Button variant="outline" size="sm">
            Configure Thresholds
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: critical.length, color: 'text-[var(--red)]' },
          { label: 'Warning', count: warning.length, color: 'text-[var(--accent-color)]' },
          { label: 'OK', count: ok.length, color: 'text-[var(--green)]' },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-[var(--bg-off)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No thresholds configured</p>
              <p className="text-xs mt-1">
                <Link href={`/t/${tenantSlug}/stock-alerts/thresholds`} className="text-[var(--text-body)] underline">
                  Add thresholds
                </Link>{' '}
                to start monitoring stock levels.
              </p>
            </div>
          ) : (
            <StockAlertsTable data={sortedAlerts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
