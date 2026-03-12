export function applyLocationFilter<T extends { in: (col: string, vals: string[]) => T }>(
  query: T,
  column: string,
  locationIds: string[] | null
): T {
  if (locationIds === null || locationIds === undefined) return query;
  if (locationIds.length === 0) return query;
  return query.in(column, locationIds);
}

export function applySoftDeleteFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is('deleted_at', null);
}
