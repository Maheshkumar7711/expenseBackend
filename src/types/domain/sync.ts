/** Sync v2 domain types — batch push and incremental pull. */

export type SyncEntityType =
  | 'transaction'
  | 'account'
  | 'goal'
  | 'savingContribution'
  | 'budget'
  | 'event'
  | 'reminder'
  | 'customCategory'
  | 'disabledCategories'
  | 'preferences'
  | 'excludedRecurring';

export type SyncPushOperation = 'create' | 'update' | 'delete';

export type SyncPushResultStatus = 'applied' | 'duplicate' | 'rejected';

export type SyncChangeOperation = 'upsert' | 'delete';

export interface SyncPushOperationInput {
  operationId: string;
  entityType: SyncEntityType;
  operation: SyncPushOperation;
  entityId: string;
  parentId?: string | null;
  payload?: unknown;
  clientUpdatedAt?: string;
}

export interface SyncPushRequest {
  deviceId: string;
  operations: SyncPushOperationInput[];
}

export interface SyncPushOperationResult {
  operationId: string;
  status: SyncPushResultStatus;
  revision: number | null;
  error: string | null;
}

export interface SyncPushResponse {
  results: SyncPushOperationResult[];
  serverRevision: number;
}

export interface SyncChangeEntry {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncChangeOperation;
  revision: number;
  payload: unknown | null;
  deletedAt: string | null;
}

export interface SyncChangesResponse {
  changes: SyncChangeEntry[];
  serverRevision: number;
  hasMore: boolean;
}

export interface SyncMeta {
  serverRevision: number;
}
