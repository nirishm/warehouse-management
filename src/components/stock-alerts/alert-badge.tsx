'use client';

import { cn } from '@/lib/utils';
import type { AlertState } from '@/modules/stock-alerts/validations/threshold';

interface AlertBadgeProps {
  state: AlertState;
  className?: string;
}

const CONFIG: Record<AlertState, { label: string; classes: string }> = {
  CRITICAL: {
    label: 'Critical',
    classes: 'bg-red-500/20 text-red-400 border border-red-500/40',
  },
  WARNING: {
    label: 'Warning',
    classes: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  },
  OK: {
    label: 'OK',
    classes: 'bg-green-500/20 text-green-400 border border-green-500/40',
  },
};

export function AlertBadge({ state, className }: AlertBadgeProps) {
  const { label, classes } = CONFIG[state];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium',
        classes,
        className
      )}
    >
      {label}
    </span>
  );
}
