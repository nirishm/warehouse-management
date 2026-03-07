import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default async function TenantsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Tenants</h1>
        <Link href="/admin/tenants/new">
          <Button className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold">
            + New Tenant
          </Button>
        </Link>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-500 font-mono text-xs uppercase">Name</TableHead>
              <TableHead className="text-zinc-500 font-mono text-xs uppercase">Slug</TableHead>
              <TableHead className="text-zinc-500 font-mono text-xs uppercase">Plan</TableHead>
              <TableHead className="text-zinc-500 font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="text-zinc-500 font-mono text-xs uppercase">Modules</TableHead>
              <TableHead className="text-zinc-500 font-mono text-xs uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants?.map((tenant) => (
              <TableRow key={tenant.id} className="border-zinc-800 hover:bg-zinc-900/50">
                <TableCell className="text-zinc-200 font-medium">{tenant.name}</TableCell>
                <TableCell className="text-zinc-400 font-mono text-sm">{tenant.slug}</TableCell>
                <TableCell className="text-zinc-400 capitalize">{tenant.plan}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[tenant.status] || ''}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-400 font-mono text-sm">
                  {tenant.enabled_modules?.length ?? 0}
                </TableCell>
                <TableCell>
                  <Link href={`/admin/tenants/${tenant.id}`}>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                      Manage
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!tenants?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                  No tenants yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
