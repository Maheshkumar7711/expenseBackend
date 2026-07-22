import * as processedOperationsRepository from '../repositories/processedOperationsRepository';
import * as changeLogService from './changeLogService';
import * as accountService from './accountService';
import * as transactionService from './transactionService';
import * as budgetService from './budgetService';
import * as goalService from './goalService';
import * as eventService from './eventService';
import * as reminderService from './reminderService';
import * as preferencesService from './preferencesService';
import { ensureUser } from './userService';
import type {
  SyncPushOperationInput,
  SyncPushOperationResult,
  SyncPushRequest,
  SyncPushResponse,
  SyncPushResultStatus,
} from '../types/domain/sync';
import type { CreateAccountInput, UpdateAccountInput } from './accountService';
import type { CreateTransactionInput, UpdateTransactionInput } from './transactionService';

function parseClientMs(clientUpdatedAt?: string): number {
  if (!clientUpdatedAt) {
    return 0;
  }
  const ms = Date.parse(clientUpdatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

function parseServerMs(updatedAt?: string): number {
  if (!updatedAt) {
    return 0;
  }
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

function isClientStale(clientUpdatedAt: string | undefined, serverUpdatedAt: string | undefined): boolean {
  const clientMs = parseClientMs(clientUpdatedAt);
  const serverMs = parseServerMs(serverUpdatedAt);
  if (clientMs === 0 || serverMs === 0) {
    return false;
  }
  return clientMs < serverMs;
}

async function latestRevision(userId: string): Promise<number> {
  return changeLogService.getServerRevision(userId);
}

async function applyOperation(
  clerkUserId: string,
  userId: string,
  op: SyncPushOperationInput,
): Promise<{ status: SyncPushResultStatus; revision: number | null; error: string | null }> {
  const payload = op.payload;

  switch (op.entityType) {
    case 'transaction': {
      if (op.operation === 'create') {
        const created = await transactionService.createTransaction(
          clerkUserId,
          payload as unknown as CreateTransactionInput,
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        const updated = await transactionService.updateTransaction(
          clerkUserId,
          op.entityId,
          payload as unknown as UpdateTransactionInput,
        );
        if (isClientStale(op.clientUpdatedAt, updated.updatedAt)) {
          return { status: 'rejected', revision: null, error: 'Stale client revision' };
        }
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      await transactionService.deleteTransaction(clerkUserId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'account': {
      if (op.operation === 'create') {
        const created = await accountService.createAccount(
          clerkUserId,
          payload as unknown as CreateAccountInput,
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        try {
          const updated = await accountService.updateAccount(
            clerkUserId,
            op.entityId,
            payload as unknown as UpdateAccountInput,
          );
          const revision = await latestRevision(userId);
          return { status: 'applied', revision, error: null };
        } catch {
          const created = await accountService.createAccount(
            clerkUserId,
            { ...(payload as unknown as CreateAccountInput), id: op.entityId },
          );
          const revision = await latestRevision(userId);
          return { status: 'applied', revision, error: null };
        }
      }
      await accountService.deleteAccount(clerkUserId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'goal': {
      if (op.operation === 'create') {
        const created = await goalService.createGoal(clerkUserId, payload as Parameters<typeof goalService.createGoal>[1]);
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        const updated = await goalService.updateGoal(
          clerkUserId,
          op.entityId,
          payload as Parameters<typeof goalService.updateGoal>[2],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      await goalService.deleteGoal(clerkUserId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'savingContribution': {
      const goalId = op.parentId;
      if (!goalId) {
        return { status: 'rejected', revision: null, error: 'parentId required' };
      }
      if (op.operation === 'create') {
        const created = await goalService.createContribution(
          clerkUserId,
          goalId,
          payload as Parameters<typeof goalService.createContribution>[2],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      await goalService.deleteContribution(clerkUserId, goalId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'budget': {
      if (op.operation === 'create') {
        const created = await budgetService.createBudget(
          clerkUserId,
          payload as Parameters<typeof budgetService.createBudget>[1],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        const updated = await budgetService.updateBudget(
          clerkUserId,
          op.entityId,
          payload as Parameters<typeof budgetService.updateBudget>[2],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      const deletePayload = payload as { period?: string } | undefined;
      await budgetService.deleteBudget(clerkUserId, op.entityId, deletePayload?.period);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'event': {
      if (op.operation === 'create') {
        const created = await eventService.createEvent(clerkUserId, payload as Parameters<typeof eventService.createEvent>[1]);
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        const updated = await eventService.updateEvent(
          clerkUserId,
          op.entityId,
          payload as Parameters<typeof eventService.updateEvent>[2],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      await eventService.deleteEvent(clerkUserId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'reminder': {
      if (op.operation === 'create') {
        const created = await reminderService.createReminder(
          clerkUserId,
          payload as Parameters<typeof reminderService.createReminder>[1],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        const updated = await reminderService.updateReminder(
          clerkUserId,
          op.entityId,
          payload as Parameters<typeof reminderService.updateReminder>[2],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      await reminderService.deleteReminder(clerkUserId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'customCategory': {
      if (op.operation === 'create') {
        await preferencesService.createCustomCategory(
          clerkUserId,
          payload as Parameters<typeof preferencesService.createCustomCategory>[1],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      if (op.operation === 'update') {
        await preferencesService.updateCustomCategory(
          clerkUserId,
          op.entityId,
          payload as Parameters<typeof preferencesService.updateCustomCategory>[2],
        );
        const revision = await latestRevision(userId);
        return { status: 'applied', revision, error: null };
      }
      await preferencesService.deleteCustomCategory(clerkUserId, op.entityId);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'disabledCategories': {
      const updated = await preferencesService.updateDisabledCategories(
        clerkUserId,
        payload as Record<string, boolean>,
      );
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'preferences': {
      const updated = await preferencesService.updatePreferences(
        clerkUserId,
        payload as Parameters<typeof preferencesService.updatePreferences>[1],
      );
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    case 'excludedRecurring': {
      const p = payload as { categoryKey: string; period: string };
      await budgetService.addExcludedRecurring(clerkUserId, p.categoryKey, p.period);
      const revision = await latestRevision(userId);
      return { status: 'applied', revision, error: null };
    }
    default:
      return { status: 'rejected', revision: null, error: `Unknown entity type` };
  }
}

export async function pushSyncBatch(
  clerkUserId: string,
  request: SyncPushRequest,
): Promise<SyncPushResponse> {
  const user = await ensureUser(clerkUserId);
  await changeLogService.ensureUserSyncState(user.id);

  const results: SyncPushOperationResult[] = [];

  for (const op of request.operations) {
    const existing = await processedOperationsRepository.findProcessedOperation(
      user.id,
      op.operationId,
    );

    if (existing) {
      results.push({
        operationId: op.operationId,
        status: 'duplicate',
        revision: existing.serverRevision,
        error: null,
      });
      continue;
    }

    try {
      const outcome = await applyOperation(clerkUserId, user.id, op);
      await processedOperationsRepository.recordProcessedOperation({
        userId: user.id,
        operationId: op.operationId,
        entityType: op.entityType,
        entityId: op.entityId,
        resultStatus: outcome.status,
        serverRevision: outcome.revision,
      });
      results.push({
        operationId: op.operationId,
        status: outcome.status,
        revision: outcome.revision,
        error: outcome.error,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      await processedOperationsRepository.recordProcessedOperation({
        userId: user.id,
        operationId: op.operationId,
        entityType: op.entityType,
        entityId: op.entityId,
        resultStatus: 'rejected',
        serverRevision: null,
      });
      results.push({
        operationId: op.operationId,
        status: 'rejected',
        revision: null,
        error: message,
      });
    }
  }

  const serverRevision = await changeLogService.getServerRevision(user.id);
  return { results, serverRevision };
}
