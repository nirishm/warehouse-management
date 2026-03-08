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
    <Card className="bg-[var(--bg-base)] border-[var(--border)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
              <span className="text-sm font-mono text-[var(--red)] font-medium">
                {summary.critical} Critical
              </span>
            </div>
          )}
          {summary.warning > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-color)]" />
              <span className="text-sm font-mono text-[var(--accent-color)] font-medium">
                {summary.warning} Warning
              </span>
            </div>
          )}
          {summary.ok > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
              <span className="text-sm font-mono text-[var(--green)] font-medium">
                {summary.ok} OK
              </span>
            </div>
          )}
          <Link
            href={`/t/${tenantSlug}/stock-alerts`}
            className="ml-auto text-xs text-[var(--text-dim)] hover:text-[var(--text-body)] transition-colors"
          >
            View all →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
