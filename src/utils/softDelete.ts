/** Filter active (non-soft-deleted) rows in Supabase queries. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isActiveRow<T extends { filter: (col: string, op: string, val: unknown) => T }>(
  query: T,
): T {
  return query.filter('deleted_at', 'is', null);
}

export function softDeletePatch(): { deleted_at: string } {
  return { deleted_at: new Date().toISOString() };
}
