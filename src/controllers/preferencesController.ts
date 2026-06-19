import type { Request, Response } from 'express';
import * as preferencesService from '../services/preferencesService';
import type {
  CreateCustomCategoryInput,
  UpdateCustomCategoryInput,
  UpdatePreferencesInput,
} from '../services/preferencesService';

export async function getPreferences(req: Request, res: Response): Promise<void> {
  const data = await preferencesService.getPreferences(req.auth!.userId);
  res.status(200).json({ data });
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as UpdatePreferencesInput;
  const data = await preferencesService.updatePreferences(req.auth!.userId, body);
  res.status(200).json({ data });
}

export async function getCategories(req: Request, res: Response): Promise<void> {
  const data = await preferencesService.getCategoriesState(req.auth!.userId);
  res.status(200).json({ data });
}

export async function updateDisabledCategories(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as { disabledCategoryKeys: Record<string, boolean> };
  const data = await preferencesService.updateDisabledCategories(
    req.auth!.userId,
    body.disabledCategoryKeys,
  );
  res.status(200).json({ data });
}

export async function createCustomCategory(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateCustomCategoryInput;
  const data = await preferencesService.createCustomCategory(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateCustomCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateCustomCategoryInput;
  const data = await preferencesService.updateCustomCategory(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteCustomCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  await preferencesService.deleteCustomCategory(req.auth!.userId, id);
  res.status(204).send();
}
