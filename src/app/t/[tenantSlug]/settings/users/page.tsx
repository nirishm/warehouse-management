import { requirePageAccess } from '@/core/auth/page-guard';
import { UsersTable } from './users-table';

export default async function UsersPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });
  return <UsersTable tenantSlug={tenantSlug} />;
}
