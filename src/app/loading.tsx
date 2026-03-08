export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-off)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    </div>
  );
}
