import * as accountRepository from '../repositories/accountRepository';
import { ConflictError, NotFoundError } from '../errors';
import type {
  AccountRecord,
  AccountResponse,
  AccountsListResponse,
  AccountType,
} from '../types/domain/account';
import { ensureUser } from './userService';
import { emitDelete, emitUpsert } from './syncChangeEmitter';

const PROTECTED_ACCOUNT_IDS = new Set(['cash', 'savings']);

function generateAccountId(): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `acc-${Date.now()}-${random}`;
}

function normalizeAccountName(name: string): string {
  return name.trim().toLowerCase();
}

async function loadActiveAccounts(userId: string): Promise<{
  allAccounts: AccountRecord[];
  deletedAccountNames: Record<string, string>;
  activeAccounts: AccountRecord[];
}> {
  const [allAccounts, deletedNames] = await Promise.all([
    accountRepository.listAccountsByUser(userId),
    accountRepository.listDeletedAccountNames(userId),
  ]);
  const deletedAccountNames: Record<string, string> = {};
  for (const entry of deletedNames) {
    deletedAccountNames[entry.accountId] = entry.name;
  }
  const deletedIds = new Set(Object.keys(deletedAccountNames));
  const activeAccounts = allAccounts.filter((account) => !deletedIds.has(account.id));
  return { allAccounts, deletedAccountNames, activeAccounts };
}

function findDuplicateActiveAccount(
  activeAccounts: AccountRecord[],
  name: string,
  excludeAccountId?: string,
): AccountRecord | undefined {
  const nameLower = normalizeAccountName(name);
  return activeAccounts.find(
    (account) =>
      account.id !== excludeAccountId && normalizeAccountName(account.name) === nameLower,
  );
}

function findDeletedNameConflict(
  deletedAccountNames: Record<string, string>,
  name: string,
  excludeAccountId?: string,
): string | undefined {
  const nameLower = normalizeAccountName(name);
  for (const [accountId, tombstoneName] of Object.entries(deletedAccountNames)) {
    if (accountId === excludeAccountId) {
      continue;
    }
    if (normalizeAccountName(tombstoneName) === nameLower) {
      return tombstoneName;
    }
  }
  return undefined;
}

function isAccountNameTaken(
  activeAccounts: AccountRecord[],
  deletedAccountNames: Record<string, string>,
  name: string,
  excludeAccountId?: string,
): boolean {
  if (findDuplicateActiveAccount(activeAccounts, name, excludeAccountId)) {
    return true;
  }
  return findDeletedNameConflict(deletedAccountNames, name, excludeAccountId) != null;
}

function toAccountResponse(account: AccountRecord): AccountResponse {
  const response: AccountResponse = {
    id: account.id,
    type: account.type,
    name: account.name,
    openingBalance: account.openingBalance,
    updatedAt: account.updatedAt,
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

  const deletedIds = new Set(Object.keys(deletedAccountNames));

  return {
    accounts: accounts.filter((account) => !deletedIds.has(account.id)).map(toAccountResponse),
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
  const trimmedName = input.name.trim();
  const { deletedAccountNames, activeAccounts } = await loadActiveAccounts(user.id);

  if (isAccountNameTaken(activeAccounts, deletedAccountNames, trimmedName)) {
    throw new ConflictError(
      'An account with this name already exists',
      'ACCOUNT_NAME_TAKEN',
    );
  }

  const id = input.id ?? generateAccountId();
  const existing = await accountRepository.findAccountById(user.id, id);
  if (existing) {
    const deletedIds = new Set(Object.keys(deletedAccountNames));
    if (!deletedIds.has(existing.id)) {
      return toAccountResponse(existing);
    }
  }

  const account = await accountRepository.createAccount({
    id,
    userId: user.id,
    type: input.type,
    name: trimmedName,
    openingBalance: input.openingBalance,
    deactivated: input.deactivated,
    bankName: input.bankName,
    bankKey: input.bankKey,
    iconKey: input.iconKey,
  });

  const response = toAccountResponse(account);
  await emitUpsert(user.id, 'account', response.id, response);
  return response;
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

  const nextName = input.name?.trim();
  if (
    nextName &&
    normalizeAccountName(nextName) !== normalizeAccountName(existing.name)
  ) {
    const { activeAccounts, deletedAccountNames } = await loadActiveAccounts(user.id);
    if (isAccountNameTaken(activeAccounts, deletedAccountNames, nextName, accountId)) {
      throw new ConflictError(
        'An account with this name already exists',
        'ACCOUNT_NAME_TAKEN',
      );
    }
  }

  const account = await accountRepository.updateAccount(user.id, accountId, {
    ...input,
    ...(nextName ? { name: nextName } : {}),
  });
  const response = toAccountResponse(account);
  await emitUpsert(user.id, 'account', response.id, response);
  return response;
}

export async function deleteAccount(clerkUserId: string, accountId: string): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await accountRepository.findAccountById(user.id, accountId);
  if (!existing) {
    throw new NotFoundError('Account', accountId);
  }

  await accountRepository.upsertDeletedAccountName(user.id, accountId, existing.name);

  await emitDelete(user.id, 'account', accountId, { name: existing.name });

  // Default accounts stay in DB for transaction references; hide via deleted_account_names.
  if (PROTECTED_ACCOUNT_IDS.has(accountId)) {
    return;
  }

  await accountRepository.deleteAccount(user.id, accountId);
}
