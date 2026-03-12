"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{ background: "var(--bg-off)" }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div
        className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-8 max-w-md w-full text-center"
      >
        <div
          style={{ color: "var(--red)" }}
          className="text-[48px] font-bold mb-2"
        >
          !
        </div>
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
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p
            style={{ color: "var(--text-dim)" }}
            className="text-[12px] mb-4"
          >
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{ background: "var(--accent-color)" }}
          className="text-white text-[14px] font-bold px-6 h-[48px] rounded-full hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
