import { z } from 'zod';

export const eventIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const createEventBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    startDate: z.string().trim().min(1).max(32),
    endDate: z.string().trim().min(1).max(32),
  })
  .strict();

export const updateEventBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    startDate: z.string().trim().min(1).max(32).optional(),
    endDate: z.string().trim().min(1).max(32).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
