import { requirePageAccess } from '@/core/auth/page-guard';
import { UserEditForm } from './user-edit-form';

export default async function UserEditPage({ params }: { params: Promise<{ tenantSlug: string; userId: string }> }) {
  const { tenantSlug, userId } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });
  return <UserEditForm tenantSlug={tenantSlug} userId={userId} />;
}
