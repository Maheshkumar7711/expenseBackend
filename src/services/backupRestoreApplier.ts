import * as accountRepository from '../repositories/accountRepository';
import * as budgetRepository from '../repositories/budgetRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as goalRepository from '../repositories/goalRepository';
import * as preferencesRepository from '../repositories/preferencesRepository';
import * as reminderRepository from '../repositories/reminderRepository';
import * as transactionRepository from '../repositories/transactionRepository';
import * as userDataRepository from '../repositories/userDataRepository';
import * as changeLogService from './changeLogService';
import { BadRequestError } from '../errors';
import {
  BACKUP_SCHEMA_VERSION,
  type BackupPayload,
  type BackupPayloadV1,
} from '../types/domain/backup';

const DEFAULT_ACCOUNTS = [
  { id: 'cash', type: 'cash' as const, name: 'Cash', iconKey: 'walletOutline' },
  { id: 'savings', type: 'bank' as const, name: 'Savings', iconKey: 'trendingUpOutline' },
];

async function seedDefaultAccountsIfEmpty(userId: string): Promise<void> {
  const existing = await accountRepository.listAccountsByUser(userId);
  if (existing.length > 0) {
    return;
  }
  await Promise.all(
    DEFAULT_ACCOUNTS.map((account) =>
      accountRepository.createAccount({
        id: account.id,
        userId,
        type: account.type,
        name: account.name,
        openingBalance: 0,
        iconKey: account.iconKey,
      }),
    ),
  );
}

function isBackupPayloadV1(payload: BackupPayload): payload is BackupPayloadV1 {
  return payload.schemaVersion === BACKUP_SCHEMA_VERSION;
}

/**
 * Wipe live domain data and re-apply a backup payload (FK-safe order).
 * Does not delete uploads or the users row; does not touch user_backups.
 */
export async function applyBackupPayloadToLive(
  userId: string,
  payload: BackupPayload,
): Promise<void> {
  if (!isBackupPayloadV1(payload)) {
    throw new BadRequestError(
      `Unsupported backup schema version: ${(payload as { schemaVersion?: number }).schemaVersion ?? 'unknown'}`,
    );
  }

  await userDataRepository.deleteAllUserData(userId);
  await changeLogService.resetSyncStateForUser(userId);

  const prefs = payload.preferences;
  await preferencesRepository.updatePreferences(userId, {
    currencyCode: prefs.currencyCode,
    countryCode: prefs.countryCode,
    financialMonth: prefs.financialMonth,
    decimalPlaces: prefs.decimalPlaces,
    disabledCategoryKeys: payload.categories.disabledCategoryKeys ?? {},
    travelModeOn: prefs.travelModeOn,
    travelSelectedCurrencyCode: prefs.selectedCurrencyCode,
    travelStartDate: prefs.travelStartDate,
    travelEndDate: prefs.travelEndDate,
  });

  for (const cat of payload.categories.customCategories ?? []) {
    await preferencesRepository.createCustomCategory({
      id: cat.id,
      userId,
      name: cat.name,
      linkedToKey: cat.linkedToKey,
      createdAt: cat.updatedAt,
      updatedAt: cat.updatedAt,
    });
  }

  const accounts = payload.accounts.accounts ?? [];
  if (accounts.length === 0) {
    await seedDefaultAccountsIfEmpty(userId);
  } else {
    for (const account of accounts) {
      await accountRepository.createAccount({
        id: account.id,
        userId,
        type: account.type,
        name: account.name,
        openingBalance: account.openingBalance,
        deactivated: account.deactivated,
        bankName: account.bankName,
        bankKey: account.bankKey,
        iconKey: account.iconKey,
        createdAt: account.updatedAt,
        updatedAt: account.updatedAt,
      });
    }
  }

  const deletedNames = payload.accounts.deletedAccountNames ?? {};
  for (const [accountId, name] of Object.entries(deletedNames)) {
    await accountRepository.upsertDeletedAccountName(userId, accountId, name);
  }

  for (const event of payload.events ?? []) {
    await eventRepository.createEvent({
      id: event.id,
      userId,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      createdAt: event.updatedAt,
      updatedAt: event.updatedAt,
    });
  }

  for (const goal of payload.goals.goals ?? []) {
    await goalRepository.createGoal({
      id: goal.id,
      userId,
      name: goal.name,
      targetDate: goal.targetDate,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      iconKey: goal.iconKey,
      tags: goal.tags ?? [],
      achieved: goal.achieved ?? false,
      createdAt: goal.updatedAt,
      updatedAt: goal.updatedAt,
    });
  }

  for (const saving of payload.goals.savingTransactions ?? []) {
    await goalRepository.createSavingTransaction({
      id: saving.id,
      userId,
      goalId: saving.goalId,
      amount: saving.amount,
      date: saving.date,
      sourceAccountKey: saving.sourceAccountKey,
      createdAt: saving.updatedAt,
      updatedAt: saving.updatedAt,
    });
  }

  for (const budget of payload.budgets.budgets ?? []) {
    await budgetRepository.createBudget({
      id: budget.id,
      userId,
      categoryKey: budget.categoryKey,
      amount: budget.amount,
      monthOnly: budget.monthOnly,
      period: budget.period ?? null,
      createdAt: budget.updatedAt,
      updatedAt: budget.updatedAt,
    });
  }

  for (const excluded of payload.budgets.excludedRecurring ?? []) {
    await budgetRepository.upsertExcludedRecurring(
      userId,
      excluded.categoryKey,
      excluded.period,
    );
  }

  for (const reminder of payload.reminders ?? []) {
    await reminderRepository.createReminder({
      id: reminder.id,
      userId,
      title: reminder.title,
      date: reminder.date,
      time: reminder.time,
      interval: reminder.interval,
      createdAt: reminder.updatedAt,
      updatedAt: reminder.updatedAt,
    });
  }

  for (const tx of payload.transactions ?? []) {
    await transactionRepository.createTransaction({
      id: tx.id,
      userId,
      transactionType: tx.transactionType,
      amount: tx.amount,
      categoryKey: tx.categoryKey,
      selectedAccount: tx.selectedAccount,
      selectedPayFrom: tx.selectedPayFrom,
      selectedPayTo: tx.selectedPayTo,
      selectedPeoplePayFrom: tx.selectedPeoplePayFrom,
      selectedPeoplePayTo: tx.selectedPeoplePayTo,
      peopleMode: tx.peopleMode ?? null,
      date: tx.date,
      description: tx.description ?? null,
      tags: tx.tags ?? [],
      receiptUrl: tx.receiptUri ?? null,
      location: tx.location ?? null,
      linkedEventId: tx.linkedEventId ?? null,
      recurrence: tx.recurrence ?? null,
      source: tx.source ?? null,
      travelCurrencyCode: tx.travelCurrencyCode ?? null,
      travelAmountForeign: tx.travelAmountForeign ?? null,
      createdAt: tx.updatedAt,
      updatedAt: tx.updatedAt,
    });
  }
}
