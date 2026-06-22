import { Router } from 'express';
import * as syncController from '../../controllers/syncController';
import { asyncHandler } from '../../utils/asyncHandler';

export const syncRouter = Router();

syncRouter.get('/', asyncHandler(syncController.getBootstrapSync));
