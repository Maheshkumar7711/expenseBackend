-- Migrate child tables from clerk_user_id (text FK) to user_id (uuid FK → users.id).
-- clerk_user_id remains ONLY on public.users for Clerk auth mapping.
-- Run after 001–004. Safe to re-run sections that use IF EXISTS / IF NOT EXISTS.

begin;

-- ---------------------------------------------------------------------------
-- 1. Add user_id + backfill on all tenant-scoped tables
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'accounts',
    'deleted_account_names',
    'transactions',
    'budgets',
    'budget_excluded_recurring',
    'events',
    'goals',
    'saving_transactions',
    'reminders',
    'custom_categories',
    'user_preferences'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists user_id uuid references public.users(id) on delete cascade',
      tbl
    );
    execute format(
      'update public.%I c set user_id = u.id from public.users u where c.clerk_user_id = u.clerk_user_id and c.user_id is null',
      tbl
    );
    execute format('alter table public.%I alter column user_id set not null', tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Drop cross-table FK that references goals(clerk_user_id, id)
-- ---------------------------------------------------------------------------
alter table if exists public.saving_transactions
  drop constraint if exists saving_transactions_clerk_user_id_goal_id_fkey;

-- ---------------------------------------------------------------------------
-- 2b. Drop RLS policies that reference clerk_user_id on child tables.
--     (Created in 004; recreated with user_id in 006.)
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'accounts',
    'deleted_account_names',
    'transactions',
    'budgets',
    'budget_excluded_recurring',
    'events',
    'goals',
    'saving_transactions',
    'reminders',
    'custom_categories',
    'user_preferences'
  ]
  loop
    execute format('drop policy if exists %I_select_own on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_insert_own on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_update_own on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_delete_own on public.%I', tbl, tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Drop old PKs / FKs and recreate with user_id
-- ---------------------------------------------------------------------------

-- accounts
alter table public.accounts drop constraint if exists accounts_clerk_user_id_fkey;
alter table public.accounts drop constraint if exists accounts_pkey;
alter table public.accounts add constraint accounts_pkey primary key (user_id, id);
create index if not exists accounts_user_id_idx on public.accounts (user_id);
alter table public.accounts drop column if exists clerk_user_id;
drop index if exists accounts_clerk_user_id_idx;

-- deleted_account_names
alter table public.deleted_account_names drop constraint if exists deleted_account_names_clerk_user_id_fkey;
alter table public.deleted_account_names drop constraint if exists deleted_account_names_pkey;
alter table public.deleted_account_names add constraint deleted_account_names_pkey primary key (user_id, account_id);
create index if not exists deleted_account_names_user_id_idx on public.deleted_account_names (user_id);
alter table public.deleted_account_names drop column if exists clerk_user_id;

-- transactions
alter table public.transactions drop constraint if exists transactions_clerk_user_id_fkey;
alter table public.transactions drop constraint if exists transactions_pkey;
alter table public.transactions add constraint transactions_pkey primary key (user_id, id);
create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date desc);
alter table public.transactions drop column if exists clerk_user_id;
drop index if exists transactions_clerk_user_id_date_idx;

-- budgets
alter table public.budgets drop constraint if exists budgets_clerk_user_id_fkey;
alter table public.budgets drop constraint if exists budgets_pkey;
alter table public.budgets add constraint budgets_pkey primary key (user_id, id);
create index if not exists budgets_user_id_idx on public.budgets (user_id);
alter table public.budgets drop column if exists clerk_user_id;
drop index if exists budgets_clerk_user_id_idx;

-- budget_excluded_recurring
alter table public.budget_excluded_recurring drop constraint if exists budget_excluded_recurring_clerk_user_id_fkey;
alter table public.budget_excluded_recurring drop constraint if exists budget_excluded_recurring_pkey;
alter table public.budget_excluded_recurring add constraint budget_excluded_recurring_pkey primary key (user_id, category_key, period);
create index if not exists budget_excluded_recurring_user_id_idx on public.budget_excluded_recurring (user_id);
alter table public.budget_excluded_recurring drop column if exists clerk_user_id;

-- events
alter table public.events drop constraint if exists events_clerk_user_id_fkey;
alter table public.events drop constraint if exists events_pkey;
alter table public.events add constraint events_pkey primary key (user_id, id);
create index if not exists events_user_id_idx on public.events (user_id);
alter table public.events drop column if exists clerk_user_id;
drop index if exists events_clerk_user_id_idx;

-- goals
alter table public.goals drop constraint if exists goals_clerk_user_id_fkey;
alter table public.goals drop constraint if exists goals_pkey;
alter table public.goals add constraint goals_pkey primary key (user_id, id);
create index if not exists goals_user_id_idx on public.goals (user_id);
alter table public.goals drop column if exists clerk_user_id;
drop index if exists goals_clerk_user_id_idx;

-- saving_transactions
alter table public.saving_transactions drop constraint if exists saving_transactions_clerk_user_id_fkey;
alter table public.saving_transactions drop constraint if exists saving_transactions_pkey;
alter table public.saving_transactions add constraint saving_transactions_pkey primary key (user_id, id);
create index if not exists saving_transactions_user_goal_idx on public.saving_transactions (user_id, goal_id);
alter table public.saving_transactions drop column if exists clerk_user_id;
drop index if exists saving_transactions_goal_idx;

alter table public.saving_transactions
  add constraint saving_transactions_user_id_goal_id_fkey
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete cascade;

-- reminders
alter table public.reminders drop constraint if exists reminders_clerk_user_id_fkey;
alter table public.reminders drop constraint if exists reminders_pkey;
alter table public.reminders add constraint reminders_pkey primary key (user_id, id);
create index if not exists reminders_user_id_idx on public.reminders (user_id);
alter table public.reminders drop column if exists clerk_user_id;
drop index if exists reminders_clerk_user_id_idx;

-- custom_categories
alter table public.custom_categories drop constraint if exists custom_categories_clerk_user_id_fkey;
alter table public.custom_categories drop constraint if exists custom_categories_pkey;
alter table public.custom_categories add constraint custom_categories_pkey primary key (user_id, id);
create index if not exists custom_categories_user_id_idx on public.custom_categories (user_id);
alter table public.custom_categories drop column if exists clerk_user_id;
drop index if exists custom_categories_clerk_user_id_idx;

-- user_preferences (PK was clerk_user_id)
alter table public.user_preferences drop constraint if exists user_preferences_pkey;
alter table public.user_preferences drop constraint if exists user_preferences_clerk_user_id_fkey;
alter table public.user_preferences add constraint user_preferences_pkey primary key (user_id);
alter table public.user_preferences drop column if exists clerk_user_id;

commit;
