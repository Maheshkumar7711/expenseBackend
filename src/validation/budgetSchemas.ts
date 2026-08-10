import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

export const budgetIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const createBudgetBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    categoryKey: z.string().trim().min(1).max(128),
    amount: moneyAmountSchema,
    monthOnly: z.boolean(),
    period: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
  })
  .strict();

export const updateBudgetBodySchema = z
  .object({
    categoryKey: z.string().trim().min(1).max(128).optional(),
    amount: moneyAmountSchema.optional(),
    monthOnly: z.boolean().optional(),
    period: z.string().trim().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const deleteBudgetQuerySchema = z.object({
  period: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
});

export const addExcludedRecurringBodySchema = z
  .object({
    categoryKey: z.string().trim().min(1).max(128),
    period: z.string().trim().regex(/^\d{4}-\d{2}$/),
  })
  .strict();
