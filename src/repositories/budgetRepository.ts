import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import type { BudgetRecord, ExcludedRecurringRecord } from '../types/domain/budget';

interface BudgetRow {
  id: string;
  user_id: string;
  category_key: string;
  amount: number | string;
  month_only: boolean;
  period: string | null;
  created_at: string;
  updated_at: string;
}

interface ExcludedRow {
  user_id: string;
  category_key: string;
  period: string;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function mapBudgetRow(row: BudgetRow): BudgetRecord {
  return {
    id: row.id,
    userId: row.user_id,
    categoryKey: row.category_key,
    amount: toNumber(row.amount),
    monthOnly: row.month_only,
    period: row.period,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function listBudgets(userId: string): Promise<BudgetRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) wrapDbError(error);
    return (data as BudgetRow[]).map(mapBudgetRow);
  });
}

export async function findBudgetById(
  userId: string,
  budgetId: string,
): Promise<BudgetRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('id', budgetId)
      .maybeSingle();

    if (error) wrapDbError(error);
    return data ? mapBudgetRow(data as BudgetRow) : null;
  });
}

export async function listExcludedRecurring(
  userId: string,
): Promise<ExcludedRecurringRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('budget_excluded_recurring')
      .select('*')
      .eq('user_id', userId);

    if (error) wrapDbError(error);
    return (data as ExcludedRow[]).map((row) => ({
      userId: row.user_id,
      categoryKey: row.category_key,
      period: row.period,
    }));
  });
}

export interface CreateBudgetInput {
  id: string;
  userId: string;
  categoryKey: string;
  amount: number;
  monthOnly: boolean;
  period?: string | null;
}

export async function createBudget(input: CreateBudgetInput): Promise<BudgetRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('budgets')
      .insert({
        id: input.id,
        user_id: input.userId,
        category_key: input.categoryKey,
        amount: input.amount,
        month_only: input.monthOnly,
        period: input.period ?? null,
      })
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapBudgetRow(data as BudgetRow);
  });
}

export interface UpdateBudgetInput {
  categoryKey?: string;
  amount?: number;
  monthOnly?: boolean;
  period?: string | null;
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput,
): Promise<BudgetRecord> {
  return runSupabaseQuery(async () => {
    const patch: Record<string, unknown> = {};
    if (input.categoryKey !== undefined) patch.category_key = input.categoryKey;
    if (input.amount !== undefined) patch.amount = input.amount;
    if (input.monthOnly !== undefined) patch.month_only = input.monthOnly;
    if (input.period !== undefined) patch.period = input.period;

    const { data, error } = await getSupabaseAdmin()
      .from('budgets')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', budgetId)
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapBudgetRow(data as BudgetRow);
  });
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .eq('id', budgetId);

    if (error) wrapDbError(error);
  });
}

export async function deleteBudgetsByCategoryAndPeriod(
  userId: string,
  categoryKey: string,
  period: string,
  monthOnly: boolean,
): Promise<void> {
  return runSupabaseQuery(async () => {
    let query = getSupabaseAdmin()
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .eq('category_key', categoryKey);

    if (monthOnly) {
      query = query.eq('month_only', true).eq('period', period);
    } else {
      query = query.eq('month_only', false);
    }

    const { error } = await query;
    if (error) wrapDbError(error);
  });
}

export async function deleteRecurringBudgetsForCategory(
  userId: string,
  categoryKey: string,
): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .eq('category_key', categoryKey)
      .eq('month_only', false);

    if (error) wrapDbError(error);
  });
}

export async function clearExcludedRecurringForCategory(
  userId: string,
  categoryKey: string,
): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('budget_excluded_recurring')
      .delete()
      .eq('user_id', userId)
      .eq('category_key', categoryKey);

    if (error) wrapDbError(error);
  });
}

export async function upsertExcludedRecurring(
  userId: string,
  categoryKey: string,
  period: string,
): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('budget_excluded_recurring')
      .upsert(
        { user_id: userId, category_key: categoryKey, period },
        { onConflict: 'user_id,category_key,period' },
      );

    if (error) wrapDbError(error);
  });
}
