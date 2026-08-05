import type { BackupPayloadV1 } from '../types/domain/backup';
import type { AccountResponse } from '../types/domain/account';

const PROTECTED_ACCOUNT_IDS = new Set(['cash', 'savings']);

function isDefaultAccountUnchanged(account: AccountResponse): boolean {
  if (account.deactivated) {
    return false;
  }
  if (account.id === 'cash') {
    return account.type === 'cash' && account.name === 'Cash' && account.openingBalance === 0;
  }
  if (account.id === 'savings') {
    return account.type === 'bank' && account.name === 'Savings' && account.openingBalance === 0;
  }
  return false;
}

function hasMeaningfulAccounts(payload: BackupPayloadV1): boolean {
  const { accounts, deletedAccountNames } = payload.accounts;
  if (Object.keys(deletedAccountNames ?? {}).length > 0) {
    return true;
  }

  const nonDefaultAccounts = accounts.filter((account) => !PROTECTED_ACCOUNT_IDS.has(account.id));
  if (nonDefaultAccounts.length > 0) {
    return true;
  }

  return accounts.some(
    (account) => PROTECTED_ACCOUNT_IDS.has(account.id) && !isDefaultAccountUnchanged(account),
  );
}

/** True when the snapshot has no user-created financial data worth storing. */
export function isBackupPayloadEmpty(payload: BackupPayloadV1): boolean {
  if (payload.transactions.length > 0) {
    return false;
  }
  if (payload.goals.goals.length > 0 || payload.goals.savingTransactions.length > 0) {
    return false;
  }
  if (payload.budgets.budgets.length > 0 || (payload.budgets.excludedRecurring ?? []).length > 0) {
    return false;
  }
  if (payload.events.length > 0 || payload.reminders.length > 0) {
    return false;
  }
  if (payload.categories.customCategories.length > 0) {
    return false;
  }
  if (Object.keys(payload.categories.disabledCategoryKeys ?? {}).length > 0) {
    return false;
  }
  if (hasMeaningfulAccounts(payload)) {
    return false;
  }

  return true;
}
