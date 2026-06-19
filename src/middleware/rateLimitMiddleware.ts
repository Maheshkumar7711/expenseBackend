import type { Request, RequestHandler, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function rateLimitHandler(
  req: Request,
  res: Response,
  _next: () => void,
  optionsUsed: Options,
): void {
  const windowSeconds = Math.ceil((optionsUsed.windowMs ?? 60_000) / 1000);
  const logger = getLogger();

  logger.warn(
    {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      ip: clientIp(req),
      userId: req.auth?.userId,
    },
    'Rate limit exceeded',
  );

  res.setHeader('Retry-After', String(windowSeconds));
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: [],
    },
  });
}

function createLimiter(options: Partial<Options>): RequestHandler {
  const { isTest } = getConfig();

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => isTest,
    ...options,
  });
}

/** Pre-auth IP limit on /api — protects Clerk JWT verification from abuse. */
export function createApiIpRateLimiter(): RequestHandler {
  const { rateLimit: limits } = getConfig();

  return createLimiter({
    windowMs: limits.windowMs,
    max: limits.apiMaxPerIp,
    keyGenerator: (req) => clientIp(req),
  });
}

/** Post-auth per-user limit on /api/v1. */
export function createAuthenticatedRateLimiter(): RequestHandler {
  const { rateLimit: limits } = getConfig();

  return createLimiter({
    windowMs: limits.windowMs,
    max: limits.apiMaxPerUser,
    keyGenerator: (req) => req.auth?.userId ?? clientIp(req),
  });
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Stricter post-auth limit for mutating requests. */
export function createWriteRateLimiter(): RequestHandler {
  const { rateLimit: limits } = getConfig();

  return createLimiter({
    windowMs: limits.windowMs,
    max: limits.writeMaxPerUser,
    keyGenerator: (req) => `write:${req.auth?.userId ?? clientIp(req)}`,
    skip: (req) => !WRITE_METHODS.has(req.method),
  });
}
