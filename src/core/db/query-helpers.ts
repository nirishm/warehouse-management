/** Nil UUID that will never match a real row — used to force an empty result set */
const IMPOSSIBLE_UUID = '00000000-0000-0000-0000-000000000000';

export function applyLocationFilter<T extends { in: (col: string, vals: string[]) => T }>(
  query: T,
  column: string,
  locationIds: string[] | null
): T {
  // null means "no restriction" (admin or unrestricted user)
  if (locationIds === null || locationIds === undefined) return query;
  // Empty array means the user has NO locations — block all results
  if (locationIds.length === 0) return query.in(column, [IMPOSSIBLE_UUID]);
  return query.in(column, locationIds);
}

export function applySoftDeleteFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is('deleted_at', null);
}
