import { requirePageAccess } from '@/core/auth/page-guard';
import { DocumentConfigForm } from './document-config-form';

export default async function DocumentsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'document-gen', permission: 'canGenerateDocuments' });
  return <DocumentConfigForm tenantSlug={tenantSlug} />;
}
