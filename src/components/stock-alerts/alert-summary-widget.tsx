import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AlertSummary } from '@/modules/stock-alerts/validations/threshold';

interface AlertSummaryWidgetProps {
  summary: AlertSummary;
  tenantSlug: string;
}

export function AlertSummaryWidget({ summary, tenantSlug }: AlertSummaryWidgetProps) {
  if (summary.total === 0) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-mono text-red-400 font-medium">
                {summary.critical} Critical
              </span>
            </div>
          )}
          {summary.warning > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-mono text-yellow-400 font-medium">
                {summary.warning} Warning
              </span>
            </div>
          )}
          {summary.ok > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-mono text-green-400 font-medium">
                {summary.ok} OK
              </span>
            </div>
          )}
          <Link
            href={`/t/${tenantSlug}/stock-alerts`}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View all →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
