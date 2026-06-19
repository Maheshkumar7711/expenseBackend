import type { NextFunction, Request, Response } from 'express';
import { verifyClerkToken } from '../integrations/clerkAuth';
import { UnauthorizedError } from '../errors';

const BEARER_PREFIX = 'Bearer ';

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      throw new UnauthorizedError('Missing authentication token');
    }

    const auth = await verifyClerkToken(token);
    req.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
}
