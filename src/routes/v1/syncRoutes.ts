import { Router } from 'express';
import * as syncController from '../../controllers/syncController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { syncChangesQuerySchema, syncPushBodySchema } from '../../validation/syncSchemas';

export const syncRouter = Router();

syncRouter.get('/', asyncHandler(syncController.getBootstrapSync));
syncRouter.get(
  '/changes',
  validate({ query: syncChangesQuerySchema }),
  asyncHandler(syncController.getSyncChanges),
);
syncRouter.post(
  '/push',
  validate({ body: syncPushBodySchema }),
  asyncHandler(syncController.postSyncPush),
);
