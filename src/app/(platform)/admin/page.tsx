import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const { count: tenantCount } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true });

  const { count: userCount } = await supabase
    .from('user_tenants')
    .select('*', { count: 'exact', head: true });

  const stats = [
    { label: 'Total Tenants', value: tenantCount ?? 0 },
    { label: 'Total Users', value: userCount ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tenants and monitor platform health</p>
        </div>
        <Link href="/admin/tenants/new">
          <Button className="bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-background font-semibold">
            + New Tenant
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-[var(--bg-off)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground font-mono">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
