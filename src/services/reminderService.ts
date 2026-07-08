import * as reminderRepository from '../repositories/reminderRepository';
import { NotFoundError } from '../errors';
import type { ReminderInterval, ReminderRecord, ReminderResponse } from '../types/domain/reminder';
import { generateId } from '../utils/generateId';
import { ensureUser } from './userService';
import { emitDelete, emitUpsert } from './syncChangeEmitter';

function toReminderResponse(record: ReminderRecord): ReminderResponse {
  return {
    id: record.id,
    title: record.title,
    date: record.date,
    time: record.time,
    interval: record.interval,
    updatedAt: record.updatedAt,
  };
}

export async function listReminders(clerkUserId: string): Promise<ReminderResponse[]> {
  const user = await ensureUser(clerkUserId);
  const reminders = await reminderRepository.listReminders(user.id);
  return reminders.map(toReminderResponse);
}

export async function getReminder(
  clerkUserId: string,
  reminderId: string,
): Promise<ReminderResponse> {
  const user = await ensureUser(clerkUserId);

  const record = await reminderRepository.findReminderById(user.id, reminderId);
  if (!record) {
    throw new NotFoundError('Reminder', reminderId);
  }

  return toReminderResponse(record);
}

export interface CreateReminderInput {
  id?: string;
  title: string;
  date: string;
  time: string;
  interval: ReminderInterval;
}

export async function createReminder(
  clerkUserId: string,
  input: CreateReminderInput,
): Promise<ReminderResponse> {
  const user = await ensureUser(clerkUserId);

  const id = input.id ?? generateId('reminder');
  const existing = await reminderRepository.findReminderById(user.id, id);
  if (existing) {
    return toReminderResponse(existing);
  }

  const record = await reminderRepository.createReminder({
    id,
    userId: user.id,
    title: input.title,
    date: input.date,
    time: input.time,
    interval: input.interval,
  });

  const response = toReminderResponse(record);
  await emitUpsert(user.id, 'reminder', response.id, response);
  return response;
}

export interface UpdateReminderInput {
  title?: string;
  date?: string;
  time?: string;
  interval?: ReminderInterval;
}

export async function updateReminder(
  clerkUserId: string,
  reminderId: string,
  input: UpdateReminderInput,
): Promise<ReminderResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await reminderRepository.findReminderById(user.id, reminderId);
  if (!existing) {
    throw new NotFoundError('Reminder', reminderId);
  }

  const record = await reminderRepository.updateReminder(user.id, reminderId, input);
  const response = toReminderResponse(record);
  await emitUpsert(user.id, 'reminder', response.id, response);
  return response;
}

export async function deleteReminder(clerkUserId: string, reminderId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await reminderRepository.findReminderById(user.id, reminderId);
  if (!existing) {
    throw new NotFoundError('Reminder', reminderId);
  }

  await reminderRepository.deleteReminder(user.id, reminderId);
  await emitDelete(user.id, 'reminder', reminderId);
}
