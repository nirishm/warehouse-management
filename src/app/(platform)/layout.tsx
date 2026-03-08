import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Platform Admin — WareOS',
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-off)]">
      <header className="border-b border-border bg-white backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground font-mono uppercase">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] mr-1.5"></span>WareOS
            </span>
            <span className="text-xs bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent)]/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin/tenants" className="text-[var(--text-muted)] hover:text-foreground transition-colors">
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
