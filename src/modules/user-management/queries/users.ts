import { eq, and, ilike, sql } from 'drizzle-orm';
import { db } from '@/core/db/drizzle';
import { userTenants, userProfiles, userLocations, auditLog } from '@/core/db/schema';
import { ApiError } from '@/core/api/error-handler';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Role } from '@/core/auth/types';

type UserTenantRow = typeof userTenants.$inferSelect;
type UserProfileRow = typeof userProfiles.$inferSelect;
type UserLocationRow = typeof userLocations.$inferSelect;

export interface UserListItem {
  userId: string;
  membershipId: string;
  role: Role;
  isDefault: boolean;
  displayName: string | null;
  phone: string | null;
}

export interface UserDetail extends UserListItem {
  permissions: Record<string, boolean> | null;
  locations: UserLocationRow[];
}

export async function listUsers(
  tenantId: string,
  filters?: {
    search?: string;
    role?: string;
  },
  pagination?: { limit: number; offset: number },
): Promise<{ data: UserListItem[]; total: number }> {
  // Build conditions against userTenants (the authoritative membership table)
  const conditions = [eq(userTenants.tenantId, tenantId)];

  if (filters?.role) {
    conditions.push(
      eq(userTenants.role, filters.role as Role),
    );
  }

  const where = and(...conditions);

  // Fetch all memberships (+ profiles via subquery join) in one go
  const memberships = await db
    .select({
      membershipId: userTenants.id,
      userId: userTenants.userId,
      role: userTenants.role,
      isDefault: userTenants.isDefault,
    })
    .from(userTenants)
    .where(where)
    .limit(pagination?.limit ?? 20)
    .offset(pagination?.offset ?? 0)
    .orderBy(sql`${userTenants.id} asc`);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(userTenants)
    .where(where);

  const total = Number(countResult[0]?.count ?? 0);

  if (memberships.length === 0) {
    return { data: [], total };
  }

  // Fetch profiles for these users in this tenant
  const userIds = memberships.map((m) => m.userId);

  // Fetch all profiles for the tenant, then match in memory
  const profiles = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      phone: userProfiles.phone,
    })
    .from(userProfiles)
    .where(eq(userProfiles.tenantId, tenantId));

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  let data: UserListItem[] = memberships.map((m) => {
    const profile = profileMap.get(m.userId);
    return {
      userId: m.userId,
      membershipId: m.membershipId,
      role: m.role as Role,
      isDefault: m.isDefault,
      displayName: profile?.displayName ?? null,
      phone: profile?.phone ?? null,
    };
  });

  // Apply displayName search filter in memory (since it lives in a separate table)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    data = data.filter(
      (u) => u.displayName?.toLowerCase().includes(searchLower) ?? false,
    );
  }

  return { data, total };
}

export async function getUser(
  tenantId: string,
  userId: string,
): Promise<UserDetail | null> {
  const membership = await db
    .select()
    .from(userTenants)
    .where(
      and(
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.userId, userId),
      ),
    );

  if (!membership[0]) return null;

  const [profileRows, locationRows] = await Promise.all([
    db
      .select()
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.tenantId, tenantId),
          eq(userProfiles.userId, userId),
        ),
      ),
    db
      .select()
      .from(userLocations)
      .where(
        and(
          eq(userLocations.tenantId, tenantId),
          eq(userLocations.userId, userId),
        ),
      ),
  ]);

  const profile = profileRows[0] ?? null;
  const m = membership[0];

  return {
    userId: m.userId,
    membershipId: m.id,
    role: m.role as Role,
    isDefault: m.isDefault,
    displayName: profile?.displayName ?? null,
    phone: profile?.phone ?? null,
    permissions: (profile?.permissions as Record<string, boolean> | null) ?? null,
    locations: locationRows,
  };
}

export async function inviteUser(
  tenantId: string,
  email: string,
  role: Exclude<Role, 'owner'>,
  displayName: string | undefined,
  invitedByUserId: string,
): Promise<UserDetail> {
  // Check for an existing membership (avoid duplicates)
  const existingMemberships = await db
    .select()
    .from(userTenants)
    .where(eq(userTenants.tenantId, tenantId));

  // Send invite via Supabase Admin — this creates/finds the auth user
  const admin = createAdminClient();
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        tenant_id: tenantId,
        role,
        display_name: displayName,
      },
    },
  );

  if (inviteError || !inviteData?.user) {
    throw new ApiError(500, inviteError?.message ?? 'Failed to invite user', 'INVITE_FAILED');
  }

  const newUserId = inviteData.user.id;

  // Confirm no duplicate membership now that we have the resolved userId
  const alreadyMember = existingMemberships.some((m) => m.userId === newUserId);
  if (alreadyMember) {
    throw new ApiError(409, 'User is already a member of this tenant', 'ALREADY_MEMBER');
  }

  // Create membership record
  const [membership] = await db
    .insert(userTenants)
    .values({
      userId: newUserId,
      tenantId,
      role,
      isDefault: false,
    })
    .returning();

  // Create profile record
  const [profile] = await db
    .insert(userProfiles)
    .values({
      userId: newUserId,
      tenantId,
      displayName: displayName ?? null,
      phone: null,
      permissions: null,
    })
    .returning();

  await db.insert(auditLog).values({
    tenantId,
    userId: invitedByUserId,
    action: 'create',
    entityType: 'user_membership',
    entityId: membership.id,
    newData: { userId: newUserId, email, role, displayName },
  });

  return {
    userId: newUserId,
    membershipId: membership.id,
    role: membership.role as Role,
    isDefault: membership.isDefault,
    displayName: profile.displayName ?? null,
    phone: profile.phone ?? null,
    permissions: null,
    locations: [],
  };
}

