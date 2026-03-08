import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDocumentConfig } from '@/modules/document-gen/queries/config';
import { DocumentConfigForm } from './document-config-form';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function DocumentSettingsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('document-gen')) redirect(`/t/${tenantSlug}/settings`);

  const config = await getDocumentConfig(tenant.schema_name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Document Settings</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Configure company letterhead for PDF documents
        </p>
      </div>
      <DocumentConfigForm tenantSlug={tenantSlug} initialConfig={config} />
    </div>
  );
}
