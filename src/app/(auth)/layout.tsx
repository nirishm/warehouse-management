export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">WareOS</h1>
          <p className="text-sm text-stone-500">Inventory &amp; Warehouse Management</p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60">
          {children}
        </div>
      </div>
    </div>
  );
}
