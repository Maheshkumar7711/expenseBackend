/**
 * Initialize user_sync_state for all users (revision 0).
 * Does not backfill historical change_log rows — clients bootstrap on first v2 sync.
 * Run after migration 010: npx tsx scripts/backfill-change-log.ts
 */
import { getSupabaseAdmin } from '../src/integrations/supabaseClient';

async function main(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: users, error } = await supabase.from('users').select('id');

  if (error) {
    console.error('Failed to list users:', error.message);
    process.exit(1);
  }

  for (const user of users ?? []) {
    const { error: upsertError } = await supabase.from('user_sync_state').upsert(
      { user_id: user.id, server_revision: 0, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    if (upsertError) {
      console.warn(`user_sync_state upsert failed for ${user.id}:`, upsertError.message);
    }
  }

  console.log(`Initialized user_sync_state for ${users?.length ?? 0} users`);
}

void main();
