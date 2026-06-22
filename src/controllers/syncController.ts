import type { Request, Response } from 'express';
import * as syncService from '../services/syncService';

export async function getBootstrapSync(req: Request, res: Response): Promise<void> {
  const data = await syncService.getBootstrapSync(req.auth!.userId);
  res.status(200).json({ data });
}
