export type ReminderInterval = 'Monthly' | 'Daily' | 'Weekly' | 'Never';

export interface ReminderRecord {
  id: string;
  userId: string;
  title: string;
  date: string;
  time: string;
  interval: ReminderInterval;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderResponse {
  id: string;
  title: string;
  date: string;
  time: string;
  interval: ReminderInterval;
  updatedAt: string;
}
