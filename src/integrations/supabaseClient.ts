import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '../config';
import { InternalServerError } from '../errors';

let supabaseAdmin: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  const { supabase } = getConfig();

  if (!supabase.url || !supabase.serviceRoleKey) {
    throw new InternalServerError('Supabase is not configured');
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabase.url, supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

export async function checkSupabaseConnection(): Promise<boolean> {
  const { supabase } = getConfig();
  if (!supabase.url || !supabase.serviceRoleKey) {
    return false;
  }

  try {
    const client = getSupabaseAdmin();
    const { error } = await client.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
