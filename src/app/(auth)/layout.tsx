import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Warehouse Management',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono uppercase">
            Warehouse<span className="text-amber-500">.</span>mgmt
          </h1>
          <p className="text-sm text-zinc-500 mt-1 tracking-wide">Inventory Control System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
