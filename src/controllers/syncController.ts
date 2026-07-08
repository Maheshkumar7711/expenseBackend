import type { Request, Response } from 'express';
import * as syncService from '../services/syncService';
import * as syncPullService from '../services/syncPullService';
import * as syncPushService from '../services/syncPushService';
import { ensureUser } from '../services/userService';
import type { SyncPushRequest } from '../types/domain/sync';

export async function getBootstrapSync(req: Request, res: Response): Promise<void> {
  const data = await syncService.getBootstrapSync(req.auth!.userId);
  res.status(200).json({ data });
}

export async function getSyncChanges(req: Request, res: Response): Promise<void> {
  const { since, limit } = req.validated!.query as { since: number; limit?: number };
  const user = await ensureUser(req.auth!.userId);
  const data = await syncPullService.getChangesSince(req.auth!.userId, user.id, since, limit);
  res.status(200).json({ data });
}

export async function postSyncPush(req: Request, res: Response): Promise<void> {
  const body = req.validated!.body as SyncPushRequest;
  const data = await syncPushService.pushSyncBatch(req.auth!.userId, body);
  res.status(200).json({ data });
}
