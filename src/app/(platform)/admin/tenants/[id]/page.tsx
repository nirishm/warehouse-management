import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantProvisionButton } from './provision-button';
import { TenantModulesManager } from './modules-manager';
import { InviteForm } from './invite-form';

const statusColors: Record<string, string> = {
  active: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  trial: 'bg-[var(--accent-tint)] text-[var(--accent-color)] border-[var(--accent-color)]/20',
  suspended: 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/20',
  cancelled: 'bg-muted/50 text-muted-foreground border-border',
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
            <Link href="/admin/tenants" className="text-muted-foreground hover:text-[var(--text-body)] text-sm">
              Tenants
            </Link>
            <span className="text-[var(--text-dim)]">/</span>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{tenant.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
        </div>
        <Badge variant="outline" className={statusColors[tenant.status] || ''}>
          {tenant.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-mono uppercase">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground font-semibold capitalize">{tenant.plan}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-mono uppercase">Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground font-mono text-sm">{tenant.schema_name}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-mono uppercase">Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground font-semibold">{tenant.enabled_modules?.length ?? 0} enabled</p>
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
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-[var(--text-body)] font-mono text-sm">{m.user_id}</span>
                  <Badge variant="outline" className="border-border text-[var(--text-muted)] text-xs">
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
