import { requirePageAccess } from '@/core/auth/page-guard';
import { CustomFieldsPage } from './custom-fields-page';

export default async function CustomFieldsRoute({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });
  return <CustomFieldsPage tenantSlug={tenantSlug} />;
}
