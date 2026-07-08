import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import { isActiveRow, softDeletePatch } from '../utils/softDelete';
import type { GoalRecord, SavingTransactionRecord } from '../types/domain/goal';

interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  target_date: string;
  target_amount: number | string;
  saved_amount: number | string;
  icon_key: string;
  tags: string[];
  achieved: boolean;
  created_at: string;
  updated_at: string;
}

interface SavingTransactionRow {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number | string;
  date: string;
  source_account_key: string;
  created_at: string;
  updated_at: string;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function mapGoalRow(row: GoalRow): GoalRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetDate: row.target_date,
    targetAmount: toNumber(row.target_amount),
    savedAmount: toNumber(row.saved_amount),
    iconKey: row.icon_key,
    tags: Array.isArray(row.tags) ? row.tags : [],
    achieved: row.achieved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSavingRow(row: SavingTransactionRow): SavingTransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    amount: toNumber(row.amount),
    date: row.date,
    sourceAccountKey: row.source_account_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function listGoals(userId: string): Promise<GoalRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin().from('goals').select('*').eq('user_id', userId),
    ).order('created_at', { ascending: true });

    if (error) wrapDbError(error);
    return (data as GoalRow[]).map(mapGoalRow);
  });
}

export async function findGoalById(
  userId: string,
  goalId: string,
): Promise<GoalRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin()
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('id', goalId),
    ).maybeSingle();

    if (error) wrapDbError(error);
    return data ? mapGoalRow(data as GoalRow) : null;
  });
}

export async function listSavingTransactions(
  userId: string,
): Promise<SavingTransactionRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin().from('saving_transactions').select('*').eq('user_id', userId),
    ).order('date', { ascending: false });

    if (error) wrapDbError(error);
    return (data as SavingTransactionRow[]).map(mapSavingRow);
  });
}

export async function findSavingTransactionById(
  userId: string,
  savingTransactionId: string,
): Promise<SavingTransactionRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin()
        .from('saving_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('id', savingTransactionId),
    ).maybeSingle();

    if (error) wrapDbError(error);
    if (!data) return null;
    return mapSavingRow(data as SavingTransactionRow);
  });
}

export interface CreateGoalInput {
  id: string;
  userId: string;
  name: string;
  targetDate: string;
  targetAmount: number;
  savedAmount?: number;
  iconKey: string;
  tags?: string[];
  achieved?: boolean;
}

export async function createGoal(input: CreateGoalInput): Promise<GoalRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('goals')
      .insert({
        id: input.id,
        user_id: input.userId,
        name: input.name,
        target_date: input.targetDate,
        target_amount: input.targetAmount,
        saved_amount: input.savedAmount ?? 0,
        icon_key: input.iconKey,
        tags: input.tags ?? [],
        achieved: input.achieved ?? false,
      })
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapGoalRow(data as GoalRow);
  });
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
  userId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<GoalRecord> {
  return runSupabaseQuery(async () => {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.targetDate !== undefined) patch.target_date = input.targetDate;
    if (input.targetAmount !== undefined) patch.target_amount = input.targetAmount;
    if (input.savedAmount !== undefined) patch.saved_amount = input.savedAmount;
    if (input.iconKey !== undefined) patch.icon_key = input.iconKey;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.achieved !== undefined) patch.achieved = input.achieved;

    const { data, error } = await getSupabaseAdmin()
      .from('goals')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', goalId)
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapGoalRow(data as GoalRow);
  });
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('goals')
      .update(softDeletePatch())
      .eq('user_id', userId)
      .eq('id', goalId)
      .filter('deleted_at', 'is', null);

    if (error) wrapDbError(error);
  });
}

export interface CreateSavingTransactionInput {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  date: string;
  sourceAccountKey: string;
}

export async function createSavingTransaction(
  input: CreateSavingTransactionInput,
): Promise<SavingTransactionRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('saving_transactions')
      .insert({
        id: input.id,
        user_id: input.userId,
        goal_id: input.goalId,
        amount: input.amount,
        date: input.date,
        source_account_key: input.sourceAccountKey,
      })
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapSavingRow(data as SavingTransactionRow);
  });
}

export async function deleteSavingTransaction(
  userId: string,
  contributionId: string,
): Promise<SavingTransactionRecord | null> {
  return runSupabaseQuery(async () => {
    const { data: existing, error: findError } = await isActiveRow(
      getSupabaseAdmin()
        .from('saving_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('id', contributionId),
    ).maybeSingle();

    if (findError) wrapDbError(findError);
    if (!existing) return null;

    const { error } = await getSupabaseAdmin()
      .from('saving_transactions')
      .update(softDeletePatch())
      .eq('user_id', userId)
      .eq('id', contributionId)
      .filter('deleted_at', 'is', null);

    if (error) wrapDbError(error);
    return mapSavingRow(existing as SavingTransactionRow);
  });
}
