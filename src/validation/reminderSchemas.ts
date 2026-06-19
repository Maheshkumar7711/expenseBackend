import { z } from 'zod';

const reminderIntervalSchema = z.enum(['Monthly', 'Daily', 'Weekly', 'Never']);

export const reminderIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const createReminderBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    title: z.string().trim().min(1).max(200),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().trim().regex(/^\d{2}:\d{2}$/),
    interval: reminderIntervalSchema,
  })
  .strict();

export const updateReminderBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    interval: reminderIntervalSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
