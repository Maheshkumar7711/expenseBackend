import { z } from 'zod';

export const goalIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const createGoalBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    name: z.string().trim().min(1).max(200),
    targetDate: z.string().trim().min(1).max(32),
    targetAmount: z.number().finite().positive(),
    savedAmount: z.number().finite().min(0).optional(),
    iconKey: z.string().trim().min(1).max(128),
    tags: z.array(z.string().trim().max(64)).max(50).optional(),
    achieved: z.boolean().optional(),
  })
  .strict();

export const updateGoalBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    targetDate: z.string().trim().min(1).max(32).optional(),
    targetAmount: z.number().finite().positive().optional(),
    savedAmount: z.number().finite().min(0).optional(),
    iconKey: z.string().trim().min(1).max(128).optional(),
    tags: z.array(z.string().trim().max(64)).max(50).optional(),
    achieved: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createSavingContributionBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    amount: z.number().finite().positive(),
    date: z.string().datetime({ offset: true }),
    sourceAccountKey: z.string().trim().min(1).max(128),
  })
  .strict();

export const goalIdOnlyParamsSchema = z.object({
  goalId: z.string().trim().min(1).max(128),
});

export const savingContributionParamsSchema = z.object({
  goalId: z.string().trim().min(1).max(128),
  contributionId: z.string().trim().min(1).max(128),
});
