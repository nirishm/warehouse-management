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
  warnings?: ImportError[];
}

export function ImportResults({ summary, errors, warnings }: ImportResultsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-3 text-center">
          <div className="text-xl font-bold font-mono text-[var(--text-primary)]">{summary.total}</div>
          <div className="text-xs font-mono uppercase text-[var(--text-dim)] mt-0.5">Total</div>
        </div>
        <div className="rounded-md border border-[rgba(22,163,74,0.2)] bg-[var(--green-bg)] p-3 text-center">
          <div className="text-xl font-bold font-mono text-[var(--green)]">{summary.inserted}</div>
          <div className="text-xs font-mono uppercase text-[var(--text-dim)] mt-0.5">Inserted</div>
        </div>
        <div className="rounded-md border border-[rgba(220,38,38,0.2)] bg-[var(--red-bg)] p-3 text-center">
          <div className="text-xl font-bold font-mono text-[var(--red)]">{summary.failed}</div>
          <div className="text-xs font-mono uppercase text-[var(--text-dim)] mt-0.5">Failed</div>
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="border border-[rgba(234,179,8,0.3)] rounded-md overflow-hidden">
          <div className="bg-[rgba(234,179,8,0.08)] px-3 py-2 text-xs font-mono text-[rgb(161,98,7)] uppercase tracking-wider">
            Warnings ({warnings.length})
          </div>
          <div className="divide-y divide-[var(--border)] max-h-48 overflow-y-auto">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 text-xs font-mono">
                <span className="text-[var(--text-dim)] shrink-0 w-12">Row {w.row}</span>
                <span className="text-[var(--accent-color)] shrink-0 w-24">{w.field}</span>
                <span className="text-[rgb(161,98,7)]">{w.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="border border-[rgba(220,38,38,0.2)] rounded-md overflow-hidden">
          <div className="bg-[var(--red-bg)] px-3 py-2 text-xs font-mono text-[var(--red)] uppercase tracking-wider">
            Errors ({errors.length})
          </div>
          <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 text-xs font-mono">
                <span className="text-[var(--text-dim)] shrink-0 w-12">Row {err.row}</span>
                <span className="text-[var(--accent-color)] shrink-0 w-24">{err.field}</span>
                <span className="text-[var(--red)]">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
