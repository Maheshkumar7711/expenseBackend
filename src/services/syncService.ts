import { listAccounts } from './accountService';
import { listBudgets } from './budgetService';
import { listEvents } from './eventService';
import { listGoals } from './goalService';
import { getPreferencesBootstrap } from './preferencesService';
import { listReminders } from './reminderService';
import { listAllTransactionsForSync } from './transactionService';
import { getMe } from './userService';
import type { AccountsListResponse } from '../types/domain/account';
import type { BudgetsListResponse } from '../types/domain/budget';
import type { EventResponse } from '../types/domain/event';
import type { GoalsListResponse } from '../types/domain/goal';
import type { CategoriesStateResponse, UserPreferencesResponse } from '../types/domain/preferences';
import type { ReminderResponse } from '../types/domain/reminder';
import type { TransactionResponse } from '../types/domain/transaction';
import type { MeResponse } from '../types/domain/user';

export interface BootstrapSyncData {
  me: MeResponse;
  preferences: UserPreferencesResponse;
  categories: CategoriesStateResponse;
  accounts: AccountsListResponse;
  transactions: TransactionResponse[];
  budgets: BudgetsListResponse;
  goals: GoalsListResponse;
  events: EventResponse[];
  reminders: ReminderResponse[];
}

/** Single round-trip bootstrap: profile, preferences, and all domain lists. */
export async function getBootstrapSync(clerkUserId: string): Promise<BootstrapSyncData> {
  // Resolve user once so follow-up queries do not compete with parallel ensureUser work.
  const me = await getMe(clerkUserId);

  const [{ preferences, categories }, accounts, transactions] = await Promise.all([
    getPreferencesBootstrap(clerkUserId),
    listAccounts(clerkUserId),
    listAllTransactionsForSync(clerkUserId),
  ]);

  const [budgets, goals, events, reminders] = await Promise.all([
    listBudgets(clerkUserId),
    listGoals(clerkUserId),
    listEvents(clerkUserId),
    listReminders(clerkUserId),
  ]);

  return {
    me,
    preferences,
    categories,
    accounts,
    transactions,
    budgets,
    goals,
    events,
    reminders,
  };
}
