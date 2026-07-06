import * as transactionRepository from '../repositories/transactionRepository';
import { NotFoundError } from '../errors';
import type {
  PeopleMode,
  RecurrenceSettings,
  TransactionRecord,
  TransactionResponse,
  TransactionType,
} from '../types/domain/transaction';
import type { PaginationMeta } from '../utils/pagination';
import { decodeCursor, encodeCursor } from '../utils/pagination';
import { generateId } from '../utils/generateId';
import { ensureUser } from './userService';

function toTransactionResponse(record: TransactionRecord): TransactionResponse {
  const response: TransactionResponse = {
    id: record.id,
    transactionType: record.transactionType,
    amount: record.amount,
    categoryKey: record.categoryKey,
    selectedAccount: record.selectedAccount,
    selectedPayFrom: record.selectedPayFrom,
    selectedPayTo: record.selectedPayTo,
    selectedPeoplePayFrom: record.selectedPeoplePayFrom,
    selectedPeoplePayTo: record.selectedPeoplePayTo,
    date: record.date,
    tags: record.tags,
    updatedAt: record.updatedAt,
  };

  if (record.peopleMode) {
    response.peopleMode = record.peopleMode;
  }
  if (record.description) {
    response.description = record.description;
  }
  if (record.receiptUrl) {
    response.receiptUri = record.receiptUrl;
  } else if (record.receiptUrl === null) {
    response.receiptUri = null;
  }
  if (record.location !== null) {
    response.location = record.location;
  }
  if (record.linkedEventId !== null) {
    response.linkedEventId = record.linkedEventId;
  }
  if (record.recurrence !== undefined) {
    response.recurrence = record.recurrence;
  }
  if (record.source === 'atm') {
    response.source = 'atm';
  }
  if (record.travelCurrencyCode !== null) {
    response.travelCurrencyCode = record.travelCurrencyCode;
  }
  if (record.travelAmountForeign !== null) {
    response.travelAmountForeign = record.travelAmountForeign;
  }

  return response;
}

export interface ListTransactionsInput {
  cursor?: string;
  limit: number;
  type?: TransactionType;
  categoryKey?: string;
  accountKey?: string;
  eventId?: string;
  amountMin?: number;
  amountMax?: number;
  from?: string;
  to?: string;
  sort?: 'date' | '-date';
}

export interface ListTransactionsResult {
  transactions: TransactionResponse[];
  meta: PaginationMeta;
}

export async function listTransactions(
  clerkUserId: string,
  input: ListTransactionsInput,
): Promise<ListTransactionsResult> {
  const user = await ensureUser(clerkUserId);

  const sortDesc = input.sort !== 'date';
  let cursorDate: string | undefined;
  let cursorId: string | undefined;

  if (input.cursor) {
    const decoded = decodeCursor(input.cursor);
    cursorDate = decoded.date;
    cursorId = decoded.id;
  }

  const rows = await transactionRepository.listTransactions({
    userId: user.id,
    limit: input.limit,
    cursorDate,
    cursorId,
    transactionType: input.type,
    categoryKey: input.categoryKey,
    accountKey: input.accountKey,
    eventId: input.eventId,
    amountMin: input.amountMin,
    amountMax: input.amountMax,
    from: input.from,
    to: input.to,
    sortDesc,
  });

  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  const last = page[page.length - 1];

  return {
    transactions: page.map(toTransactionResponse),
    meta: {
      cursor: hasMore && last ? encodeCursor(last.date, last.id) : null,
      limit: input.limit,
      hasMore,
    },
  };
}

const SYNC_TRANSACTION_LIMIT = 10_000;

/** Returns all transactions in one query for bootstrap sync. */
export async function listAllTransactionsForSync(
  clerkUserId: string,
): Promise<TransactionResponse[]> {
  const user = await ensureUser(clerkUserId);
  const rows = await transactionRepository.listAllTransactionsForUser(
    user.id,
    SYNC_TRANSACTION_LIMIT,
  );
  return rows.map(toTransactionResponse);
}

