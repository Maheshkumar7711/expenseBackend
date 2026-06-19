import { Router } from 'express';
import * as transactionController from '../../controllers/transactionController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createTransactionBodySchema,
  listTransactionsQuerySchema,
  transactionIdParamsSchema,
  updateTransactionBodySchema,
} from '../../validation/transactionSchemas';

export const transactionRouter = Router();

transactionRouter.get(
  '/',
  validate({ query: listTransactionsQuerySchema }),
  asyncHandler(transactionController.listTransactions),
);
transactionRouter.post(
  '/',
  validate({ body: createTransactionBodySchema }),
  asyncHandler(transactionController.createTransaction),
);
transactionRouter.get(
  '/:id',
  validate({ params: transactionIdParamsSchema }),
  asyncHandler(transactionController.getTransaction),
);
transactionRouter.patch(
  '/:id',
  validate({ params: transactionIdParamsSchema, body: updateTransactionBodySchema }),
  asyncHandler(transactionController.updateTransaction),
);
transactionRouter.delete(
  '/:id',
  validate({ params: transactionIdParamsSchema }),
  asyncHandler(transactionController.deleteTransaction),
);
