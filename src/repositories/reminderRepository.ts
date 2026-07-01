import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import type { ReminderInterval, ReminderRecord } from '../types/domain/reminder';

interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  reminder_date: string;
  reminder_time: string;
  reminder_interval: ReminderInterval;
  created_at: string;
  updated_at: string;
}

function mapReminderRow(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.reminder_date,
    time: row.reminder_time,
    interval: row.reminder_interval,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function listReminders(userId: string): Promise<ReminderRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_date', { ascending: true });

    if (error) wrapDbError(error);
    return (data as ReminderRow[]).map(mapReminderRow);
  });
}

export async function findReminderById(
  userId: string,
  reminderId: string,
): Promise<ReminderRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('id', reminderId)
      .maybeSingle();

    if (error) wrapDbError(error);
    return data ? mapReminderRow(data as ReminderRow) : null;
  });
}

export interface CreateReminderInput {
  id: string;
  userId: string;
  title: string;
  date: string;
  time: string;
  interval: ReminderInterval;
}

export async function createReminder(input: CreateReminderInput): Promise<ReminderRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .insert({
        id: input.id,
        user_id: input.userId,
        title: input.title,
        reminder_date: input.date,
        reminder_time: input.time,
        reminder_interval: input.interval,
      })
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapReminderRow(data as ReminderRow);
  });
}

export interface UpdateReminderInput {
  title?: string;
  date?: string;
  time?: string;
  interval?: ReminderInterval;
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  input: UpdateReminderInput,
): Promise<ReminderRecord> {
  return runSupabaseQuery(async () => {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.date !== undefined) patch.reminder_date = input.date;
    if (input.time !== undefined) patch.reminder_time = input.time;
    if (input.interval !== undefined) patch.reminder_interval = input.interval;

    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', reminderId)
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapReminderRow(data as ReminderRow);
  });
}

export async function deleteReminder(userId: string, reminderId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('reminders')
      .delete()
      .eq('user_id', userId)
      .eq('id', reminderId);

    if (error) wrapDbError(error);
  });
}
