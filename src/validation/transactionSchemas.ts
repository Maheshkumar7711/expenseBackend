import { z } from 'zod';

const transactionTypeSchema = z.enum(['expense', 'income', 'transfer', 'people']);
const peopleModeSchema = z.enum(['pay', 'receive', 'lend', 'borrow']);

export const recurrenceSchema = z
  .object({
    frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Never']),
    time: z.string().trim().max(16).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    weekday: z.number().int().min(0).max(6).optional(),
  })
  .strict();

const transactionBodyFields = {
  id: z.string().trim().min(1).max(128).optional(),
  transactionType: transactionTypeSchema,
  amount: z.number().finite().positive(),
  categoryKey: z.string().trim().max(128).nullable().optional(),
  selectedAccount: z.string().trim().max(128).nullable().optional(),
  selectedPayFrom: z.string().trim().max(128).nullable().optional(),
  selectedPayTo: z.string().trim().max(128).nullable().optional(),
  selectedPeoplePayFrom: z.string().trim().max(128).nullable().optional(),
  selectedPeoplePayTo: z.string().trim().max(128).nullable().optional(),
  peopleMode: peopleModeSchema.optional(),
  date: z.string().datetime({ offset: true }),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().max(64)).max(50).optional(),
  receiptUri: z.string().trim().max(2048).nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  linkedEventId: z.string().trim().max(128).nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  source: z.literal('atm').optional(),
  travelCurrencyCode: z.string().trim().max(8).nullable().optional(),
  travelAmountForeign: z.number().finite().nullable().optional(),
};

export const transactionIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const createTransactionBodySchema = z.object(transactionBodyFields).strict();

export const updateTransactionBodySchema = z
  .object({
    transactionType: transactionTypeSchema.optional(),
    amount: z.number().finite().positive().optional(),
    categoryKey: z.string().trim().max(128).nullable().optional(),
    selectedAccount: z.string().trim().max(128).nullable().optional(),
    selectedPayFrom: z.string().trim().max(128).nullable().optional(),
    selectedPayTo: z.string().trim().max(128).nullable().optional(),
    selectedPeoplePayFrom: z.string().trim().max(128).nullable().optional(),
    selectedPeoplePayTo: z.string().trim().max(128).nullable().optional(),
    peopleMode: peopleModeSchema.nullable().optional(),
    date: z.string().datetime({ offset: true }).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    tags: z.array(z.string().trim().max(64)).max(50).optional(),
    receiptUri: z.string().trim().max(2048).nullable().optional(),
    location: z.string().trim().max(500).nullable().optional(),
    linkedEventId: z.string().trim().max(128).nullable().optional(),
    recurrence: recurrenceSchema.nullable().optional(),
    source: z.literal('atm').nullable().optional(),
    travelCurrencyCode: z.string().trim().max(8).nullable().optional(),
    travelAmountForeign: z.number().finite().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const listTransactionsQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: transactionTypeSchema.optional(),
  categoryKey: z.string().trim().max(128).optional(),
  accountKey: z.string().trim().max(128).optional(),
  eventId: z.string().trim().max(128).optional(),
  amountMin: z.coerce.number().finite().optional(),
  amountMax: z.coerce.number().finite().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  sort: z.enum(['date', '-date']).optional(),
});
