import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { ReceiveForm } from './receive-form';
import { MobileReceiveForm } from '@/components/mobile/mobile-receive-form';

interface Props {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function ReceiveDispatchPage({ params }: Props) {
  const { tenantSlug, id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name, enabled_modules')
    .eq('slug', tenantSlug)
    .eq('status', 'active')
    .single();

  if (!tenant) redirect(`/t/${tenantSlug}`);

  const barcodeEnabled = (tenant.enabled_modules ?? []).includes('barcode');
  const client = createTenantClient(tenant.schema_name);

  // Fetch dispatch with joined location names
  const { data: dispatch, error: dispatchError } = await client
    .from('dispatches')
    .select(
      '*, origin_location:locations!origin_location_id(name), dest_location:locations!dest_location_id(name)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (dispatchError || !dispatch) {
    redirect(`/t/${tenantSlug}/dispatches`);
  }

  // Check that dispatch is in a receivable state
  const receivableStatuses = ['dispatched', 'in_transit'];
  if (!receivableStatuses.includes(dispatch.status)) {
    redirect(`/t/${tenantSlug}/dispatches/${id}`);
  }

  // Fetch dispatch items with commodity and unit names
  const { data: items, error: itemsError } = await client
    .from('dispatch_items')
    .select(
      '*, commodity:commodities(name, code), unit:units(name, abbreviation)'
    )
    .eq('dispatch_id', id);

  if (itemsError) {
    redirect(`/t/${tenantSlug}/dispatches`);
  }

  const originName =
    (dispatch.origin_location as { name: string } | null)?.name ?? 'Unknown';
  const destName =
    (dispatch.dest_location as { name: string } | null)?.name ?? 'Unknown';

  const dispatchInfo = {
    id: dispatch.id as string,
    dispatch_number: dispatch.dispatch_number as string,
    status: dispatch.status as string,
    origin_name: originName,
    dest_name: destName,
    dispatched_at: dispatch.dispatched_at as string | null,
    transporter_name: dispatch.transporter_name as string | null,
    vehicle_number: dispatch.vehicle_number as string | null,
  };

  const mobileDispatchInfo = {
    id: dispatchInfo.id,
    dispatch_number: dispatchInfo.dispatch_number,
    origin_name: dispatchInfo.origin_name,
    dest_name: dispatchInfo.dest_name,
  };

  const formItems = (items ?? []).map((item: Record<string, unknown>) => {
    const commodity = item.commodity as { name: string; code: string } | null;
    const unit = item.unit as { name: string; abbreviation: string } | null;
    return {
      id: item.id as string,
      commodity_name: commodity?.name ?? 'Unknown',
      commodity_code: commodity?.code ?? '',
      unit_name: unit?.name ?? '',
      unit_abbreviation: unit?.abbreviation ?? '',
      sent_quantity: Number(item.sent_quantity),
      sent_bags: item.sent_bags as number | null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Receive Dispatch
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record received quantities for{' '}
          <span className="font-mono text-[var(--accent-color)]">
            {dispatchInfo.dispatch_number}
          </span>
        </p>
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block">
        <ReceiveForm
          dispatch={dispatchInfo}
          items={formItems}
          tenantSlug={tenantSlug}
        />
      </div>

      {/* Mobile card layout */}
      <div className="block md:hidden">
        <MobileReceiveForm
          dispatch={mobileDispatchInfo}
          items={formItems}
          tenantSlug={tenantSlug}
          barcodeEnabled={barcodeEnabled}
        />
      </div>
    </div>
  );
}
