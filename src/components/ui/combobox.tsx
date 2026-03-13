"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  secondary?: string; // shown dimmer below label
  group?: string; // group header label (e.g. "Recently used")
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  onSearchChange?: (query: string) => void; // fires on CommandInput change
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  loading = false,
  onSearchChange,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  // Group options by their `group` field
  const groups: Record<string, ComboboxOption[]> = {};
  const ungrouped: ComboboxOption[] = [];
  for (const opt of options) {
    if (opt.group) {
      (groups[opt.group] ??= []).push(opt);
    } else {
      ungrouped.push(opt);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between gap-2",
            "h-[var(--input-h)] rounded-[4px] border border-[var(--border)]",
            "bg-[var(--bg-base)] px-3 text-left text-sm",
            "text-[var(--text-primary)] outline-none",
            "hover:border-[var(--border-mid)] focus:border-[var(--accent-color)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !value && "text-[var(--text-muted)]",
            className
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronsUpDown
            className="shrink-0 opacity-50"
            style={{ width: 14, height: 14 }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{
          width: "var(--radix-popover-trigger-width)",
          minWidth: 220,
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bg-base)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
        align="start"
      >
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={onSearchChange}
            style={{
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
            }}
          />
          <CommandList style={{ maxHeight: 280 }}>
            {loading && (
              <div
                className="py-3 text-center text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Searching…
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty
                style={{ color: "var(--text-muted)", fontSize: 13 }}
              >
                {emptyText}
              </CommandEmpty>
            )}

            {/* Grouped options */}
            {Object.entries(groups).map(([groupName, groupOpts]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {groupOpts.map((opt) => (
                  <ComboboxItem
                    key={opt.value}
                    opt={opt}
                    selected={opt.value === value}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            ))}

            {/* Ungrouped options */}
            {ungrouped.length > 0 && (
              <CommandGroup>
                {ungrouped.map((opt) => (
                  <ComboboxItem
                    key={opt.value}
                    opt={opt}
                    selected={opt.value === value}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ComboboxItem({
  opt,
  selected,
  onSelect,
}: {
  opt: ComboboxOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={opt.value}
      onSelect={onSelect}
      style={{ cursor: "pointer", fontSize: 13 }}
    >
      <div className="flex flex-1 flex-col min-w-0">
        <span className="truncate" style={{ fontWeight: selected ? 700 : 400 }}>
          {opt.label}
        </span>
        {opt.secondary && (
          <span
            className="truncate text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {opt.secondary}
          </span>
        )}
      </div>
      {selected && (
        <Check
          className="ml-2 shrink-0"
          style={{ width: 14, height: 14, color: "var(--accent-color)" }}
        />
      )}
    </CommandItem>
  );
}
