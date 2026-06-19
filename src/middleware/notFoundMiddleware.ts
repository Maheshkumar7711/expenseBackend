import type { Request, Response } from 'express';

export function notFoundMiddleware(req: Request, res: Response): void {
  const hint =
    req.path === '/me' || req.path.startsWith('/accounts')
      ? 'API routes use the /api/v1 prefix — try /api/v1' + req.path
      : 'See GET / for available routes (e.g. /api/v1/me)';

  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found',
      details: [{ field: 'path', message: hint }],
    },
  });
}
