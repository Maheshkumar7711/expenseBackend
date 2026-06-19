import type { Request, Response } from 'express';
import * as eventService from '../services/eventService';
import type { CreateEventInput, UpdateEventInput } from '../services/eventService';

export async function listEvents(req: Request, res: Response): Promise<void> {
  const data = await eventService.listEvents(req.auth!.userId);
  res.status(200).json({ data: { events: data } });
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const data = await eventService.getEvent(req.auth!.userId, id);
  res.status(200).json({ data });
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateEventInput;
  const data = await eventService.createEvent(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateEventInput;
  const data = await eventService.updateEvent(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  await eventService.deleteEvent(req.auth!.userId, id);
  res.status(204).send();
}
