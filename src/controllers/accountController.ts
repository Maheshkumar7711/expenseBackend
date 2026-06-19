import type { Request, Response } from 'express';
import * as accountService from '../services/accountService';
import type { CreateAccountInput, UpdateAccountInput } from '../services/accountService';

export async function listAccounts(req: Request, res: Response): Promise<void> {
  const data = await accountService.listAccounts(req.auth!.userId);
  res.status(200).json({ data });
}

export async function getAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const data = await accountService.getAccount(req.auth!.userId, id);
  res.status(200).json({ data });
}

export async function createAccount(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateAccountInput;
  const data = await accountService.createAccount(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateAccountInput;
  const data = await accountService.updateAccount(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  await accountService.deleteAccount(req.auth!.userId, id);
  res.status(204).send();
}
