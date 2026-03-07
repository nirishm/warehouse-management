import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { UserProfile, Permissions } from '@/modules/user-management/validations/user';

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

const roleColors: Record<string, string> = {
  tenant_admin: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  manager: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  employee: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const roleLabels: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

function countPermissions(permissions: Permissions | null): number {
  if (!permissions) return 0;
  return Object.values(permissions).filter(Boolean).length;
}

export default async function UsersPage({ params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, schema_name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);
  const { data: profiles } = await tenantClient
    .from('user_profiles')
    .select('*')
    .order('display_name');

  const publicClient = createAdminClient();
  const { data: memberships } = await publicClient
    .from('user_tenants')
    .select('user_id, role')
    .eq('tenant_id', tenant.id);

  const roleMap = new Map<string, string>();
  for (const m of memberships ?? []) {
    roleMap.set(m.user_id, m.role);
  }

  const users = ((profiles ?? []) as UserProfile[]).map((profile) => ({
    ...profile,
    role: roleMap.get(profile.user_id) ?? 'employee',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          User Management
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage user permissions, roles, and location assignments
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <p className="text-sm font-mono">No users found</p>
              <p className="text-xs mt-1">
                Users will appear here once they join this tenant
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Permissions
                  </TableHead>
                  <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const permCount = countPermissions(user.permissions);
                  return (
                    <TableRow
                      key={user.id}
                      className="border-zinc-800/60 hover:bg-zinc-800/30"
                    >
                      <TableCell className="pl-6">
                        <div>
                          <span className="text-sm text-zinc-200 font-medium">
                            {user.display_name || 'Unnamed User'}
                          </span>
                          {user.phone && (
                            <span className="block text-xs text-zinc-500 font-mono mt-0.5">
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${roleColors[user.role] ?? roleColors.employee}`}
                        >
                          {roleLabels[user.role] ?? user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? 'default' : 'secondary'}
                          className={
                            user.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/50'
                          }
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-zinc-400">
                          {user.role === 'tenant_admin'
                            ? 'All (Admin)'
                            : `${permCount} / 11`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Link
                          href={`/t/${tenantSlug}/settings/users/${user.user_id}`}
                          className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                        >
                          Edit
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
