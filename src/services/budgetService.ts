import * as budgetRepository from '../repositories/budgetRepository';
import { NotFoundError } from '../errors';
import type { BudgetRecord, BudgetResponse, BudgetsListResponse } from '../types/domain/budget';
import { generateId } from '../utils/generateId';
import { ensureUser } from './userService';
import { emitDelete, emitUpsert } from './syncChangeEmitter';

function excludedRecurringEntityId(categoryKey: string, period: string): string {
  return `${categoryKey}:${period}`;
}

/** Clear DB exclusions for a category and emit sync deletes so other devices drop stale entries. */
async function clearExcludedRecurringForCategoryWithSync(
  userId: string,
  categoryKey: string,
): Promise<void> {
  const excluded = await budgetRepository.listExcludedRecurring(userId);
  const toClear = excluded.filter((entry) => entry.categoryKey === categoryKey);
  if (toClear.length === 0) {
    return;
  }

  await budgetRepository.clearExcludedRecurringForCategory(userId, categoryKey);

  for (const entry of toClear) {
    await emitDelete(
      userId,
      'excludedRecurring',
      excludedRecurringEntityId(entry.categoryKey, entry.period),
    );
  }
}

function toBudgetResponse(record: BudgetRecord): BudgetResponse {
  const response: BudgetResponse = {
    id: record.id,
    categoryKey: record.categoryKey,
    amount: record.amount,
    monthOnly: record.monthOnly,
    updatedAt: record.updatedAt,
  };
  if (record.period) {
    response.period = record.period;
  }
  return response;
}

export async function listBudgets(clerkUserId: string): Promise<BudgetsListResponse> {
  const user = await ensureUser(clerkUserId);

  const [budgets, excluded] = await Promise.all([
    budgetRepository.listBudgets(user.id),
    budgetRepository.listExcludedRecurring(user.id),
  ]);

  return {
    budgets: budgets.map(toBudgetResponse),
    excludedRecurring: excluded.map((entry) => ({
      categoryKey: entry.categoryKey,
      period: entry.period,
    })),
  };
}

export async function getBudget(clerkUserId: string, budgetId: string): Promise<BudgetResponse> {
  const user = await ensureUser(clerkUserId);

  const record = await budgetRepository.findBudgetById(user.id, budgetId);
  if (!record) {
    throw new NotFoundError('Budget', budgetId);
  }

  return toBudgetResponse(record);
}

export interface CreateBudgetInput {
  id?: string;
  categoryKey: string;
  amount: number;
  monthOnly: boolean;
  period?: string;
}

export async function createBudget(
  clerkUserId: string,
  input: CreateBudgetInput,
): Promise<BudgetResponse> {
  const user = await ensureUser(clerkUserId);

  const period = input.period ?? new Date().toISOString().slice(0, 7);

  if (input.monthOnly) {
    await budgetRepository.deleteBudgetsByCategoryAndPeriod(
      user.id,
      input.categoryKey,
      period,
      true,
    );
  } else {
    await budgetRepository.deleteRecurringBudgetsForCategory(user.id, input.categoryKey);
    await clearExcludedRecurringForCategoryWithSync(user.id, input.categoryKey);
  }

  const record = await budgetRepository.createBudget({
    id: input.id ?? generateId('budget'),
    userId: user.id,
    categoryKey: input.categoryKey,
    amount: input.amount,
    monthOnly: input.monthOnly,
    period,
  });

  const response = toBudgetResponse(record);
  await emitUpsert(user.id, 'budget', response.id, response);
  return response;
}

export interface UpdateBudgetInput {
  categoryKey?: string;
  amount?: number;
  monthOnly?: boolean;
  period?: string | null;
}

export async function updateBudget(
  clerkUserId: string,
  budgetId: string,
  input: UpdateBudgetInput,
): Promise<BudgetResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await budgetRepository.findBudgetById(user.id, budgetId);
  if (!existing) {
    throw new NotFoundError('Budget', budgetId);
  }

  const record = await budgetRepository.updateBudget(user.id, budgetId, input);
  const response = toBudgetResponse(record);
  await emitUpsert(user.id, 'budget', response.id, response);
  return response;
}

export async function deleteBudget(
  clerkUserId: string,
  budgetId: string,
  periodStr?: string,
): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await budgetRepository.findBudgetById(user.id, budgetId);
  if (!existing) {
    throw new NotFoundError('Budget', budgetId);
  }

  const period = periodStr ?? new Date().toISOString().slice(0, 7);

  if (existing.monthOnly) {
    await budgetRepository.deleteBudget(user.id, budgetId);
    await emitDelete(user.id, 'budget', budgetId);
    await budgetRepository.upsertExcludedRecurring(
      user.id,
      existing.categoryKey,
      period,
    );
    await emitUpsert(user.id, 'excludedRecurring', excludedRecurringEntityId(existing.categoryKey, period), {
      categoryKey: existing.categoryKey,
      period,
    });
  } else {
    await budgetRepository.upsertExcludedRecurring(
      user.id,
      existing.categoryKey,
      period,
    );
    await emitUpsert(user.id, 'excludedRecurring', excludedRecurringEntityId(existing.categoryKey, period), {
      categoryKey: existing.categoryKey,
      period,
    });
  }
}

export async function addExcludedRecurring(
  clerkUserId: string,
  categoryKey: string,
  period: string,
): Promise<void> {
  const user = await ensureUser(clerkUserId);
  await budgetRepository.upsertExcludedRecurring(user.id, categoryKey, period);
  await emitUpsert(user.id, 'excludedRecurring', excludedRecurringEntityId(categoryKey, period), {
    categoryKey,
    period,
  });
}
