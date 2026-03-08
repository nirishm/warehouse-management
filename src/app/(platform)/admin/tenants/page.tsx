import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const statusColors: Record<string, string> = {
  active: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  trial: 'bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent)]/20',
  suspended: 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/20',
  cancelled: 'bg-muted/50 text-[var(--text-muted)] border-border',
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
        <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">Tenants</h1>
        <Link href="/admin/tenants/new">
          <Button className="bg-[var(--accent)] hover:bg-[var(--accent)] text-background font-semibold">
            + New Tenant
          </Button>
        </Link>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-mono text-xs uppercase">Name</TableHead>
              <TableHead className="text-muted-foreground font-mono text-xs uppercase">Slug</TableHead>
              <TableHead className="text-muted-foreground font-mono text-xs uppercase">Plan</TableHead>
              <TableHead className="text-muted-foreground font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="text-muted-foreground font-mono text-xs uppercase">Modules</TableHead>
              <TableHead className="text-muted-foreground font-mono text-xs uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants?.map((tenant) => (
              <TableRow key={tenant.id} className="border-border hover:bg-muted/50">
                <TableCell className="text-foreground font-medium">{tenant.name}</TableCell>
                <TableCell className="text-[var(--text-muted)] font-mono text-sm">{tenant.slug}</TableCell>
                <TableCell className="text-[var(--text-muted)] capitalize">{tenant.plan}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[tenant.status] || ''}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[var(--text-muted)] font-mono text-sm">
                  {tenant.enabled_modules?.length ?? 0}
                </TableCell>
                <TableCell>
                  <Link href={`/admin/tenants/${tenant.id}`}>
                    <Button variant="ghost" size="sm" className="text-[var(--text-muted)] hover:text-foreground">
                      Manage
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!tenants?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
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
