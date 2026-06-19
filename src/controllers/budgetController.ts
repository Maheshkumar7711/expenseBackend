import type { Request, Response } from 'express';
import * as budgetService from '../services/budgetService';
import type { CreateBudgetInput, UpdateBudgetInput } from '../services/budgetService';

export async function listBudgets(req: Request, res: Response): Promise<void> {
  const data = await budgetService.listBudgets(req.auth!.userId);
  res.status(200).json({ data });
}

export async function getBudget(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const data = await budgetService.getBudget(req.auth!.userId, id);
  res.status(200).json({ data });
}

export async function createBudget(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateBudgetInput;
  const data = await budgetService.createBudget(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateBudget(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateBudgetInput;
  const data = await budgetService.updateBudget(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteBudget(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const query = req.validated!.query as { period?: string } | undefined;
  await budgetService.deleteBudget(req.auth!.userId, id, query?.period);
  res.status(204).send();
}

export async function addExcludedRecurring(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as { categoryKey: string; period: string };
  await budgetService.addExcludedRecurring(req.auth!.userId, body.categoryKey, body.period);
  res.status(204).send();
}
