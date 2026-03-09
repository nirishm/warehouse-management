import { requirePageAccess } from '@/core/auth/page-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { listAuditEntries } from '@/modules/audit-trail/queries/audit-log';
import { AuditTable } from './audit-table';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function AuditLogPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  await requirePageAccess({ tenantSlug, moduleId: 'audit-trail', permission: 'canViewAuditLog' });
  const query = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const limit = parseInt(query.limit || '50', 10);
  const offset = parseInt(query.offset || '0', 10);

  const result = await listAuditEntries(tenant.schema_name, {
    entity_type: query.entity_type,
    action: query.action,
    from: query.from,
    to: query.to,
    limit: Math.min(limit, 100),
    offset: Math.max(offset, 0),
  });

  // Fetch distinct users for filter options
  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: users } = await tenantClient
    .from('user_profiles')
    .select('user_id, display_name')
    .order('display_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
          Audit Log
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Track all changes and actions across your warehouse
        </p>
      </div>

      <AuditTable
        entries={result.data}
        totalCount={result.count}
        limit={limit}
        offset={offset}
        tenantSlug={tenantSlug}
        filters={{
          entity_type: query.entity_type,
          action: query.action,
          from: query.from,
          to: query.to,
        }}
        users={(users ?? []).map((u) => ({
          id: u.user_id as string,
          name: u.display_name as string,
        }))}
      />
    </div>
  );
}
