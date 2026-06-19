/** Postgres unique_violation */
export function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}
