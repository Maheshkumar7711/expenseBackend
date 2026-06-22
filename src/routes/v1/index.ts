import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import {
  createAuthenticatedRateLimiter,
  createWriteRateLimiter,
} from '../../middleware/rateLimitMiddleware';
import { accountRouter } from './accountRoutes';
import { budgetRouter } from './budgetRoutes';
import { categoryRouter, preferencesRouter } from './preferencesRoutes';
import { eventRouter } from './eventRoutes';
import { goalRouter } from './goalRoutes';
import { meRouter } from './meRoutes';
import { reminderRouter } from './reminderRoutes';
import { syncRouter } from './syncRoutes';
import { transactionRouter } from './transactionRoutes';
import { uploadRouter } from './uploadRoutes';

export const v1Router = Router();

// Protected /api/v1/* — default DENY (route-security.mdc)
// Order: auth → per-user rate limit → write rate limit → domain routes
v1Router.use(authMiddleware);
v1Router.use(createAuthenticatedRateLimiter());
v1Router.use(createWriteRateLimiter());

// More specific /me/* mounts before /me
v1Router.use('/me/preferences', preferencesRouter);
v1Router.use('/me', meRouter);
v1Router.use('/sync', syncRouter);
v1Router.use('/accounts', accountRouter);
v1Router.use('/transactions', transactionRouter);
v1Router.use('/budgets', budgetRouter);
v1Router.use('/goals', goalRouter);
v1Router.use('/events', eventRouter);
v1Router.use('/reminders', reminderRouter);
v1Router.use('/categories', categoryRouter);
v1Router.use('/uploads', uploadRouter);
