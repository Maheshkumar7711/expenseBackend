import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '../config';
import { InternalServerError } from '../errors';
import { withDbRetry } from '../utils/dbRetry';

const SUPABASE_FETCH_TIMEOUT_MS = 25_000;

let supabaseAdmin: SupabaseClient | undefined;

async function fetchOnceWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);

  const signals = [controller.signal];
  if (init?.signal) {
    signals.push(init.signal);
  }

  const signal =
    typeof AbortSignal.any === 'function'
      ? AbortSignal.any(signals)
      : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Retry transient network failures for every Supabase HTTP call. */
async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<Response> {
  return withDbRetry(() => fetchOnceWithTimeout(input, init));
}

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
      global: {
        fetch: fetchWithTimeout,
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
