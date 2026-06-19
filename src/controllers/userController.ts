import type { Request, Response } from 'express';
import * as userService from '../services/userService';
import type { UpdateProfileInput } from '../services/userService';

export async function getMe(req: Request, res: Response): Promise<void> {
  const me = await userService.getMe(req.auth!.userId);
  res.status(200).json({ data: me });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const body = req.validated?.body as UpdateProfileInput;
  const me = await userService.updateProfile(req.auth!.userId, body);
  res.status(200).json({ data: me });
}
