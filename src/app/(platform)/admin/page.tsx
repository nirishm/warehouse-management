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
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Platform Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage tenants and monitor platform health</p>
        </div>
        <Link href="/admin/tenants/new">
          <Button className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold">
            + New Tenant
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-zinc-100 font-mono">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
