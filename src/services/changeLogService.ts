import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import * as changeLogRepository from '../repositories/changeLogRepository';
import * as processedOperationsRepository from '../repositories/processedOperationsRepository';
import type { SyncChangeOperation, SyncEntityType } from '../types/domain/sync';

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function getServerRevision(userId: string): Promise<number> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('user_sync_state')
      .select('server_revision')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      wrapDbError(error);
    }

    return data?.server_revision != null ? Number(data.server_revision) : 0;
  });
}

/** Allocate next revision and persist head in user_sync_state. */
export async function allocateRevision(userId: string): Promise<number> {
  return runSupabaseQuery(async () => {
    const current = await getServerRevision(userId);
    const next = current + 1;

    const { error } = await getSupabaseAdmin().from('user_sync_state').upsert(
      {
        user_id: userId,
        server_revision: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      wrapDbError(error);
    }

    return next;
  });
}

export async function ensureUserSyncState(userId: string): Promise<void> {
  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin().from('user_sync_state').upsert(
      {
        user_id: userId,
        server_revision: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

    if (error) {
      wrapDbError(error);
    }
  });
}

export async function recordChange(input: {
  userId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncChangeOperation;
  payload?: unknown | null;
  deletedAt?: string | null;
}): Promise<number> {
  const revision = await allocateRevision(input.userId);
  await changeLogRepository.appendChangeLogEntry({
    userId: input.userId,
    revision,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    payload: input.payload,
    deletedAt: input.deletedAt,
  });
  return revision;
}

/** Wipe sync cursor + history after server data wipe (fresh bootstrap). */
export async function resetSyncStateForUser(userId: string): Promise<void> {
  await changeLogRepository.purgeChangeLogForUser(userId);
  await processedOperationsRepository.purgeProcessedOperationsForUser(userId);
  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin().from('user_sync_state').upsert(
      {
        user_id: userId,
        server_revision: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      wrapDbError(error);
    }
  });
}
