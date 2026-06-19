import type { Request, Response } from 'express';
import * as transactionService from '../services/transactionService';
import type {
  CreateTransactionInput,
  ListTransactionsInput,
  UpdateTransactionInput,
} from '../services/transactionService';
import { parseLimit } from '../utils/pagination';

export async function listTransactions(req: Request, res: Response): Promise<void> {
  const query = req.validated!.query as ListTransactionsInput & { limit?: number };
  const { transactions, meta } = await transactionService.listTransactions(req.auth!.userId, {
    ...query,
    limit: parseLimit(query.limit),
  });
  res.status(200).json({ data: { transactions }, meta });
}

export async function getTransaction(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const data = await transactionService.getTransaction(req.auth!.userId, id);
  res.status(200).json({ data });
}

export async function createTransaction(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as CreateTransactionInput;
  const data = await transactionService.createTransaction(req.auth!.userId, body);
  res.status(201).json({ data });
}

export async function updateTransaction(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  const body = req.validated!.body as UpdateTransactionInput;
  const data = await transactionService.updateTransaction(req.auth!.userId, id, body);
  res.status(200).json({ data });
}

export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  const { id } = req.validated!.params as { id: string };
  await transactionService.deleteTransaction(req.auth!.userId, id);
  res.status(204).send();
}
