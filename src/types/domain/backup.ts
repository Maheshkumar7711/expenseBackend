import type { AccountsListResponse } from './account';
import type { BudgetsListResponse } from './budget';
import type { EventResponse } from './event';
import type { GoalsListResponse } from './goal';
import type { CategoriesStateResponse, UserPreferencesResponse } from './preferences';
import type { ReminderResponse } from './reminder';
import type { TransactionResponse } from './transaction';

export const BACKUP_SCHEMA_VERSION = 1;

/** Frozen app-data snapshot stored in user_backups.payload */
export interface BackupPayloadV1 {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  preferences: UserPreferencesResponse;
  categories: CategoriesStateResponse;
  accounts: AccountsListResponse;
  transactions: TransactionResponse[];
  budgets: BudgetsListResponse;
  goals: GoalsListResponse;
  events: EventResponse[];
  reminders: ReminderResponse[];
}

export type BackupPayload = BackupPayloadV1;

export interface UserBackupRecord {
  userId: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  serverRevisionAtBackup: number;
  byteSize: number;
  payload: BackupPayload;
}

export interface BackupMetaResponse {
  hasBackup: boolean;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion?: number;
  serverRevisionAtBackup?: number;
  byteSize?: number;
}
