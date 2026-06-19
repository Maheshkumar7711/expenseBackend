import { Router } from 'express';
import * as reminderController from '../../controllers/reminderController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createReminderBodySchema,
  reminderIdParamsSchema,
  updateReminderBodySchema,
} from '../../validation/reminderSchemas';

export const reminderRouter = Router();

reminderRouter.get('/', asyncHandler(reminderController.listReminders));
reminderRouter.post(
  '/',
  validate({ body: createReminderBodySchema }),
  asyncHandler(reminderController.createReminder),
);
reminderRouter.get(
  '/:id',
  validate({ params: reminderIdParamsSchema }),
  asyncHandler(reminderController.getReminder),
);
reminderRouter.patch(
  '/:id',
  validate({ params: reminderIdParamsSchema, body: updateReminderBodySchema }),
  asyncHandler(reminderController.updateReminder),
);
reminderRouter.delete(
  '/:id',
  validate({ params: reminderIdParamsSchema }),
  asyncHandler(reminderController.deleteReminder),
);