export async function updateUserRole(
  tenantId: string,
  userId: string,
  role: Exclude<Role, 'owner'>,
  updatedByUserId: string,
): Promise<UserTenantRow> {
  const existing = await db
    .select()
    .from(userTenants)
    .where(
      and(
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.userId, userId),
      ),
    );

  if (!existing[0]) {
    throw new ApiError(404, 'User not found in this tenant', 'NOT_FOUND');
  }

  const current = existing[0];

  if (current.role === 'owner') {
    throw new ApiError(403, 'Cannot change the role of the tenant owner', 'OWNER_ROLE_PROTECTED');
  }

  const [updated] = await db
    .update(userTenants)
    .set({ role })
    .where(
      and(
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.userId, userId),
      ),
    )
    .returning();

  await db.insert(auditLog).values({
    tenantId,
    userId: updatedByUserId,
    action: 'update',
    entityType: 'user_membership',
    entityId: current.id,
    oldData: { role: current.role },
    newData: { role },
  });

  return updated;
}

export async function updateUserPermissions(
  tenantId: string,
  userId: string,
  permissions: Record<string, boolean> | null,
  updatedByUserId: string,
): Promise<UserProfileRow> {
  const existing = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.tenantId, tenantId),
        eq(userProfiles.userId, userId),
      ),
    );

  if (!existing[0]) {
    throw new ApiError(404, 'User profile not found', 'NOT_FOUND');
  }

  const old = existing[0];

  const [updated] = await db
    .update(userProfiles)
    .set({ permissions, updatedAt: new Date() })
    .where(
      and(
        eq(userProfiles.tenantId, tenantId),
        eq(userProfiles.userId, userId),
      ),
    )
    .returning();

  await db.insert(auditLog).values({
    tenantId,
    userId: updatedByUserId,
    action: 'update',
    entityType: 'user_permissions',
    entityId: old.id,
    oldData: { permissions: old.permissions },
    newData: { permissions },
  });

  return updated;
}

export async function updateUserLocations(
  tenantId: string,
  userId: string,
  locationIds: string[],
  updatedByUserId: string,
): Promise<UserLocationRow[]> {
  // Verify user is a member of the tenant
  const membership = await db
    .select({ id: userTenants.id })
    .from(userTenants)
    .where(
      and(
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.userId, userId),
      ),
    );

  if (!membership[0]) {
    throw new ApiError(404, 'User not found in this tenant', 'NOT_FOUND');
  }

  const oldLocations = await db
    .select()
    .from(userLocations)
    .where(
      and(
        eq(userLocations.tenantId, tenantId),
        eq(userLocations.userId, userId),
      ),
    );

  // Replace all location assignments
  await db
    .delete(userLocations)
    .where(
      and(
        eq(userLocations.tenantId, tenantId),
        eq(userLocations.userId, userId),
      ),
    );

  let newLocations: UserLocationRow[] = [];

  if (locationIds.length > 0) {
    newLocations = await db
      .insert(userLocations)
      .values(
        locationIds.map((locationId) => ({
          userId,
          tenantId,
          locationId,
        })),
      )
      .returning();
  }

  await db.insert(auditLog).values({
    tenantId,
    userId: updatedByUserId,
    action: 'update',
    entityType: 'user_locations',
    entityId: membership[0].id,
    oldData: { locationIds: oldLocations.map((l) => l.locationId) },
    newData: { locationIds },
  });

  return newLocations;
}

export async function removeUser(
  tenantId: string,
  userId: string,
  removedByUserId: string,
): Promise<void> {
  const membership = await db
    .select()
    .from(userTenants)
    .where(
      and(
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.userId, userId),
      ),
    );

  if (!membership[0]) {
    throw new ApiError(404, 'User not found in this tenant', 'NOT_FOUND');
  }

  const current = membership[0];

  if (current.role === 'owner') {
    throw new ApiError(403, 'Cannot remove the tenant owner', 'OWNER_PROTECTED');
  }

  if (userId === removedByUserId) {
    throw new ApiError(400, 'Cannot remove yourself from the tenant', 'SELF_REMOVE');
  }

  // Hard delete membership records (these are not business data)
  await Promise.all([
    db
      .delete(userLocations)
      .where(
        and(
          eq(userLocations.tenantId, tenantId),
          eq(userLocations.userId, userId),
        ),
      ),
    db
      .delete(userProfiles)
      .where(
        and(
          eq(userProfiles.tenantId, tenantId),
          eq(userProfiles.userId, userId),
        ),
      ),
  ]);

  await db
    .delete(userTenants)
    .where(
      and(
        eq(userTenants.tenantId, tenantId),
        eq(userTenants.userId, userId),
      ),
    );

  await db.insert(auditLog).values({
    tenantId,
    userId: removedByUserId,
    action: 'delete',
    entityType: 'user_membership',
    entityId: current.id,
    oldData: { userId, role: current.role },
  });
}
