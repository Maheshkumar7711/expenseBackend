import * as backupRepository from '../repositories/backupRepository';
import { BadRequestError, NotFoundError } from '../errors';
import { isBackupPayloadEmpty } from '../utils/isBackupPayloadEmpty';
import { ensureUser } from './userService';
import { getBootstrapSync } from './syncService';
import { applyBackupPayloadToLive } from './backupRestoreApplier';
import {
  BACKUP_SCHEMA_VERSION,
  type BackupMetaResponse,
  type BackupPayloadV1,
} from '../types/domain/backup';
import type { BootstrapSyncData } from './syncService';

function toMeta(record: {
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  serverRevisionAtBackup: number;
  byteSize: number;
}): BackupMetaResponse {
  return {
    hasBackup: true,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    schemaVersion: record.schemaVersion,
    serverRevisionAtBackup: record.serverRevisionAtBackup,
    byteSize: record.byteSize,
  };
}

function buildPayloadFromBootstrap(bootstrap: BootstrapSyncData): BackupPayloadV1 {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    preferences: bootstrap.preferences,
    categories: bootstrap.categories,
    accounts: bootstrap.accounts,
    transactions: bootstrap.transactions,
    budgets: bootstrap.budgets,
    goals: bootstrap.goals,
    events: bootstrap.events,
    reminders: bootstrap.reminders,
  };
}

/** Create or replace the single cloud backup from current live app data. */
export async function createOrReplaceBackup(clerkUserId: string): Promise<BackupMetaResponse> {
  const user = await ensureUser(clerkUserId);
  const bootstrap = await getBootstrapSync(clerkUserId);
  const payload = buildPayloadFromBootstrap(bootstrap);

  if (isBackupPayloadEmpty(payload)) {
    throw new BadRequestError(
      'There is no app data to back up yet. Add transactions, accounts, or other data first.',
      'BACKUP_EMPTY',
    );
  }

  const payloadJson = JSON.stringify(payload);
  const byteSize = Buffer.byteLength(payloadJson, 'utf8');

  const record = await backupRepository.upsertBackup({
    userId: user.id,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    serverRevisionAtBackup: bootstrap.meta.serverRevision,
    byteSize,
    payload,
  });

  return toMeta(record);
}

export async function getCurrentBackupMeta(clerkUserId: string): Promise<BackupMetaResponse> {
  const user = await ensureUser(clerkUserId);
  const record = await backupRepository.findBackupByUserId(user.id);
  if (!record) {
    return { hasBackup: false };
  }
  return toMeta(record);
}

/**
 * Restore the single backup slot into live domain tables and reset sync cursor.
 * Client must clear outbox and run GET /sync bootstrap afterward.
 */
export async function restoreCurrentBackup(clerkUserId: string): Promise<BackupMetaResponse> {
  const user = await ensureUser(clerkUserId);
  const record = await backupRepository.findBackupByUserId(user.id);
  if (!record) {
    throw new NotFoundError('Backup', 'current');
  }

  await applyBackupPayloadToLive(user.id, record.payload);
  return toMeta(record);
}

export async function deleteCurrentBackup(clerkUserId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);
  await backupRepository.deleteBackupByUserId(user.id);
}
