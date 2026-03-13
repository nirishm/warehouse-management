import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/core/db/drizzle';
import { superAdmins } from '@/core/db/schema';
import { eq } from 'drizzle-orm';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  if (!userId) {
    redirect('/login');
  }

  // Check super admin status
  const result = await db.select().from(superAdmins).where(eq(superAdmins.userId, userId));
  if (result.length === 0) {
    redirect('/');
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-off)' }} className="min-h-screen">
      <header
        className="border-b border-[var(--border)] px-6 py-4"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 style={{ color: 'var(--text-primary)' }} className="text-[17px] font-bold">
            WareOS Admin
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin/tenants"
              style={{ color: 'var(--text-muted)' }}
              className="text-[14px] hover:underline"
            >
              Tenants
            </Link>
            <Link
              href="/admin/access-requests"
              style={{ color: 'var(--text-muted)' }}
              className="text-[14px] hover:underline"
            >
              Access Requests
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
