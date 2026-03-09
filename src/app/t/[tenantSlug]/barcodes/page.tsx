import { redirect } from 'next/navigation';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { BarcodePrintManager } from './barcode-print-manager';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BarcodesPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'barcode' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('barcode')) redirect(`/t/${tenantSlug}`);

  const client = createTenantClient(tenant.schema_name);
  const { data: commodities } = await client
    .from('commodities')
    .select('id, code, name, category')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true });

  const rows = (commodities ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    code: c.code as string,
    name: c.name as string,
    category: (c.category as string) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">Barcode Labels</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Select commodities to generate printable QR code labels
        </p>
      </div>
      <BarcodePrintManager commodities={rows} tenantSlug={tenantSlug} />
    </div>
  );
}
