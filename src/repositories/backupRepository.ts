import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import type { BackupPayload, UserBackupRecord } from '../types/domain/backup';

interface UserBackupRow {
  user_id: string;
  created_at: string;
  updated_at: string;
  schema_version: number;
  server_revision_at_backup: number | string;
  byte_size: number;
  payload: BackupPayload;
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

/** Supabase returns timestamptz; normalize to UTC ISO for clients. */
function toIsoUtc(value: string): string {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? value : new Date(ms).toISOString();
}

function mapRow(row: UserBackupRow): UserBackupRecord {
  return {
    userId: row.user_id,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
    schemaVersion: row.schema_version,
    serverRevisionAtBackup: Number(row.server_revision_at_backup),
    byteSize: row.byte_size,
    payload: row.payload,
  };
}

export async function findBackupByUserId(userId: string): Promise<UserBackupRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('user_backups')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) wrapDbError(error);
    return data ? mapRow(data as UserBackupRow) : null;
  });
}

export interface UpsertBackupInput {
  userId: string;
  schemaVersion: number;
  serverRevisionAtBackup: number;
  byteSize: number;
  payload: BackupPayload;
}

/** Single-slot upsert — replaces previous backup; preserves first `created_at`. */
export async function upsertBackup(input: UpsertBackupInput): Promise<UserBackupRecord> {
  return runSupabaseQuery(async () => {
    const now = new Date().toISOString();
    const existing = await findBackupByUserId(input.userId);

    const rowPayload = {
      schema_version: input.schemaVersion,
      server_revision_at_backup: input.serverRevisionAtBackup,
      byte_size: input.byteSize,
      payload: input.payload,
    };

    if (existing) {
      const { data, error } = await getSupabaseAdmin()
        .from('user_backups')
        .update({
          ...rowPayload,
          updated_at: now,
        })
        .eq('user_id', input.userId)
        .select('*')
        .single();

      if (error) wrapDbError(error);
      return mapRow(data as UserBackupRow);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('user_backups')
      .insert({
        user_id: input.userId,
        created_at: now,
        updated_at: now,
        ...rowPayload,
      })
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapRow(data as UserBackupRow);
  });
}

export async function deleteBackupByUserId(userId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('user_backups')
      .delete()
      .eq('user_id', userId);

    if (error) wrapDbError(error);
  });
}
