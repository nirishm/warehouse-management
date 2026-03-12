"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function ShortcutsProvider() {
  // Global-level shortcuts (no onNew/onSave — those are page-specific)
  useKeyboardShortcuts();
  return null;
}
