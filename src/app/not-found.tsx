import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{ background: "var(--bg-off)" }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div
        className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-base)] p-8 max-w-md w-full text-center"
      >
        <p
          style={{ color: "var(--accent-color)" }}
          className="text-[64px] font-bold mb-2"
        >
          404
        </p>
        <h1
          style={{ color: "var(--text-primary)" }}
          className="text-[22px] font-bold mb-2"
        >
          Page not found
        </h1>
        <p
          style={{ color: "var(--text-muted)" }}
          className="text-[14px] mb-6"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{ background: "var(--accent-color)" }}
          className="inline-flex items-center justify-center text-white text-[14px] font-bold px-6 h-[48px] rounded-full hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
