import type { NextFunction, Request, Response } from 'express';
import { AppError, RateLimitError } from '../errors';
import { getLogger } from '../utils/logger';

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const logger = getLogger();

  if (err instanceof AppError) {
    if (err instanceof RateLimitError) {
      const retryAfter =
        typeof err.details === 'object' &&
        err.details !== null &&
        'retryAfterSeconds' in err.details
          ? Number((err.details as { retryAfterSeconds: number }).retryAfterSeconds)
          : 60;
      res.setHeader('Retry-After', String(retryAfter));
    }

    if (!err.isOperational) {
      logger.error(
        { err, requestId: req.requestId, path: req.path, userId: req.auth?.userId },
        'Non-operational error',
      );
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? [],
      },
    });
    return;
  }

  logger.error(
    { err, requestId: req.requestId, path: req.path, userId: req.auth?.userId },
    'Unhandled error',
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: [],
    },
  });
}
