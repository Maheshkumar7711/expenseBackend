import { listAccounts } from './accountService';
import { listBudgets } from './budgetService';
import { listEvents } from './eventService';
import { listGoals } from './goalService';
import { getPreferencesBootstrap } from './preferencesService';
import { listReminders } from './reminderService';
import { listAllTransactionsForSync } from './transactionService';
import { ensureUser, buildMeResponse } from './userService';
import * as changeLogService from './changeLogService';
import type { AccountsListResponse } from '../types/domain/account';
import type { BudgetsListResponse } from '../types/domain/budget';
import type { EventResponse } from '../types/domain/event';
import type { GoalsListResponse } from '../types/domain/goal';
import type { CategoriesStateResponse, UserPreferencesResponse } from '../types/domain/preferences';
import type { ReminderResponse } from '../types/domain/reminder';
import type { TransactionResponse } from '../types/domain/transaction';
import type { MeResponse } from '../types/domain/user';
import type { SyncMeta } from '../types/domain/sync';

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
  meta: SyncMeta;
}

/** Single round-trip bootstrap: profile, preferences, and all domain lists. */
export async function getBootstrapSync(clerkUserId: string): Promise<BootstrapSyncData> {
  const user = await ensureUser(clerkUserId);
  await changeLogService.ensureUserSyncState(user.id);

  const [
    serverRevision,
    { preferences, categories },
    accounts,
    transactions,
    budgets,
    goals,
    events,
    reminders,
  ] = await Promise.all([
    changeLogService.getServerRevision(user.id),
    getPreferencesBootstrap(clerkUserId),
    listAccounts(clerkUserId),
    listAllTransactionsForSync(clerkUserId),
    listBudgets(clerkUserId),
    listGoals(clerkUserId),
    listEvents(clerkUserId),
    listReminders(clerkUserId),
  ]);

  return {
    me: buildMeResponse(user),
    preferences,
    categories,
    accounts,
    transactions,
    budgets,
    goals,
    events,
    reminders,
    meta: { serverRevision },
  };
}
