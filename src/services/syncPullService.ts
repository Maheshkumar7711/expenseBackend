import * as changeLogRepository from '../repositories/changeLogRepository';
import * as changeLogService from './changeLogService';
import type { SyncChangesResponse } from '../types/domain/sync';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

export async function getChangesSince(
  clerkUserId: string,
  userId: string,
  since: number,
  limit?: number,
): Promise<SyncChangesResponse> {
  void clerkUserId;
  const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const sinceRevision = Math.max(0, since);

  const changes = await changeLogRepository.listChangesSince(userId, sinceRevision, safeLimit + 1);
  const hasMore = changes.length > safeLimit;
  const page = hasMore ? changes.slice(0, safeLimit) : changes;
  const serverRevision = await changeLogService.getServerRevision(userId);

  return {
    changes: page.map((entry) => ({
      entityType: entry.entityType,
      entityId: entry.entityId,
      operation: entry.operation,
      revision: entry.revision,
      payload: entry.payload,
      deletedAt: entry.deletedAt,
    })),
    serverRevision,
    hasMore,
  };
}
