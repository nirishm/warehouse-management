import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WareOS',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-off)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="inline-flex items-center gap-2 font-mono text-sm font-bold tracking-[0.08em] text-[var(--text-primary)]">
            <span className="inline-block w-[22px] h-[22px] rounded-[5px] bg-[var(--accent-color)]" />
            WareOS
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 tracking-wide">Inventory Control System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