export async function getTransaction(
  clerkUserId: string,
  transactionId: string,
): Promise<TransactionResponse> {
  const user = await ensureUser(clerkUserId);

  const record = await transactionRepository.findTransactionById(user.id, transactionId);
  if (!record) {
    throw new NotFoundError('Transaction', transactionId);
  }

  return toTransactionResponse(record);
}

export interface CreateTransactionInput {
  id?: string;
  transactionType: TransactionType;
  amount: number;
  categoryKey?: string | null;
  selectedAccount?: string | null;
  selectedPayFrom?: string | null;
  selectedPayTo?: string | null;
  selectedPeoplePayFrom?: string | null;
  selectedPeoplePayTo?: string | null;
  peopleMode?: PeopleMode;
  date: string;
  description?: string;
  tags?: string[];
  receiptUri?: string | null;
  location?: string | null;
  linkedEventId?: string | null;
  recurrence?: RecurrenceSettings | null;
  source?: 'atm';
  travelCurrencyCode?: string | null;
  travelAmountForeign?: number | null;
}

export async function createTransaction(
  clerkUserId: string,
  input: CreateTransactionInput,
): Promise<TransactionResponse> {
  const user = await ensureUser(clerkUserId);

  const id = input.id ?? generateId('tx');
  const existing = await transactionRepository.findTransactionById(user.id, id);
  if (existing) {
    return toTransactionResponse(existing);
  }

  const record = await transactionRepository.createTransaction({
    id,
    userId: user.id,
    transactionType: input.transactionType,
    amount: input.amount,
    categoryKey: input.categoryKey,
    selectedAccount: input.selectedAccount,
    selectedPayFrom: input.selectedPayFrom,
    selectedPayTo: input.selectedPayTo,
    selectedPeoplePayFrom: input.selectedPeoplePayFrom,
    selectedPeoplePayTo: input.selectedPeoplePayTo,
    peopleMode: input.peopleMode ?? null,
    date: input.date,
    description: input.description ?? null,
    tags: input.tags,
    receiptUrl: input.receiptUri ?? null,
    location: input.location ?? null,
    linkedEventId: input.linkedEventId ?? null,
    recurrence: input.recurrence ?? null,
    source: input.source ?? null,
    travelCurrencyCode: input.travelCurrencyCode ?? null,
    travelAmountForeign: input.travelAmountForeign ?? null,
  });

  return toTransactionResponse(record);
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
  receiptUri?: string | null;
  location?: string | null;
  linkedEventId?: string | null;
  recurrence?: RecurrenceSettings | null;
  source?: 'atm' | null;
  travelCurrencyCode?: string | null;
  travelAmountForeign?: number | null;
}

export async function updateTransaction(
  clerkUserId: string,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<TransactionResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await transactionRepository.findTransactionById(user.id, transactionId);
  if (!existing) {
    throw new NotFoundError('Transaction', transactionId);
  }

  const record = await transactionRepository.updateTransaction(user.id, transactionId, {
    transactionType: input.transactionType,
    amount: input.amount,
    categoryKey: input.categoryKey,
    selectedAccount: input.selectedAccount,
    selectedPayFrom: input.selectedPayFrom,
    selectedPayTo: input.selectedPayTo,
    selectedPeoplePayFrom: input.selectedPeoplePayFrom,
    selectedPeoplePayTo: input.selectedPeoplePayTo,
    peopleMode: input.peopleMode,
    date: input.date,
    description: input.description,
    tags: input.tags,
    receiptUrl: input.receiptUri,
    location: input.location,
    linkedEventId: input.linkedEventId,
    recurrence: input.recurrence,
    source: input.source,
    travelCurrencyCode: input.travelCurrencyCode,
    travelAmountForeign: input.travelAmountForeign,
  });

  return toTransactionResponse(record);
}

export async function deleteTransaction(clerkUserId: string, transactionId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await transactionRepository.findTransactionById(user.id, transactionId);
  if (!existing) {
    throw new NotFoundError('Transaction', transactionId);
  }

  await transactionRepository.deleteTransaction(user.id, transactionId);
}
