import { BadRequestError } from '../errors';

export const DEFAULT_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface PaginationMeta {
  cursor: string | null;
  limit: number;
  hasMore: boolean;
}

export function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_LIMIT;
  }

  const limit = Number(raw);
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_PAGE_LIMIT);
}

export function encodeCursor(date: string, id: string): string {
  return Buffer.from(`${date}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { date: string; id: string } {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separatorIndex = decoded.lastIndexOf('|');
    if (separatorIndex <= 0) {
      throw new Error('invalid');
    }

    const date = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);
    if (!date || !id) {
      throw new Error('invalid');
    }

    return { date, id };
  } catch {
    throw new BadRequestError('Invalid pagination cursor', 'INVALID_CURSOR');
  }
}
