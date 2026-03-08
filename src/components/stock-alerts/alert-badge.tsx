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
    classes: 'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(220,38,38,0.2)]',
  },
  WARNING: {
    label: 'Warning',
    classes: 'bg-[var(--orange-bg)] text-[var(--accent-color)] border border-[rgba(244,95,0,0.2)]',
  },
  OK: {
    label: 'OK',
    classes: 'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(22,163,74,0.2)]',
  },
};

export function AlertBadge({ state, className }: AlertBadgeProps) {
  const { label, classes } = CONFIG[state];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium',
        classes,
        className
      )}
    >
      {label}
    </span>
  );
}
