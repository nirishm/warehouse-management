"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
  /** Called when "N" is pressed (create new entity) */
  onNew?: () => void;
  /** Called when "S" is pressed (save current form) — Cmd/Ctrl+S */
  onSave?: () => void;
}

export function useKeyboardShortcuts(config?: ShortcutConfig) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();

      // Don't fire shortcuts when typing in inputs, textareas, selects, or contenteditable
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      ) {
        // Exception: Escape should always work
        if (e.key !== "Escape") return;
      }

      // Escape — close any open dialog/modal/popover
      if (e.key === "Escape") {
        // Let the browser/radix handle it naturally — no custom handling needed
        // Dialogs from shadcn/ui already handle Escape
        return;
      }

      // / — focus search (Cmd+K equivalent trigger)
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // Dispatch a custom event that the global search can listen for
        window.dispatchEvent(new CustomEvent("wareos:focus-search"));
        return;
      }

      // N — create new entity (if handler provided)
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (config?.onNew) {
          e.preventDefault();
          config.onNew();
        }
        return;
      }

      // Cmd/Ctrl+S — save form (if handler provided)
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        if (config?.onSave) {
          e.preventDefault();
          config.onSave();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config, router]);
}
