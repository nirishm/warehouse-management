import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WareOS',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-off)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] mr-1.5"></span>WareOS
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 tracking-wide">Inventory Control System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
