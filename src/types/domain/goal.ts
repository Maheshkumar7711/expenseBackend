export interface GoalRecord {
  id: string;
  userId: string;
  name: string;
  targetDate: string;
  targetAmount: number;
  savedAmount: number;
  iconKey: string;
  tags: string[];
  achieved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavingTransactionRecord {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  date: string;
  sourceAccountKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalResponse {
  id: string;
  name: string;
  targetDate: string;
  targetAmount: number;
  savedAmount: number;
  iconKey: string;
  tags: string[];
  achieved?: boolean;
}

export interface SavingTransactionResponse {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  sourceAccountKey: string;
}

export interface GoalsListResponse {
  goals: GoalResponse[];
  savingTransactions: SavingTransactionResponse[];
}
