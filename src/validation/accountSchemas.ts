import { z } from 'zod';

const accountTypeSchema = z.enum(['cash', 'bank', 'person']);

export const accountIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const createAccountBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    type: accountTypeSchema,
    name: z.string().trim().min(1).max(200),
    openingBalance: z.number().finite(),
    deactivated: z.boolean().optional(),
    bankName: z.string().trim().max(200).optional(),
    bankKey: z.string().trim().max(128).optional(),
    iconKey: z.string().trim().max(128).optional(),
  })
  .strict();

export const updateAccountBodySchema = z
  .object({
    type: accountTypeSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    openingBalance: z.number().finite().optional(),
    deactivated: z.boolean().optional(),
    bankName: z.string().trim().max(200).nullable().optional(),
    bankKey: z.string().trim().max(128).nullable().optional(),
    iconKey: z.string().trim().max(128).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
