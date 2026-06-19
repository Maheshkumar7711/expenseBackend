import { Router } from 'express';
import * as preferencesController from '../../controllers/preferencesController';
import { validate } from '../../middleware/validateMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createCustomCategoryBodySchema,
  customCategoryIdParamsSchema,
  updateCustomCategoryBodySchema,
  updateDisabledCategoriesBodySchema,
  updatePreferencesBodySchema,
} from '../../validation/preferencesSchemas';

export const preferencesRouter = Router();

preferencesRouter.get('/', asyncHandler(preferencesController.getPreferences));
preferencesRouter.patch(
  '/',
  validate({ body: updatePreferencesBodySchema }),
  asyncHandler(preferencesController.updatePreferences),
);

export const categoryRouter = Router();

categoryRouter.get('/', asyncHandler(preferencesController.getCategories));
categoryRouter.patch(
  '/disabled',
  validate({ body: updateDisabledCategoriesBodySchema }),
  asyncHandler(preferencesController.updateDisabledCategories),
);
categoryRouter.post(
  '/custom',
  validate({ body: createCustomCategoryBodySchema }),
  asyncHandler(preferencesController.createCustomCategory),
);
categoryRouter.patch(
  '/custom/:id',
  validate({ params: customCategoryIdParamsSchema, body: updateCustomCategoryBodySchema }),
  asyncHandler(preferencesController.updateCustomCategory),
);
categoryRouter.delete(
  '/custom/:id',
  validate({ params: customCategoryIdParamsSchema }),
  asyncHandler(preferencesController.deleteCustomCategory),
);
