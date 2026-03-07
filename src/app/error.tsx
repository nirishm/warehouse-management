'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-4xl font-mono font-bold text-red-500">Error</p>
        <h1 className="text-xl text-zinc-200">Something went wrong</h1>
        <p className="text-sm text-zinc-500 max-w-md">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="inline-block mt-4 px-4 py-2 bg-amber-600 text-zinc-950 font-medium rounded-md hover:bg-amber-500 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
