export default function TenantLoading() {
  return (
    <div className="px-[var(--content-px)] py-6">
      {/* Page title skeleton */}
      <div
        style={{ background: "var(--border)", borderRadius: "6px" }}
        className="h-8 w-48 animate-pulse"
      />

      {/* Content skeletons */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-base)",
              borderRadius: "var(--card-radius)",
              border: "1px solid var(--border)",
            }}
            className="h-28 animate-pulse"
          />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{ background: "var(--border)", borderRadius: "6px" }}
            className="h-10 w-full animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
