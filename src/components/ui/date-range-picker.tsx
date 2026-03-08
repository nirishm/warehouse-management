'use client';

import * as React from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  dateFrom?: string;
  dateTo?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
  className?: string;
}

const presets = [
  { label: 'Today', getDates: () => ({ from: new Date(), to: new Date() }) },
  { label: '7 days', getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: '30 days', getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'This month', getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
];

export function DateRangePicker({ dateFrom, dateTo, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected: DateRange | undefined =
    dateFrom && dateTo
      ? { from: new Date(dateFrom), to: new Date(dateTo) }
      : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange(format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'));
    } else if (range?.from) {
      onChange(format(range.from, 'yyyy-MM-dd'), undefined);
    }
  };

  const handlePreset = (preset: (typeof presets)[number]) => {
    const { from, to } = preset.getDates();
    onChange(format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined, undefined);
    setOpen(false);
  };

  const displayText =
    dateFrom && dateTo
      ? `${format(new Date(dateFrom), 'MMM d')} – ${format(new Date(dateTo), 'MMM d, yyyy')}`
      : 'All time';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border bg-[var(--bg-base)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] transition-colors hover:border-[var(--accent-color)]',
          open && 'border-[var(--accent-color)]',
          className
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 text-[var(--text-dim)]" />
        <span>{displayText}</span>
        <ChevronDown className="h-3 w-3 text-[var(--text-dim)]" />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex items-center gap-1 border-b border-border px-3 py-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-off)] hover:text-[var(--text-primary)]"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="p-2">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={2}
            defaultMonth={dateFrom ? new Date(dateFrom) : subDays(new Date(), 30)}
          />
        </div>

        {(dateFrom || dateTo) && (
          <div className="border-t border-border px-3 py-2">
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-color)]"
            >
              <X className="h-3 w-3" />
              Clear dates
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
