"use client";

import { useState, useEffect } from "react";

const SHORTCUTS = [
  { key: "/", label: "Focus search" },
  { key: "N", label: "Create new" },
  { key: "⌘S", label: "Save form" },
  { key: "Esc", label: "Close dialog" },
  { key: "?", label: "Show shortcuts" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-6 shadow-lg max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: "var(--text-primary)" }} className="text-[17px] font-bold mb-4">
          Keyboard Shortcuts
        </h2>
        <div className="flex flex-col gap-3">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span style={{ color: "var(--text-muted)" }} className="text-[13px]">
                {s.label}
              </span>
              <kbd
                style={{ background: "var(--bg-off)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                className="text-[12px] font-bold px-2 py-1 rounded-md min-w-[28px] text-center"
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--text-dim)" }} className="text-[12px] mt-4">
          Press Esc or ? to close
        </p>
      </div>
    </div>
  );
}
