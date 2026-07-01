import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

/** Deletes all domain data for a user. The users row is preserved. */
export async function deleteAllUserData(userId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const supabase = getSupabaseAdmin();

    const tables = [
      'transactions',
      'budget_excluded_recurring',
      'budgets',
      'events',
      'reminders',
      'custom_categories',
      'goals',
      'deleted_account_names',
      'accounts',
      'user_preferences',
    ] as const;

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) {
        wrapDbError(error);
      }
    }
  });
}
