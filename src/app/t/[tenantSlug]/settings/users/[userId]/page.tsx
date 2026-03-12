import { requirePageAccess } from '@/core/auth/page-guard';
import { getTenantBySlug } from '@/core/auth/session';
import { createTenantClient } from '@/core/db/tenant-query';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { UserEditForm } from './user-edit-form';
import type {
  UserProfile,
  UserWithLocations,
} from '@/modules/user-management/validations/user';

interface Props {
  params: Promise<{ tenantSlug: string; userId: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { tenantSlug, userId } = await params;
  await requirePageAccess({ tenantSlug, adminOnly: true });

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const tenantClient = createTenantClient(tenant.schema_name);

  const { data: profile } = await tenantClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-dim)]">
        <p className="text-sm font-mono">User not found</p>
        <Link
          href={`/t/${tenantSlug}/settings/users`}
          className="text-xs text-[var(--accent-color)] hover:text-[var(--accent-color)] mt-2 font-mono"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  const publicClient = createAdminClient();
  const [{ data: locations }, { data: membership }] = await Promise.all([
    tenantClient.from('user_locations').select('id, user_id, location_id').eq('user_id', userId),
    publicClient.from('user_tenants').select('role').eq('tenant_id', tenant.id).eq('user_id', userId).single(),
  ]);

  const user: UserWithLocations = {
    ...(profile as UserProfile),
    role: (membership?.role ?? 'employee') as UserWithLocations['role'],
    locations: (locations ?? []) as { id: string; user_id: string; location_id: string }[],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/t/${tenantSlug}/settings/users`}
          className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-mono text-[var(--text-muted)] hover:bg-muted hover:text-foreground transition-colors"
        >
          &larr; Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
            {user.display_name || 'Unnamed User'}
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-0.5 font-mono">
            User ID: {user.user_id}
          </p>
        </div>
      </div>

      <UserEditForm user={user} tenantSlug={tenantSlug} />
    </div>
  );
}
