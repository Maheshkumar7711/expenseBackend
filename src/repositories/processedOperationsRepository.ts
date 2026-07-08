import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import type { SyncPushResultStatus } from '../types/domain/sync';

const PROCESSED_OPS_TTL_DAYS = 30;

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export interface ProcessedOperationRecord {
  operationId: string;
  resultStatus: SyncPushResultStatus;
  serverRevision: number | null;
}

export async function findProcessedOperation(
  userId: string,
  operationId: string,
): Promise<ProcessedOperationRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('processed_operations')
      .select('operation_id, result_status, server_revision')
      .eq('user_id', userId)
      .eq('operation_id', operationId)
      .maybeSingle();

    if (error) {
      wrapDbError(error);
    }

    if (!data) {
      return null;
    }

    return {
      operationId: data.operation_id as string,
      resultStatus: data.result_status as SyncPushResultStatus,
      serverRevision: data.server_revision != null ? Number(data.server_revision) : null,
    };
  });
}

export async function recordProcessedOperation(input: {
  userId: string;
  operationId: string;
  entityType?: string;
  entityId?: string;
  resultStatus: SyncPushResultStatus;
  serverRevision: number | null;
}): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PROCESSED_OPS_TTL_DAYS);

  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin().from('processed_operations').upsert(
      {
        user_id: input.userId,
        operation_id: input.operationId,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        result_status: input.resultStatus,
        server_revision: input.serverRevision,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'user_id,operation_id' },
    );

    if (error) {
      wrapDbError(error);
    }
  });
}

export async function purgeExpiredProcessedOperations(): Promise<void> {
  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('processed_operations')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      wrapDbError(error);
    }
  });
}

export async function purgeProcessedOperationsForUser(userId: string): Promise<void> {
  await runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('processed_operations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      wrapDbError(error);
    }
  });
}
