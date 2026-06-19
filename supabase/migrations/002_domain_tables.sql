-- Expense Tracker — budgets, goals, events, reminders, categories, preferences
-- Mirrors mobile Zustand store shapes (expense-tracker)

-- ---------------------------------------------------------------------------
-- Budgets
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  category_key text not null,
  amount numeric(18, 2) not null,
  month_only boolean not null default false,
  period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists budgets_clerk_user_id_idx on public.budgets (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Budget recurring exclusions (per category + month)
-- ---------------------------------------------------------------------------
create table if not exists public.budget_excluded_recurring (
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  category_key text not null,
  period text not null,
  primary key (clerk_user_id, category_key, period)
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  name text not null,
  description text not null default '',
  start_date text not null,
  end_date text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists events_clerk_user_id_idx on public.events (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Savings goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  name text not null,
  target_date text not null,
  target_amount numeric(18, 2) not null,
  saved_amount numeric(18, 2) not null default 0,
  icon_key text not null,
  tags jsonb not null default '[]'::jsonb,
  achieved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists goals_clerk_user_id_idx on public.goals (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Saving transactions (goal contributions)
-- ---------------------------------------------------------------------------
create table if not exists public.saving_transactions (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  goal_id text not null,
  amount numeric(18, 2) not null,
  date timestamptz not null,
  source_account_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id),
  foreign key (clerk_user_id, goal_id)
    references public.goals (clerk_user_id, id) on delete cascade
);

create index if not exists saving_transactions_goal_idx
  on public.saving_transactions (clerk_user_id, goal_id);

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------
create table if not exists public.reminders (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  title text not null,
  reminder_date text not null,
  reminder_time text not null,
  reminder_interval text not null
    check (reminder_interval in ('Monthly', 'Daily', 'Weekly', 'Never')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists reminders_clerk_user_id_idx on public.reminders (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Custom categories (built-in keys are app constants)
-- ---------------------------------------------------------------------------
create table if not exists public.custom_categories (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  name text not null,
  linked_to_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists custom_categories_clerk_user_id_idx
  on public.custom_categories (clerk_user_id);

-- ---------------------------------------------------------------------------
-- User preferences (currency, fiscal month, travel mode, disabled categories)
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  clerk_user_id text primary key references public.users (clerk_user_id) on delete cascade,
  currency_code text not null default 'PKR',
  country_code text not null default 'PAK',
  financial_month text not null default 'January'
    check (financial_month in ('January', 'July')),
  decimal_places smallint not null default 0
    check (decimal_places in (0, 1, 2, 3)),
  disabled_category_keys jsonb not null default '{}'::jsonb,
  travel_mode_on boolean not null default false,
  travel_selected_currency_code text,
  travel_start_date text,
  travel_end_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers for new tables
-- ---------------------------------------------------------------------------
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

drop trigger if exists saving_transactions_set_updated_at on public.saving_transactions;
create trigger saving_transactions_set_updated_at
  before update on public.saving_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

drop trigger if exists custom_categories_set_updated_at on public.custom_categories;
create trigger custom_categories_set_updated_at
  before update on public.custom_categories
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();
