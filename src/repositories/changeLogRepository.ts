import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import type { SyncChangeOperation, SyncEntityType } from '../types/domain/sync';

interface ChangeLogRow {
  id: number;
  user_id: string;
  revision: number;
  entity_type: string;
  entity_id: string;
  operation: SyncChangeOperation;
  payload: unknown | null;
  deleted_at: string | null;
  created_at: string;
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export interface AppendChangeLogInput {
  userId: string;
  revision: number;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncChangeOperation;
  payload?: unknown | null;
  deletedAt?: string | null;
}

export async function appendChangeLogEntry(input: AppendChangeLogInput): Promise<void> {
  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin().from('change_log').insert({
      user_id: input.userId,
      revision: input.revision,
      entity_type: input.entityType,
      entity_id: input.entityId,
      operation: input.operation,
      payload: input.payload ?? null,
      deleted_at: input.deletedAt ?? null,
    });

    if (error) {
      wrapDbError(error);
    }
  });
}

export interface ChangeLogEntry {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncChangeOperation;
  revision: number;
  payload: unknown | null;
  deletedAt: string | null;
}

export async function listChangesSince(
  userId: string,
  sinceRevision: number,
  limit: number,
): Promise<ChangeLogEntry[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('change_log')
      .select('*')
      .eq('user_id', userId)
      .gt('revision', sinceRevision)
      .order('revision', { ascending: true })
      .limit(limit);

    if (error) {
      wrapDbError(error);
    }

    return (data as ChangeLogRow[] | null ?? []).map((row) => ({
      entityType: row.entity_type as SyncEntityType,
      entityId: row.entity_id,
      operation: row.operation,
      revision: Number(row.revision),
      payload: row.payload,
      deletedAt: row.deleted_at,
    }));
  });
}

export async function countChangesSince(userId: string, sinceRevision: number): Promise<number> {
  return runSupabaseQuery(async () => {
    const { count, error } = await getSupabaseAdmin()
      .from('change_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('revision', sinceRevision);

    if (error) {
      wrapDbError(error);
    }

    return count ?? 0;
  });
}

export async function purgeChangeLogForUser(userId: string): Promise<void> {
  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('change_log')
      .delete()
      .eq('user_id', userId);

    if (error) {
      wrapDbError(error);
    }
  });
}
