"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

interface Location {
  id: string;
  name: string;
  code?: string | null;
  type?: string | null;
}

interface LocationComboboxProps {
  locations: Location[];
  value: string;
  onValueChange: (locationId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationCombobox({
  locations,
  value,
  onValueChange,
  placeholder = "Select location…",
  disabled,
  className,
}: LocationComboboxProps) {
  const options: ComboboxOption[] = locations.map((loc) => ({
    value: loc.id,
    label: loc.code ? `[${loc.code}] ${loc.name}` : loc.name,
    secondary: loc.type ?? undefined,
  }));

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Type to filter locations…"
      emptyText="No locations found."
      disabled={disabled}
      className={className}
      // No onSearchChange → cmdk's built-in client-side filter applies
    />
  );
}
