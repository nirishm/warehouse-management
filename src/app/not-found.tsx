import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-6xl font-mono font-bold text-amber-500">404</p>
        <h1 className="text-xl text-zinc-200">Page not found</h1>
        <p className="text-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-amber-600 text-zinc-950 font-medium rounded-md hover:bg-amber-500 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
