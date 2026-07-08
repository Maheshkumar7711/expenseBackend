import * as changeLogService from './changeLogService';
import type { SyncEntityType } from '../types/domain/sync';

/** Record an upsert in the change log after legacy CRUD or domain writes. */
export async function emitUpsert(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  payload: unknown,
): Promise<void> {
  await changeLogService.recordChange({
    userId,
    entityType,
    entityId,
    operation: 'upsert',
    payload,
  });
}

/** Record a delete in the change log (optional payload e.g. account tombstone name). */
export async function emitDelete(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  payload?: unknown | null,
): Promise<void> {
  const deletedAt = new Date().toISOString();
  await changeLogService.recordChange({
    userId,
    entityType,
    entityId,
    operation: 'delete',
    payload: payload ?? null,
    deletedAt,
  });
}
