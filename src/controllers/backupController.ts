import type { Request, Response } from 'express';
import * as backupService from '../services/backupService';

export async function getCurrentBackup(req: Request, res: Response): Promise<void> {
  const data = await backupService.getCurrentBackupMeta(req.auth!.userId);
  res.status(200).json({ data });
}

export async function createBackup(req: Request, res: Response): Promise<void> {
  const data = await backupService.createOrReplaceBackup(req.auth!.userId);
  res.status(200).json({ data });
}

export async function restoreBackup(req: Request, res: Response): Promise<void> {
  const data = await backupService.restoreCurrentBackup(req.auth!.userId);
  res.status(200).json({ data });
}

export async function deleteBackup(req: Request, res: Response): Promise<void> {
  await backupService.deleteCurrentBackup(req.auth!.userId);
  res.status(204).send();
}
