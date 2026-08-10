import type { NextFunction, Request, Response } from 'express';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

const SLOW_REQUEST_MS = 2000;

/** Health probes — skip in logs so real API traffic is easy to see. */
const QUIET_PATHS = new Set(['/health', '/healthy', '/ready']);

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger();
  const start = process.hrtime.bigint();
  const requestPath = req.originalUrl.split('?')[0] ?? req.path;
  const { isProduction } = getConfig();

  if (QUIET_PATHS.has(requestPath)) {
    next();
    return;
  }

  if (isProduction) {
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
  }

  res.on('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000);
    const summary = `${req.method} ${requestPath} ${res.statusCode} ${durationMs}ms`;
    const payload = {
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs,
      userId: req.auth?.userId,
    };

    if (durationMs >= SLOW_REQUEST_MS) {
      logger.warn(payload, `slow request - ${summary}`);
      return;
    }

    if (res.statusCode >= 500) {
      logger.error(payload, summary);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(payload, summary);
      return;
    }

    logger.info(payload, summary);
  });

  next();
}
