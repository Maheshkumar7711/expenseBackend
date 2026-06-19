export type AccountType = 'cash' | 'bank' | 'person';

export interface AccountRecord {
  id: string;
  userId: string;
  type: AccountType;
  name: string;
  openingBalance: number;
  deactivated: boolean;
  bankName: string | null;
  bankKey: string | null;
  iconKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeletedAccountNameRecord {
  userId: string;
  accountId: string;
  name: string;
}

export interface AccountResponse {
  id: string;
  type: AccountType;
  name: string;
  openingBalance: number;
  deactivated?: boolean;
  bankName?: string;
  bankKey?: string;
  iconKey?: string;
}

export interface AccountsListResponse {
  accounts: AccountResponse[];
  deletedAccountNames: Record<string, string>;
}
