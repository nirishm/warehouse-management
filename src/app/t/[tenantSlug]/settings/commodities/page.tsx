import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CommoditiesClient } from './commodities-client';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CommoditiesPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, schema_name, name, enabled_modules, slug')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const barcodeEnabled = (tenant.enabled_modules ?? []).includes('barcode');
  const tenantClient = createTenantClient(tenant.schema_name);

  const { data: commodities } = await tenantClient
    .from('commodities')
    .select('*, units:default_unit_id(name, abbreviation)')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  const rows = (commodities ?? []).map((row: Record<string, unknown>) => {
    const unit = row.units as { name: string; abbreviation: string } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      code: row.code as string,
      description: (row.description as string) ?? null,
      category: (row.category as string) ?? null,
      default_unit_id: (row.default_unit_id as string) ?? null,
      is_active: row.is_active as boolean,
      unit_name: unit?.name ?? null,
      unit_abbreviation: unit?.abbreviation ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Commodities</h1>
          <p className="text-sm text-foreground0 mt-1">
            Manage the commodities tracked in your warehouse
          </p>
        </div>
        <CommoditiesClient
          initialData={rows}
          renderMode="button"
          tenantSlug={tenantSlug}
          barcodeEnabled={barcodeEnabled}
        />
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground0">
            All Commodities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CommoditiesClient
            initialData={rows}
            renderMode="table"
            tenantSlug={tenantSlug}
            barcodeEnabled={barcodeEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
