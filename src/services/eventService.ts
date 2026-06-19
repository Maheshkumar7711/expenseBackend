import * as eventRepository from '../repositories/eventRepository';
import { NotFoundError } from '../errors';
import type { EventRecord, EventResponse } from '../types/domain/event';
import { generateId } from '../utils/generateId';
import { ensureUser } from './userService';

function toEventResponse(record: EventRecord): EventResponse {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    startDate: record.startDate,
    endDate: record.endDate,
  };
}

export async function listEvents(clerkUserId: string): Promise<EventResponse[]> {
  const user = await ensureUser(clerkUserId);
  const events = await eventRepository.listEvents(user.id);
  return events.map(toEventResponse);
}

export async function getEvent(clerkUserId: string, eventId: string): Promise<EventResponse> {
  const user = await ensureUser(clerkUserId);

  const record = await eventRepository.findEventById(user.id, eventId);
  if (!record) {
    throw new NotFoundError('Event', eventId);
  }

  return toEventResponse(record);
}

export interface CreateEventInput {
  id?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export async function createEvent(
  clerkUserId: string,
  input: CreateEventInput,
): Promise<EventResponse> {
  const user = await ensureUser(clerkUserId);

  const id = input.id ?? generateId('event');
  const existing = await eventRepository.findEventById(user.id, id);
  if (existing) {
    return toEventResponse(existing);
  }

  const record = await eventRepository.createEvent({
    id,
    userId: user.id,
    name: input.name,
    description: input.description ?? '',
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return toEventResponse(record);
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export async function updateEvent(
  clerkUserId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<EventResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await eventRepository.findEventById(user.id, eventId);
  if (!existing) {
    throw new NotFoundError('Event', eventId);
  }

  const record = await eventRepository.updateEvent(user.id, eventId, input);
  return toEventResponse(record);
}

export async function deleteEvent(clerkUserId: string, eventId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await eventRepository.findEventById(user.id, eventId);
  if (!existing) {
    throw new NotFoundError('Event', eventId);
  }

  await eventRepository.deleteEvent(user.id, eventId);
}
