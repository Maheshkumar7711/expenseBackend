import { Router } from 'express';
import * as budgetController from '../../controllers/budgetController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  addExcludedRecurringBodySchema,
  budgetIdParamsSchema,
  createBudgetBodySchema,
  deleteBudgetQuerySchema,
  updateBudgetBodySchema,
} from '../../validation/budgetSchemas';

export const budgetRouter = Router();

budgetRouter.get('/', asyncHandler(budgetController.listBudgets));
budgetRouter.post(
  '/',
  validate({ body: createBudgetBodySchema }),
  asyncHandler(budgetController.createBudget),
);
budgetRouter.post(
  '/excluded-recurring',
  validate({ body: addExcludedRecurringBodySchema }),
  asyncHandler(budgetController.addExcludedRecurring),
);
budgetRouter.get(
  '/:id',
  validate({ params: budgetIdParamsSchema }),
  asyncHandler(budgetController.getBudget),
);
budgetRouter.patch(
  '/:id',
  validate({ params: budgetIdParamsSchema, body: updateBudgetBodySchema }),
  asyncHandler(budgetController.updateBudget),
);
budgetRouter.delete(
  '/:id',
  validate({ params: budgetIdParamsSchema, query: deleteBudgetQuerySchema }),
  asyncHandler(budgetController.deleteBudget),
);
