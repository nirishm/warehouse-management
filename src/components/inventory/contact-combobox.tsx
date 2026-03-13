"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  type?: string | null;
}

interface ContactComboboxProps {
  contacts: Contact[];
  value: string;
  onValueChange: (contactId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ContactCombobox({
  contacts,
  value,
  onValueChange,
  placeholder = "Select contact…",
  disabled,
  className,
}: ContactComboboxProps) {
  const options: ComboboxOption[] = contacts.map((c) => ({
    value: c.id,
    label: c.name,
    secondary: c.email ?? c.type ?? undefined,
  }));

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Type to filter contacts…"
      emptyText="No contacts found."
      disabled={disabled}
      className={className}
    />
  );
}
