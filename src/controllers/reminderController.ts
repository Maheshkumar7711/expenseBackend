import type { Request, Response } from 'express';
import * as reminderService from '../services/reminderService';
import type { CreateReminderInput, UpdateReminderInput } from '../services/reminderService';

export async function listReminders(req: Request, res: Response): Promise<void> {
  const data = await reminderService.listReminders(req.auth!.userId);
  res.status(200).json({ data: { reminders: data } });
}

export async function getReminder(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const data = await reminderService.getReminder(req.auth!.userId, id);
  res.status(200).json({ data });
}

export async function createReminder(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateReminderInput;
  const data = await reminderService.createReminder(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateReminder(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateReminderInput;
  const data = await reminderService.updateReminder(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteReminder(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  await reminderService.deleteReminder(req.auth!.userId, id);
  res.status(204).send();
}
