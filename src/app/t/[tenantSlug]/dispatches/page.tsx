import Link from 'next/link';
import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { createTenantClient } from '@/core/db/tenant-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { DispatchWithLocations } from '@/modules/dispatch/validations/dispatch';
import { RealtimeListener } from '@/components/realtime/realtime-listener';
import { DispatchesTable } from './dispatches-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function DispatchesPage({ params }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'dispatch', permission: 'canDispatch' });
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: dispatches } = await tenantClient
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name), dispatch_items(id)'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const items = ((dispatches ?? []) as Record<string, unknown>[]).map((row) => {
    const dispatchItems = row.dispatch_items as { id: string }[] | null;
    return {
      ...row,
      item_count: dispatchItems?.length ?? 0,
    } as DispatchWithLocations;
  });

  return (
    <div className="space-y-6">
      <RealtimeListener table="dispatches" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            Dispatches
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track item dispatches between locations
          </p>
        </div>
        <Link prefetch={false} href={`/t/${tenantSlug}/dispatches/new`}>
          <Button variant="orange">
            <Plus className="size-4 mr-1" />
            New Dispatch
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            All Dispatches ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm font-mono">No dispatches found</p>
              <p className="text-xs mt-1">
                Create your first dispatch to get started
              </p>
            </div>
          ) : (
            <DispatchesTable data={items} tenantSlug={tenantSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
