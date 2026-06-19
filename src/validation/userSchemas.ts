import { z } from 'zod';

const userTypeSchema = z.enum(['Student', 'Professional', 'Self Employed', 'Retired']);
const genderSchema = z.enum(['Male', 'Female']);

export const updateProfileBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    dateOfBirth: z.string().trim().max(32).optional(),
    userType: userTypeSchema.optional(),
    gender: genderSchema.optional(),
    avatarUrl: z.string().url().nullable().optional(),
    hasCompletedOnboarding: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
