import { redirect } from 'next/navigation';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listLots } from '@/modules/lot-tracking/queries/lots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LotsTable } from './lots-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LotsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'lot-tracking', permission: 'canManageLots' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);
  if (!tenant.enabled_modules?.includes('lot-tracking')) redirect(`/t/${tenantSlug}`);

  const lots = await listLots(tenant.schema_name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight font-serif">Lots</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Batch/lot inventory with FIFO tracking
        </p>
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Lots ({lots.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No lots found</p>
              <p className="text-xs mt-1">Lots are created when receiving purchase orders</p>
            </div>
          ) : (
            <LotsTable data={lots} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
