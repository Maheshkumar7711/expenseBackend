import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { isUniqueViolation } from '../utils/dbErrors';
import { runSupabaseQuery } from '../utils/dbRetry';
import { isActiveRow, softDeletePatch } from '../utils/softDelete';
import type {
  PeopleMode,
  RecurrenceSettings,
  TransactionRecord,
  TransactionType,
} from '../types/domain/transaction';

interface TransactionRow {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number | string;
  category_key: string | null;
  selected_account: string | null;
  selected_pay_from: string | null;
  selected_pay_to: string | null;
  selected_people_pay_from: string | null;
  selected_people_pay_to: string | null;
  people_mode: PeopleMode | null;
  date: string;
  description: string | null;
  tags: string[];
  receipt_url: string | null;
  location: string | null;
  linked_event_id: string | null;
  recurrence: RecurrenceSettings | null;
  source: string | null;
  travel_currency_code: string | null;
  travel_amount_foreign: number | string | null;
  created_at: string;
  updated_at: string;
}

function toNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
}

function mapTransactionRow(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    transactionType: row.transaction_type,
    amount: toNumber(row.amount) ?? 0,
    categoryKey: row.category_key,
    selectedAccount: row.selected_account,
    selectedPayFrom: row.selected_pay_from,
    selectedPayTo: row.selected_pay_to,
    selectedPeoplePayFrom: row.selected_people_pay_from,
    selectedPeoplePayTo: row.selected_people_pay_to,
    peopleMode: row.people_mode,
    date: row.date,
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags : [],
    receiptUrl: row.receipt_url,
    location: row.location,
    linkedEventId: row.linked_event_id,
    recurrence: row.recurrence,
    source: row.source,
    travelCurrencyCode: row.travel_currency_code,
    travelAmountForeign: toNumber(row.travel_amount_foreign),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export interface ListTransactionsOptions {
  userId: string;
  limit: number;
  cursorDate?: string;
  cursorId?: string;
  transactionType?: TransactionType;
  categoryKey?: string;
  accountKey?: string;
  eventId?: string;
  amountMin?: number;
  amountMax?: number;
  from?: string;
  to?: string;
  sortDesc?: boolean;
}

export async function listTransactions(
  options: ListTransactionsOptions,
): Promise<TransactionRecord[]> {
  return runSupabaseQuery(async () => {
    let query = isActiveRow(
      getSupabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('user_id', options.userId),
    );

    if (options.transactionType) {
      query = query.eq('transaction_type', options.transactionType);
    }
    if (options.categoryKey) {
      query = query.eq('category_key', options.categoryKey);
    }
    if (options.eventId) {
      query = query.eq('linked_event_id', options.eventId);
    }
    if (options.amountMin !== undefined) {
      query = query.gte('amount', options.amountMin);
    }
    if (options.amountMax !== undefined) {
      query = query.lte('amount', options.amountMax);
    }
    if (options.from) {
      query = query.gte('date', options.from);
    }
    if (options.to) {
      query = query.lte('date', options.to);
    }
    if (options.accountKey) {
      const key = options.accountKey;
      query = query.or(
        [
          `selected_account.eq.${key}`,
          `selected_pay_from.eq.${key}`,
          `selected_pay_to.eq.${key}`,
          `selected_people_pay_from.eq.${key}`,
          `selected_people_pay_to.eq.${key}`,
        ].join(','),
      );
    }
    if (options.cursorDate && options.cursorId) {
      if (options.sortDesc !== false) {
        query = query.or(
          `date.lt.${options.cursorDate},and(date.eq.${options.cursorDate},id.lt.${options.cursorId})`,
        );
      } else {
        query = query.or(
          `date.gt.${options.cursorDate},and(date.eq.${options.cursorDate},id.gt.${options.cursorId})`,
        );
      }
    }

    const sortDesc = options.sortDesc !== false;
    query = query
      .order('date', { ascending: !sortDesc })
      .order('id', { ascending: !sortDesc })
      .limit(options.limit + 1);

    const { data, error } = await query;
    if (error) {
      wrapDbError(error);
    }

    return (data as TransactionRow[]).map(mapTransactionRow);
  });
}

/** Full list for bootstrap sync — capped to avoid unbounded payloads. */
export async function listAllTransactionsForUser(
  userId: string,
  limit: number,
): Promise<TransactionRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('user_id', userId),
    )
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      wrapDbError(error);
    }

    return (data as TransactionRow[]).map(mapTransactionRow);
  });
}

async function findTransactionByIdInternal(
  userId: string,
  transactionId: string,
): Promise<TransactionRecord | null> {
  const { data, error } = await isActiveRow(
    getSupabaseAdmin()
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', transactionId),
  ).maybeSingle();

  if (error) {
    wrapDbError(error);
  }

  return data ? mapTransactionRow(data as TransactionRow) : null;
}

