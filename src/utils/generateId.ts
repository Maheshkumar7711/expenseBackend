export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now()}-${random}`;
}
