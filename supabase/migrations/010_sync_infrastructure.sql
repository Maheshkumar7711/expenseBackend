-- Sync v2 infrastructure: change log, idempotency, soft deletes, revisions
-- Run after 001–009

begin;

-- ---------------------------------------------------------------------------
-- Per-user sync head revision
-- ---------------------------------------------------------------------------
create table if not exists public.user_sync_state (
  user_id uuid primary key references public.users (id) on delete cascade,
  server_revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Append-only change log for incremental pull
-- ---------------------------------------------------------------------------
create table if not exists public.change_log (
  id bigserial primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  revision bigint not null,
  entity_type text not null,
  entity_id text not null,
  operation text not null check (operation in ('upsert', 'delete')),
  payload jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, revision)
);

create index if not exists change_log_user_revision_idx
  on public.change_log (user_id, revision);

-- ---------------------------------------------------------------------------
-- Idempotent batch push deduplication
-- ---------------------------------------------------------------------------
create table if not exists public.processed_operations (
  user_id uuid not null references public.users (id) on delete cascade,
  operation_id text not null,
  entity_type text,
  entity_id text,
  result_status text not null,
  server_revision bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  primary key (user_id, operation_id)
);

create index if not exists processed_operations_expires_idx
  on public.processed_operations (expires_at);

-- ---------------------------------------------------------------------------
-- Soft delete + revision on domain tables
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
      'alter table public.%I add column if not exists deleted_at timestamptz',
      tbl
    );
    execute format(
      'alter table public.%I add column if not exists revision bigint not null default 0',
      tbl
    );
  end loop;
end $$;

-- budget_excluded_recurring + deleted_account_names lacked updated_at
alter table public.budget_excluded_recurring
  add column if not exists updated_at timestamptz not null default now();

alter table public.deleted_account_names
  add column if not exists updated_at timestamptz not null default now();

-- Indexes for incremental queries and active-row filters
create index if not exists transactions_user_revision_idx
  on public.transactions (user_id, revision);

create index if not exists transactions_user_updated_at_idx
  on public.transactions (user_id, updated_at);

create index if not exists accounts_user_revision_idx
  on public.accounts (user_id, revision);

create index if not exists accounts_user_updated_at_idx
  on public.accounts (user_id, updated_at);

create index if not exists budgets_user_revision_idx
  on public.budgets (user_id, revision);

create index if not exists goals_user_revision_idx
  on public.goals (user_id, revision);

create index if not exists events_user_revision_idx
  on public.events (user_id, revision);

create index if not exists reminders_user_revision_idx
  on public.reminders (user_id, revision);

create index if not exists saving_transactions_user_revision_idx
  on public.saving_transactions (user_id, revision);

create index if not exists custom_categories_user_revision_idx
  on public.custom_categories (user_id, revision);

-- Initialize user_sync_state for existing users
insert into public.user_sync_state (user_id, server_revision)
select id, 0 from public.users
on conflict (user_id) do nothing;

commit;
