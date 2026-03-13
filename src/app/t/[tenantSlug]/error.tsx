"use client";

import { useEffect } from "react";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tenant error:", error);
  }, [error]);

  return (
    <div
      style={{ backgroundColor: "var(--bg-off)" }}
      className="min-h-full flex items-center justify-center px-4 py-16"
    >
      <div
        className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-8 max-w-md w-full text-center"
      >
        <h1
          style={{ color: "var(--text-primary)" }}
          className="text-[22px] font-bold mb-2"
        >
          Something went wrong
        </h1>
        <p
          style={{ color: "var(--text-muted)" }}
          className="text-[14px] mb-6"
        >
          An error occurred while loading this page.
        </p>
        <button
          onClick={reset}
          style={{ backgroundColor: "var(--accent-color)" }}
          className="text-white text-[14px] font-bold px-6 h-[48px] rounded-full hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
