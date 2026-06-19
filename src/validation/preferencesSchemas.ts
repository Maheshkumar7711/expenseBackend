import { z } from 'zod';

export const customCategoryIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const updateDisabledCategoriesBodySchema = z
  .object({
    disabledCategoryKeys: z.record(z.string(), z.boolean()),
  })
  .strict();

export const createCustomCategoryBodySchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    name: z.string().trim().min(1).max(200),
    linkedToKey: z.string().trim().min(1).max(128),
  })
  .strict();

export const updateCustomCategoryBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    linkedToKey: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const financialMonthSchema = z.enum(['January', 'July']);
const decimalPlacesSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const updatePreferencesBodySchema = z
  .object({
    currencyCode: z.string().trim().min(1).max(8).optional(),
    countryCode: z.string().trim().min(1).max(8).optional(),
    financialMonth: financialMonthSchema.optional(),
    decimalPlaces: decimalPlacesSchema.optional(),
    travelModeOn: z.boolean().optional(),
    selectedCurrencyCode: z.string().trim().max(8).nullable().optional(),
    travelStartDate: z.string().trim().max(32).nullable().optional(),
    travelEndDate: z.string().trim().max(32).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
