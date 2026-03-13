import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/core/db/drizzle';
import { superAdmins } from '@/core/db/schema';
import { eq } from 'drizzle-orm';
import { AdminHeader } from './admin-header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const userEmail = headersList.get('x-user-email') ?? '';

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
      <AdminHeader email={userEmail} />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
