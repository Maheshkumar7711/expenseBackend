import * as accountRepository from '../repositories/accountRepository';
import { ConflictError, NotFoundError } from '../errors';
import type {
  AccountRecord,
  AccountResponse,
  AccountsListResponse,
  AccountType,
} from '../types/domain/account';
import { ensureUser } from './userService';

const PROTECTED_ACCOUNT_IDS = new Set(['cash', 'savings']);

function generateAccountId(): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `acc-${Date.now()}-${random}`;
}

function toAccountResponse(account: AccountRecord): AccountResponse {
  const response: AccountResponse = {
    id: account.id,
    type: account.type,
    name: account.name,
    openingBalance: account.openingBalance,
  };

  if (account.deactivated) {
    response.deactivated = true;
  }
  if (account.bankName) {
    response.bankName = account.bankName;
  }
  if (account.bankKey) {
    response.bankKey = account.bankKey;
  }
  if (account.iconKey) {
    response.iconKey = account.iconKey;
  }

  return response;
}

export async function listAccounts(clerkUserId: string): Promise<AccountsListResponse> {
  const user = await ensureUser(clerkUserId);

  const [accounts, deletedNames] = await Promise.all([
    accountRepository.listAccountsByUser(user.id),
    accountRepository.listDeletedAccountNames(user.id),
  ]);

  const deletedAccountNames: Record<string, string> = {};
  for (const entry of deletedNames) {
    deletedAccountNames[entry.accountId] = entry.name;
  }

  return {
    accounts: accounts.map(toAccountResponse),
    deletedAccountNames,
  };
}

export async function getAccount(clerkUserId: string, accountId: string): Promise<AccountResponse> {
  const user = await ensureUser(clerkUserId);

  const account = await accountRepository.findAccountById(user.id, accountId);
  if (!account) {
    throw new NotFoundError('Account', accountId);
  }

  return toAccountResponse(account);
}

export interface CreateAccountInput {
  id?: string;
  type: AccountType;
  name: string;
  openingBalance: number;
  deactivated?: boolean;
  bankName?: string;
  bankKey?: string;
  iconKey?: string;
}

export async function createAccount(
  clerkUserId: string,
  input: CreateAccountInput,
): Promise<AccountResponse> {
  const user = await ensureUser(clerkUserId);

  const id = input.id ?? generateAccountId();
  const existing = await accountRepository.findAccountById(user.id, id);
  if (existing) {
    return toAccountResponse(existing);
  }

  const account = await accountRepository.createAccount({
    id,
    userId: user.id,
    type: input.type,
    name: input.name,
    openingBalance: input.openingBalance,
    deactivated: input.deactivated,
    bankName: input.bankName,
    bankKey: input.bankKey,
    iconKey: input.iconKey,
  });

  return toAccountResponse(account);
}

export interface UpdateAccountInput {
  type?: AccountType;
  name?: string;
  openingBalance?: number;
  deactivated?: boolean;
  bankName?: string | null;
  bankKey?: string | null;
  iconKey?: string | null;
}

export async function updateAccount(
  clerkUserId: string,
  accountId: string,
  input: UpdateAccountInput,
): Promise<AccountResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await accountRepository.findAccountById(user.id, accountId);
  if (!existing) {
    throw new NotFoundError('Account', accountId);
  }

  const account = await accountRepository.updateAccount(user.id, accountId, input);
  return toAccountResponse(account);
}

export async function deleteAccount(clerkUserId: string, accountId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);

  if (PROTECTED_ACCOUNT_IDS.has(accountId)) {
    throw new ConflictError('Default accounts cannot be deleted', 'ACCOUNT_PROTECTED');
  }

  const existing = await accountRepository.findAccountById(user.id, accountId);
  if (!existing) {
    throw new NotFoundError('Account', accountId);
  }

  await accountRepository.upsertDeletedAccountName(user.id, accountId, existing.name);
  await accountRepository.deleteAccount(user.id, accountId);
}
