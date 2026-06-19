export interface BudgetRecord {
  id: string;
  userId: string;
  categoryKey: string;
  amount: number;
  monthOnly: boolean;
  period: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExcludedRecurringRecord {
  userId: string;
  categoryKey: string;
  period: string;
}

export interface BudgetResponse {
  id: string;
  categoryKey: string;
  amount: number;
  monthOnly: boolean;
  period?: string;
}

export interface BudgetsListResponse {
  budgets: BudgetResponse[];
  excludedRecurring: Array<{ categoryKey: string; period: string }>;
}
