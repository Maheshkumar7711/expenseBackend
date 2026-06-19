import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError } from '../errors';

type MulterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

export function wrapMulterUpload(upload: MulterMiddleware) {
  return (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new BadRequestError('File too large', 'FILE_TOO_LARGE'));
          return;
        }
        next(new BadRequestError(err.message, 'UPLOAD_ERROR'));
        return;
      }

      if (err instanceof Error && err.message === 'INVALID_FILE_TYPE') {
        next(new BadRequestError('Only image uploads are allowed', 'INVALID_FILE_TYPE'));
        return;
      }

      next(err);
    });
  };
}
