import * as goalRepository from '../repositories/goalRepository';
import { NotFoundError } from '../errors';
import type {
  GoalRecord,
  GoalResponse,
  GoalsListResponse,
  SavingTransactionRecord,
  SavingTransactionResponse,
} from '../types/domain/goal';
import { generateId } from '../utils/generateId';
import { ensureUser } from './userService';
import { emitDelete, emitUpsert } from './syncChangeEmitter';

function toGoalResponse(record: GoalRecord): GoalResponse {
  const response: GoalResponse = {
    id: record.id,
    name: record.name,
    targetDate: record.targetDate,
    targetAmount: record.targetAmount,
    savedAmount: record.savedAmount,
    iconKey: record.iconKey,
    tags: record.tags,
    updatedAt: record.updatedAt,
  };
  if (record.achieved) {
    response.achieved = true;
  }
  return response;
}

function toSavingResponse(record: SavingTransactionRecord): SavingTransactionResponse {
  return {
    id: record.id,
    goalId: record.goalId,
    amount: record.amount,
    date: record.date,
    sourceAccountKey: record.sourceAccountKey,
    updatedAt: record.updatedAt,
  };
}

export async function listGoals(clerkUserId: string): Promise<GoalsListResponse> {
  const user = await ensureUser(clerkUserId);

  const [goals, savingTransactions] = await Promise.all([
    goalRepository.listGoals(user.id),
    goalRepository.listSavingTransactions(user.id),
  ]);

  return {
    goals: goals.map(toGoalResponse),
    savingTransactions: savingTransactions.map(toSavingResponse),
  };
}

export async function getGoal(clerkUserId: string, goalId: string): Promise<GoalResponse> {
  const user = await ensureUser(clerkUserId);

  const record = await goalRepository.findGoalById(user.id, goalId);
  if (!record) {
    throw new NotFoundError('Goal', goalId);
  }

  return toGoalResponse(record);
}

export interface CreateGoalInput {
  id?: string;
  name: string;
  targetDate: string;
  targetAmount: number;
  savedAmount?: number;
  iconKey: string;
  tags?: string[];
  achieved?: boolean;
}

export async function createGoal(
  clerkUserId: string,
  input: CreateGoalInput,
): Promise<GoalResponse> {
  const user = await ensureUser(clerkUserId);

  const id = input.id ?? generateId('goal');
  const existing = await goalRepository.findGoalById(user.id, id);
  if (existing) {
    return toGoalResponse(existing);
  }

  const record = await goalRepository.createGoal({
    id,
    userId: user.id,
    name: input.name,
    targetDate: input.targetDate,
    targetAmount: input.targetAmount,
    savedAmount: input.savedAmount,
    iconKey: input.iconKey,
    tags: input.tags,
    achieved: input.achieved,
  });

  const response = toGoalResponse(record);
  await emitUpsert(user.id, 'goal', response.id, response);
  return response;
}

export interface UpdateGoalInput {
  name?: string;
  targetDate?: string;
  targetAmount?: number;
  savedAmount?: number;
  iconKey?: string;
  tags?: string[];
  achieved?: boolean;
}

export async function updateGoal(
  clerkUserId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<GoalResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await goalRepository.findGoalById(user.id, goalId);
  if (!existing) {
    throw new NotFoundError('Goal', goalId);
  }

  const record = await goalRepository.updateGoal(user.id, goalId, input);
  const response = toGoalResponse(record);
  await emitUpsert(user.id, 'goal', response.id, response);
  return response;
}

export async function deleteGoal(clerkUserId: string, goalId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await goalRepository.findGoalById(user.id, goalId);
  if (!existing) {
    throw new NotFoundError('Goal', goalId);
  }

  await goalRepository.deleteGoal(user.id, goalId);
  await emitDelete(user.id, 'goal', goalId);
}

export interface CreateContributionInput {
  id?: string;
  amount: number;
  date: string;
  sourceAccountKey: string;
}

export async function createContribution(
  clerkUserId: string,
  goalId: string,
  input: CreateContributionInput,
): Promise<SavingTransactionResponse> {
  const user = await ensureUser(clerkUserId);

  const goal = await goalRepository.findGoalById(user.id, goalId);
  if (!goal) {
    throw new NotFoundError('Goal', goalId);
  }

  const id = input.id ?? generateId('saving');
  const existing = await goalRepository.findSavingTransactionById(user.id, id);
  if (existing) {
    return toSavingResponse(existing);
  }

  const record = await goalRepository.createSavingTransaction({
    id,
    userId: user.id,
    goalId,
    amount: input.amount,
    date: input.date,
    sourceAccountKey: input.sourceAccountKey,
  });

  await goalRepository.updateGoal(user.id, goalId, {
    savedAmount: goal.savedAmount + input.amount,
  });

  const response = toSavingResponse(record);
  await emitUpsert(user.id, 'savingContribution', response.id, response);
  const goalResponse = toGoalResponse(
    (await goalRepository.findGoalById(user.id, goalId))!,
  );
  await emitUpsert(user.id, 'goal', goalResponse.id, goalResponse);
  return response;
}

export async function deleteContribution(
  clerkUserId: string,
  goalId: string,
  contributionId: string,
): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const goal = await goalRepository.findGoalById(user.id, goalId);
  if (!goal) {
    throw new NotFoundError('Goal', goalId);
  }

  const deleted = await goalRepository.deleteSavingTransaction(user.id, contributionId);
  if (!deleted || deleted.goalId !== goalId) {
    throw new NotFoundError('Saving transaction', contributionId);
  }

  await goalRepository.updateGoal(user.id, goalId, {
    savedAmount: Math.max(0, goal.savedAmount - deleted.amount),
  });

  await emitDelete(user.id, 'savingContribution', contributionId);
  const goalResponse = toGoalResponse(
    (await goalRepository.findGoalById(user.id, goalId))!,
  );
  await emitUpsert(user.id, 'goal', goalResponse.id, goalResponse);
}
