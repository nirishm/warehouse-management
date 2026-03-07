import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantProvisionButton } from './provision-button';
import { TenantModulesManager } from './modules-manager';
import { InviteForm } from './invite-form';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (!tenant) notFound();

  // Fetch tenant members
  const { data: members } = await supabase
    .from('user_tenants')
    .select('user_id, role, is_default, created_at')
    .eq('tenant_id', id)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/admin/tenants" className="text-zinc-500 hover:text-zinc-300 text-sm">
              Tenants
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">{tenant.name}</h1>
          </div>
          <p className="text-sm text-zinc-500 font-mono">{tenant.slug}</p>
        </div>
        <Badge variant="outline" className={statusColors[tenant.status] || ''}>
          {tenant.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-500 text-xs font-mono uppercase">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-100 font-semibold capitalize">{tenant.plan}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-500 text-xs font-mono uppercase">Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-100 font-mono text-sm">{tenant.schema_name}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-500 text-xs font-mono uppercase">Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-100 font-semibold">{tenant.enabled_modules?.length ?? 0} enabled</p>
          </CardContent>
        </Card>
      </div>

      <TenantProvisionButton tenantId={id} schemaName={tenant.schema_name} />

      <TenantModulesManager
        tenantId={id}
        enabledModules={tenant.enabled_modules ?? []}
        modules={[]}
      />

      {members && members.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-zinc-200 text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-zinc-300 font-mono text-sm">{m.user_id}</span>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <InviteForm tenantId={id} />
    </div>
  );
}
