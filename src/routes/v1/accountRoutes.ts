import { Router } from 'express';
import * as accountController from '../../controllers/accountController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  accountIdParamsSchema,
  createAccountBodySchema,
  updateAccountBodySchema,
} from '../../validation/accountSchemas';

export const accountRouter = Router();

accountRouter.get('/', asyncHandler(accountController.listAccounts));
accountRouter.post(
  '/',
  validate({ body: createAccountBodySchema }),
  asyncHandler(accountController.createAccount),
);
accountRouter.get(
  '/:id',
  validate({ params: accountIdParamsSchema }),
  asyncHandler(accountController.getAccount),
);
accountRouter.patch(
  '/:id',
  validate({ params: accountIdParamsSchema, body: updateAccountBodySchema }),
  asyncHandler(accountController.updateAccount),
);
accountRouter.delete(
  '/:id',
  validate({ params: accountIdParamsSchema }),
  asyncHandler(accountController.deleteAccount),
);
