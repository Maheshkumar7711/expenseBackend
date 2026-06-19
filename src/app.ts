import express from 'express';
import helmet from 'helmet';
import { getConfig } from './config';
import { handleClerkWebhook } from './controllers/clerkWebhookController';
import { checkSupabaseConnection } from './integrations/supabaseClient';
import { createCorsMiddleware } from './middleware/corsMiddleware';
import { errorMiddleware } from './middleware/errorMiddleware';
import { notFoundMiddleware } from './middleware/notFoundMiddleware';
import { requestIdMiddleware } from './middleware/requestIdMiddleware';
import { requestLoggerMiddleware } from './middleware/requestLoggerMiddleware';
import { createApiIpRateLimiter } from './middleware/rateLimitMiddleware';
import { apiRouter } from './routes';
import { asyncHandler } from './utils/asyncHandler';

export function createApp(): express.Application {
  const app = express();
  const { isProduction } = getConfig();

  // Middleware order (route-security.mdc / middleware-engineering.mdc):
  // 1 request ID → 2 CORS → 3 helmet → 4 body → 5 logger → 6 rate limit → routes → 404 → errors
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // Disable ETag — mobile axios treats 304 as an error and JSON body is empty.
  app.set('etag', false);

  app.use(requestIdMiddleware);
  app.use(createCorsMiddleware());
  app.use(helmet());

  // Clerk webhooks need raw body for Svix signature verification (before express.json)
  app.post(
    '/webhooks/clerk',
    express.raw({ type: 'application/json' }),
    asyncHandler(handleClerkWebhook),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(requestLoggerMiddleware);

  // Public allowlist (route-security.mdc §4) — no auth required
  const healthHandler = (_req: express.Request, res: express.Response): void => {
    res.status(200).json({ status: 'ok' });
  };
  app.get('/health', healthHandler);
  app.get('/healthy', healthHandler);

  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'expense-backend',
      version: 'v1',
      docs: 'All API routes are under /api/v1 — requires Clerk Bearer token except /health',
    });
  });

  if (!isProduction) {
    app.get('/ready', async (_req, res) => {
      const supabaseOk = await checkSupabaseConnection();
      res.status(supabaseOk ? 200 : 503).json({
        status: supabaseOk ? 'ready' : 'degraded',
        checks: {
          supabase: supabaseOk ? 'ok' : 'unavailable',
        },
      });
    });
  }

  // Pre-auth IP rate limit — before JWT verification (prevents auth DoS)
  app.use('/api', createApiIpRateLimiter(), apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
