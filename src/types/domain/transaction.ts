export type TransactionType = 'expense' | 'income' | 'transfer' | 'people';

export type PeopleMode = 'pay' | 'receive' | 'lend' | 'borrow';

export type RecurrenceFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Never';

export interface RecurrenceSettings {
  frequency: RecurrenceFrequency;
  time: string;
  dayOfMonth: number;
  weekday: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  transactionType: TransactionType;
  amount: number;
  categoryKey: string | null;
  selectedAccount: string | null;
  selectedPayFrom: string | null;
  selectedPayTo: string | null;
  selectedPeoplePayFrom: string | null;
  selectedPeoplePayTo: string | null;
  peopleMode: PeopleMode | null;
  date: string;
  description: string | null;
  tags: string[];
  receiptUrl: string | null;
  location: string | null;
  linkedEventId: string | null;
  recurrence: RecurrenceSettings | null;
  source: string | null;
  travelCurrencyCode: string | null;
  travelAmountForeign: number | null;
  createdAt: string;
  updatedAt: string;
}

/** API response — mirrors mobile Transaction (receiptUri maps from receiptUrl). */
export interface TransactionResponse {
  id: string;
  transactionType: TransactionType;
  amount: number;
  categoryKey: string | null;
  selectedAccount: string | null;
  selectedPayFrom: string | null;
  selectedPayTo: string | null;
  selectedPeoplePayFrom: string | null;
  selectedPeoplePayTo: string | null;
  peopleMode?: PeopleMode;
  date: string;
  description?: string;
  tags: string[];
  receiptUri?: string | null;
  location?: string | null;
  linkedEventId?: string | null;
  recurrence?: RecurrenceSettings | null;
  source?: 'atm';
  travelCurrencyCode?: string | null;
  travelAmountForeign?: number | null;
  updatedAt: string;
}

export interface TransactionsListResponse {
  transactions: TransactionResponse[];
}
