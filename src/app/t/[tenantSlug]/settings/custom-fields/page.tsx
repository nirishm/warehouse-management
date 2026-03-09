import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import type { CustomFieldDefinition } from '@/modules/inventory/validations/custom-field';
import { CustomFieldsClient } from './custom-fields-client';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CustomFieldsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: definitions } = await tenantClient
    .from('custom_field_definitions')
    .select('*')
    .order('entity_type')
    .order('sort_order');

  const items = (definitions ?? []) as CustomFieldDefinition[];

  return <CustomFieldsClient definitions={items} tenantSlug={tenantSlug} />;
}
