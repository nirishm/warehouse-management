'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-off)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-4xl font-mono font-bold text-[var(--red)]">Error</p>
        <h1 className="text-xl text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-full hover:bg-[var(--accent-dark)] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
