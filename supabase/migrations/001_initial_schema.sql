-- Expense Tracker — initial schema (Supabase Postgres)
-- Run in Supabase SQL Editor or via supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users (synced from Clerk on first API call)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null default '',
  name text not null default '',
  date_of_birth text not null default '',
  user_type text not null default 'Student'
    check (user_type in ('Student', 'Professional', 'Self Employed', 'Retired')),
  gender text not null default 'Male'
    check (gender in ('Male', 'Female')),
  avatar_url text,
  has_completed_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_clerk_user_id_idx on public.users (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  type text not null check (type in ('cash', 'bank', 'person')),
  name text not null,
  opening_balance numeric(18, 2) not null default 0,
  deactivated boolean not null default false,
  bank_name text,
  bank_key text,
  icon_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists accounts_clerk_user_id_idx on public.accounts (clerk_user_id);

-- ---------------------------------------------------------------------------
-- Soft-deleted account names (for transaction history labels)
-- ---------------------------------------------------------------------------
create table if not exists public.deleted_account_names (
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  account_id text not null,
  name text not null,
  primary key (clerk_user_id, account_id)
);

-- ---------------------------------------------------------------------------
-- Transactions (schema mirrors mobile app; API routes added in a later phase)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id text not null,
  clerk_user_id text not null references public.users (clerk_user_id) on delete cascade,
  transaction_type text not null
    check (transaction_type in ('expense', 'income', 'transfer', 'people')),
  amount numeric(18, 2) not null,
  category_key text,
  selected_account text,
  selected_pay_from text,
  selected_pay_to text,
  selected_people_pay_from text,
  selected_people_pay_to text,
  people_mode text check (people_mode in ('pay', 'receive', 'lend', 'borrow')),
  date timestamptz not null,
  description text,
  tags jsonb not null default '[]'::jsonb,
  receipt_url text,
  location text,
  linked_event_id text,
  recurrence jsonb,
  source text,
  travel_currency_code text,
  travel_amount_foreign numeric(18, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clerk_user_id, id)
);

create index if not exists transactions_clerk_user_id_date_idx
  on public.transactions (clerk_user_id, date desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage buckets (run in Supabase Dashboard → Storage if SQL bucket create fails)
-- receipts: private per-user paths receipts/{clerk_user_id}/...
-- avatars:  public or private avatars/{clerk_user_id}/...
-- ---------------------------------------------------------------------------
