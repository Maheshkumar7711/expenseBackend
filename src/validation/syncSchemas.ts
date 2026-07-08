import { z } from 'zod';

const syncEntityTypeSchema = z.enum([
  'transaction',
  'account',
  'goal',
  'savingContribution',
  'budget',
  'event',
  'reminder',
  'customCategory',
  'disabledCategories',
  'preferences',
  'excludedRecurring',
]);

const syncPushOperationSchema = z.enum(['create', 'update', 'delete']);

export const syncPushOperationBodySchema = z
  .object({
    operationId: z.string().trim().min(1).max(128),
    entityType: syncEntityTypeSchema,
    operation: syncPushOperationSchema,
    entityId: z.string().trim().min(1).max(128),
    parentId: z.string().trim().min(1).max(128).nullable().optional(),
    payload: z.unknown().optional(),
    clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const syncPushBodySchema = z
  .object({
    deviceId: z.string().trim().min(1).max(128),
    operations: z.array(syncPushOperationBodySchema).max(200),
  })
  .strict();

export const syncChangesQuerySchema = z.object({
  since: z.coerce.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
