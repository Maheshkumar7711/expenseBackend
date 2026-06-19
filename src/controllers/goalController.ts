import type { Request, Response } from 'express';
import * as goalService from '../services/goalService';
import type {
  CreateContributionInput,
  CreateGoalInput,
  UpdateGoalInput,
} from '../services/goalService';

export async function listGoals(req: Request, res: Response): Promise<void> {
  const data = await goalService.listGoals(req.auth!.userId);
  res.status(200).json({ data });
}

export async function getGoal(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const data = await goalService.getGoal(req.auth!.userId, id);
  res.status(200).json({ data });
}

export async function createGoal(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateGoalInput;
  const data = await goalService.createGoal(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateGoal(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateGoalInput;
  const data = await goalService.updateGoal(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteGoal(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  await goalService.deleteGoal(req.auth!.userId, id);
  res.status(204).send();
}

export async function createContribution(req: Request, res: Response): Promise<void> {
  const { goalId } = req.validated!.params as { goalId: string };
  const body = req.validated!.body as CreateContributionInput;
  const data = await goalService.createContribution(req.auth!.userId, goalId, body);
  res.status(201).json({ data });
}

export async function deleteContribution(req: Request, res: Response): Promise<void> {
  const { goalId, contributionId } = req.validated!.params as {
    goalId: string;
    contributionId: string;
  };
  await goalService.deleteContribution(req.auth!.userId, goalId, contributionId);
  res.status(204).send();
}
