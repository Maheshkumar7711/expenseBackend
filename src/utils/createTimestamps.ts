/** Optional create-time timestamps (used by backup restore to preserve order/sync metadata). */
export interface OptionalCreateTimestamps {
  createdAt?: string;
  updatedAt?: string;
}

export function applyOptionalCreateTimestamps(
  row: Record<string, unknown>,
  input: OptionalCreateTimestamps,
): void {
  if (input.createdAt) {
    row.created_at = input.createdAt;
  }
  if (input.updatedAt) {
    row.updated_at = input.updatedAt;
  }
}
