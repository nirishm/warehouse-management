import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { AdjustmentWithRelations } from '@/modules/adjustments/validations/adjustment';
import { AdjustmentsTable } from './adjustments-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdjustmentsPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'adjustments', permission: 'canManageAdjustments' });
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: adjustments } = await tenantClient
    .from('adjustments')
    .select(
      '*, location:locations(name), commodity:commodities(name, code), unit:units(name, abbreviation), reason:adjustment_reasons(name, direction)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const items = (adjustments ?? []) as unknown as AdjustmentWithRelations[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            Adjustments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record stock adjustments for breakage, spillage, and corrections
          </p>
        </div>
        <Link href={`/t/${tenantSlug}/adjustments/new`}>
          <Button variant="orange">
            <Plus className="size-4 mr-1" />
            New Adjustment
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Adjustments ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No adjustments found</p>
              <p className="text-xs mt-1">
                Create your first adjustment to get started
              </p>
            </div>
          ) : (
            <AdjustmentsTable data={items} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
