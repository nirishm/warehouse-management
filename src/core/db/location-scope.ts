import { eq, and } from 'drizzle-orm';
import type { Database } from './drizzle';
import { userLocations } from './schema';
import type { Role } from '@/core/auth/types';
import { ApiError } from '@/core/api/error-handler';

/**
 * Location scope for a user.
 * - null = unrestricted (owner/admin) — no filtering applied
 * - string[] = list of allowed locationIds (may be empty = no access)
 */
export type LocationScope = string[] | null;

const UNRESTRICTED_ROLES: Role[] = ['owner', 'admin'];

/**
 * Queries user_locations once per request. Returns null for owner/admin
 * (unrestricted), or an array of assigned locationIds for other roles.
 * Empty array means no locations assigned = no data visible.
 */
export async function getUserLocationScope(
  db: Database,
  tenantId: string,
  userId: string,
  role: Role,
): Promise<LocationScope> {
  if (UNRESTRICTED_ROLES.includes(role)) return null;

  const rows = await db
    .select({ locationId: userLocations.locationId })
    .from(userLocations)
    .where(and(
      eq(userLocations.tenantId, tenantId),
      eq(userLocations.userId, userId),
    ));

  return rows.map((r) => r.locationId);
}

/**
 * Guard for single-location mutations (purchases, sales, adjustments).
 * Throws 403 if the locationId is not in the user's scope.
 */
export function assertLocationAccess(
  scope: LocationScope,
  locationId: string | null | undefined,
): void {
  if (scope === null) return; // unrestricted
  if (!locationId) return; // nullable field with no value — allow
  if (!scope.includes(locationId)) {
    throw new ApiError(403, 'Access denied: not assigned to this location', 'LOCATION_ACCESS_DENIED');
  }
}

/**
 * Guard for transfer mutations. Checks the origin location is in scope.
 * (Transfers are visible if user has either origin OR dest, but creating
 * requires origin access.)
 */
export function assertTransferLocationAccess(
  scope: LocationScope,
  originLocationId: string,
): void {
  if (scope === null) return;
  if (!scope.includes(originLocationId)) {
    throw new ApiError(403, 'Access denied: not assigned to origin location', 'LOCATION_ACCESS_DENIED');
  }
}
