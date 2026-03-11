'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FormSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  defaultOpen = true,
  badge,
  children,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className="inline-flex items-center rounded-md bg-[var(--bg-off)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--text-dim)] transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
