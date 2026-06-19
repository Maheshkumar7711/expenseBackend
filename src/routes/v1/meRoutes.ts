import { Router } from 'express';
import * as userController from '../../controllers/userController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { updateProfileBodySchema } from '../../validation/userSchemas';

export const meRouter = Router();

meRouter.get('/', asyncHandler(userController.getMe));
meRouter.patch(
  '/',
  validate({ body: updateProfileBodySchema }),
  asyncHandler(userController.updateMe),
);
