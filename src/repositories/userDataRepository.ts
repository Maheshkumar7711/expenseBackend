import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

async function deleteRowsForUser(
  supabase: SupabaseClient,
  table: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) {
    wrapDbError(error);
  }
}

/** FK-safe order: children before parents. One table at a time to avoid Supabase connection overload. */
const USER_DATA_TABLES = [
  'transactions',
  'saving_transactions',
  'budget_excluded_recurring',
  'events',
  'reminders',
  'custom_categories',
  'deleted_account_names',
  'budgets',
  'goals',
  'accounts',
  'user_preferences',
] as const;

/** Deletes all domain data for a user. The users row is preserved. */
export async function deleteAllUserData(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const table of USER_DATA_TABLES) {
    await runSupabaseQuery(() => deleteRowsForUser(supabase, table, userId));
  }
}