export async function findTransactionById(
  userId: string,
  transactionId: string,
): Promise<TransactionRecord | null> {
  return runSupabaseQuery(async () => findTransactionByIdInternal(userId, transactionId));
}

export interface CreateTransactionInput {
  id: string;
  userId: string;
  transactionType: TransactionType;
  amount: number;
  categoryKey?: string | null;
  selectedAccount?: string | null;
  selectedPayFrom?: string | null;
  selectedPayTo?: string | null;
  selectedPeoplePayFrom?: string | null;
  selectedPeoplePayTo?: string | null;
  peopleMode?: PeopleMode | null;
  date: string;
  description?: string | null;
  tags?: string[];
  receiptUrl?: string | null;
  location?: string | null;
  linkedEventId?: string | null;
  recurrence?: RecurrenceSettings | null;
  source?: string | null;
  travelCurrencyCode?: string | null;
  travelAmountForeign?: number | null;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('transactions')
      .insert({
        id: input.id,
        user_id: input.userId,
        transaction_type: input.transactionType,
        amount: input.amount,
        category_key: input.categoryKey ?? null,
        selected_account: input.selectedAccount ?? null,
        selected_pay_from: input.selectedPayFrom ?? null,
        selected_pay_to: input.selectedPayTo ?? null,
        selected_people_pay_from: input.selectedPeoplePayFrom ?? null,
        selected_people_pay_to: input.selectedPeoplePayTo ?? null,
        people_mode: input.peopleMode ?? null,
        date: input.date,
        description: input.description ?? null,
        tags: input.tags ?? [],
        receipt_url: input.receiptUrl ?? null,
        location: input.location ?? null,
        linked_event_id: input.linkedEventId ?? null,
        recurrence: input.recurrence ?? null,
        source: input.source ?? null,
        travel_currency_code: input.travelCurrencyCode ?? null,
        travel_amount_foreign: input.travelAmountForeign ?? null,
      })
      .select('*')
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        const existing = await findTransactionByIdInternal(input.userId, input.id);
        if (existing) {
          return existing;
        }
      }
      wrapDbError(error);
    }

    return mapTransactionRow(data as TransactionRow);
  });
}

export interface UpdateTransactionInput {
  transactionType?: TransactionType;
  amount?: number;
  categoryKey?: string | null;
  selectedAccount?: string | null;
  selectedPayFrom?: string | null;
  selectedPayTo?: string | null;
  selectedPeoplePayFrom?: string | null;
  selectedPeoplePayTo?: string | null;
  peopleMode?: PeopleMode | null;
  date?: string;
  description?: string | null;
  tags?: string[];
  receiptUrl?: string | null;
  location?: string | null;
  linkedEventId?: string | null;
  recurrence?: RecurrenceSettings | null;
  source?: string | null;
  travelCurrencyCode?: string | null;
  travelAmountForeign?: number | null;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<TransactionRecord> {
  return runSupabaseQuery(async () => {
    const patch: Record<string, unknown> = {};

    if (input.transactionType !== undefined) patch.transaction_type = input.transactionType;
    if (input.amount !== undefined) patch.amount = input.amount;
    if (input.categoryKey !== undefined) patch.category_key = input.categoryKey;
    if (input.selectedAccount !== undefined) patch.selected_account = input.selectedAccount;
    if (input.selectedPayFrom !== undefined) patch.selected_pay_from = input.selectedPayFrom;
    if (input.selectedPayTo !== undefined) patch.selected_pay_to = input.selectedPayTo;
    if (input.selectedPeoplePayFrom !== undefined) {
      patch.selected_people_pay_from = input.selectedPeoplePayFrom;
    }
    if (input.selectedPeoplePayTo !== undefined) patch.selected_people_pay_to = input.selectedPeoplePayTo;
    if (input.peopleMode !== undefined) patch.people_mode = input.peopleMode;
    if (input.date !== undefined) patch.date = input.date;
    if (input.description !== undefined) patch.description = input.description;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.receiptUrl !== undefined) patch.receipt_url = input.receiptUrl;
    if (input.location !== undefined) patch.location = input.location;
    if (input.linkedEventId !== undefined) patch.linked_event_id = input.linkedEventId;
    if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
    if (input.source !== undefined) patch.source = input.source;
    if (input.travelCurrencyCode !== undefined) patch.travel_currency_code = input.travelCurrencyCode;
    if (input.travelAmountForeign !== undefined) {
      patch.travel_amount_foreign = input.travelAmountForeign;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('transactions')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', transactionId)
      .select('*')
      .single();

    if (error) {
      wrapDbError(error);
    }

    return mapTransactionRow(data as TransactionRow);
  });
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('transactions')
      .update(softDeletePatch())
      .eq('user_id', userId)
      .eq('id', transactionId)
      .filter('deleted_at', 'is', null)
      .select('id');

    if (error) {
      wrapDbError(error);
    }

    if (!data?.length) {
      return;
    }
  });
}
