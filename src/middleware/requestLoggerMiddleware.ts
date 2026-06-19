import type { NextFunction, Request, Response } from 'express';
import { getLogger } from '../utils/logger';

const SLOW_REQUEST_MS = 2000;

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger();
  const start = process.hrtime.bigint();
  const requestPath = req.originalUrl.split('?')[0] ?? req.path;

  logger.info(
    {
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
    'request started',
  );

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload = {
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.auth?.userId,
    };

    if (durationMs >= SLOW_REQUEST_MS) {
      logger.warn(payload, 'slow request');
      return;
    }

    if (res.statusCode >= 500) {
      logger.error(payload, 'request failed');
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(payload, 'request completed with client error');
      return;
    }

    logger.info(payload, 'request completed');
  });

  next();
}
