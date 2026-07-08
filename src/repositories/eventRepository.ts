import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { runSupabaseQuery } from '../utils/dbRetry';
import { isActiveRow, softDeletePatch } from '../utils/softDelete';
import type { EventRecord } from '../types/domain/event';

interface EventRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

function mapEventRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function listEvents(userId: string): Promise<EventRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin().from('events').select('*').eq('user_id', userId),
    ).order('start_date', { ascending: false });

    if (error) wrapDbError(error);
    return (data as EventRow[]).map(mapEventRow);
  });
}

export async function findEventById(
  userId: string,
  eventId: string,
): Promise<EventRecord | null> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin()
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .eq('id', eventId),
    ).maybeSingle();

    if (error) wrapDbError(error);
    return data ? mapEventRow(data as EventRow) : null;
  });
}

export interface CreateEventInput {
  id: string;
  userId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export async function createEvent(input: CreateEventInput): Promise<EventRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('events')
      .insert({
        id: input.id,
        user_id: input.userId,
        name: input.name,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
      })
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapEventRow(data as EventRow);
  });
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<EventRecord> {
  return runSupabaseQuery(async () => {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.startDate !== undefined) patch.start_date = input.startDate;
    if (input.endDate !== undefined) patch.end_date = input.endDate;

    const { data, error } = await getSupabaseAdmin()
      .from('events')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) wrapDbError(error);
    return mapEventRow(data as EventRow);
  });
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('events')
      .update(softDeletePatch())
      .eq('user_id', userId)
      .eq('id', eventId)
      .filter('deleted_at', 'is', null);

    if (error) wrapDbError(error);
  });
}
