import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-off)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-6xl font-mono font-bold text-[var(--accent)]">404</p>
        <h1 className="text-xl text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-full hover:bg-[var(--accent-dark)] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
