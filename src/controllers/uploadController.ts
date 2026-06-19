import type { Request, Response } from 'express';
import { BadRequestError } from '../errors';
import * as uploadService from '../services/uploadService';

export async function uploadReceipt(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new BadRequestError('Missing file field "file"', 'MISSING_FILE');
  }

  const data = await uploadService.uploadReceipt(req.auth!.userId, {
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
  });

  res.status(201).json({ data });
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new BadRequestError('Missing file field "file"', 'MISSING_FILE');
  }

  const data = await uploadService.uploadAvatar(req.auth!.userId, {
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
  });

  res.status(201).json({ data });
}
