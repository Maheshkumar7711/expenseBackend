import { Router } from 'express';
import * as goalController from '../../controllers/goalController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createGoalBodySchema,
  createSavingContributionBodySchema,
  goalIdOnlyParamsSchema,
  goalIdParamsSchema,
  savingContributionParamsSchema,
  updateGoalBodySchema,
} from '../../validation/goalSchemas';

export const goalRouter = Router();

goalRouter.get('/', asyncHandler(goalController.listGoals));
goalRouter.post(
  '/',
  validate({ body: createGoalBodySchema }),
  asyncHandler(goalController.createGoal),
);
goalRouter.get(
  '/:id',
  validate({ params: goalIdParamsSchema }),
  asyncHandler(goalController.getGoal),
);
goalRouter.patch(
  '/:id',
  validate({ params: goalIdParamsSchema, body: updateGoalBodySchema }),
  asyncHandler(goalController.updateGoal),
);
goalRouter.delete(
  '/:id',
  validate({ params: goalIdParamsSchema }),
  asyncHandler(goalController.deleteGoal),
);
goalRouter.post(
  '/:goalId/contributions',
  validate({ params: goalIdOnlyParamsSchema, body: createSavingContributionBodySchema }),
  asyncHandler(goalController.createContribution),
);
goalRouter.delete(
  '/:goalId/contributions/:contributionId',
  validate({ params: savingContributionParamsSchema }),
  asyncHandler(goalController.deleteContribution),
);
