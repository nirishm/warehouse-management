import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { getStockAlerts } from '@/modules/stock-alerts/queries/alerts';
import { AlertBadge } from '@/components/stock-alerts/alert-badge';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function StockAlertsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('stock-alerts')) redirect(`/t/${tenantSlug}`);

  const alerts = await getStockAlerts(tenant.schema_name);

  const critical = alerts.filter((a) => a.alert_state === 'CRITICAL');
  const warning = alerts.filter((a) => a.alert_state === 'WARNING');
  const ok = alerts.filter((a) => a.alert_state === 'OK');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Stock Alerts</h1>
          <p className="text-sm text-zinc-500 mt-1">
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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: critical.length, color: 'text-red-400' },
          { label: 'Warning', count: warning.length, color: 'text-yellow-400' },
          { label: 'OK', count: ok.length, color: 'text-green-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="border border-zinc-800 rounded-lg bg-zinc-900/60 p-4 text-center"
          >
            <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.count}</p>
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
          No thresholds configured.{' '}
          <Link href={`/t/${tenantSlug}/stock-alerts/thresholds`} className="text-zinc-300 underline">
            Add thresholds
          </Link>{' '}
          to start monitoring stock levels.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="text-left px-4 py-3 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                  Commodity
                </th>
                <th className="text-left px-4 py-3 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                  Location
                </th>
                <th className="text-right px-4 py-3 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                  Current
                </th>
                <th className="text-right px-4 py-3 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                  Reorder
                </th>
                <th className="text-right px-4 py-3 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                  Min
                </th>
                <th className="text-right px-4 py-3 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[...critical, ...warning, ...ok].map((alert) => (
                <tr key={alert.threshold_id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-zinc-100 font-medium">{alert.commodity_name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{alert.commodity_code}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{alert.location_name}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-100">
                    {alert.current_stock} {alert.unit_abbreviation}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {alert.reorder_point}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {alert.min_stock}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AlertBadge state={alert.alert_state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
