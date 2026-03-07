import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Platform Admin — Warehouse Management',
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-zinc-100 font-mono uppercase">
              Warehouse<span className="text-amber-500">.</span>mgmt
            </span>
            <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin/tenants" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              Tenants
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
