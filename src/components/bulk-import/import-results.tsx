'use client';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportSummary {
  total: number;
  inserted: number;
  failed: number;
}

interface ImportResultsProps {
  summary: ImportSummary;
  errors: ImportError[];
}

export function ImportResults({ summary, errors }: ImportResultsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-center">
          <div className="text-xl font-bold font-mono text-zinc-100">{summary.total}</div>
          <div className="text-xs font-mono uppercase text-zinc-500 mt-0.5">Total</div>
        </div>
        <div className="rounded-md border border-emerald-800/40 bg-emerald-900/20 p-3 text-center">
          <div className="text-xl font-bold font-mono text-emerald-400">{summary.inserted}</div>
          <div className="text-xs font-mono uppercase text-zinc-500 mt-0.5">Inserted</div>
        </div>
        <div className="rounded-md border border-red-800/40 bg-red-900/20 p-3 text-center">
          <div className="text-xl font-bold font-mono text-red-400">{summary.failed}</div>
          <div className="text-xs font-mono uppercase text-zinc-500 mt-0.5">Failed</div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="border border-red-800/40 rounded-md overflow-hidden">
          <div className="bg-red-900/20 px-3 py-2 text-xs font-mono text-red-400 uppercase tracking-wider">
            Errors ({errors.length})
          </div>
          <div className="divide-y divide-zinc-800/60 max-h-64 overflow-y-auto">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 text-xs font-mono">
                <span className="text-zinc-600 shrink-0 w-12">Row {err.row}</span>
                <span className="text-amber-500 shrink-0 w-24">{err.field}</span>
                <span className="text-red-300">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
