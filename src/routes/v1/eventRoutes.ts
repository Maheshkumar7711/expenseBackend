import { Router } from 'express';
import * as eventController from '../../controllers/eventController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createEventBodySchema,
  eventIdParamsSchema,
  updateEventBodySchema,
} from '../../validation/eventSchemas';

export const eventRouter = Router();

eventRouter.get('/', asyncHandler(eventController.listEvents));
eventRouter.post(
  '/',
  validate({ body: createEventBodySchema }),
  asyncHandler(eventController.createEvent),
);
eventRouter.get(
  '/:id',
  validate({ params: eventIdParamsSchema }),
  asyncHandler(eventController.getEvent),
);
eventRouter.patch(
  '/:id',
  validate({ params: eventIdParamsSchema, body: updateEventBodySchema }),
  asyncHandler(eventController.updateEvent),
);
eventRouter.delete(
  '/:id',
  validate({ params: eventIdParamsSchema }),
  asyncHandler(eventController.deleteEvent),
);
