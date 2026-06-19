-- Readable views for Supabase — filter by user_id or clerk_user_id from users table.

create or replace view public.v_accounts_by_user as
select
  a.user_id,
  u.clerk_user_id,
  u.email as user_email,
  u.name as user_name,
  a.id as account_id,
  a.type,
  a.name as account_name,
  a.opening_balance,
  a.deactivated,
  a.bank_name,
  a.bank_key,
  a.icon_key,
  a.created_at,
  a.updated_at
from public.accounts a
join public.users u on u.id = a.user_id;

create or replace view public.v_transactions_by_user as
select
  t.user_id,
  u.clerk_user_id,
  u.email as user_email,
  u.name as user_name,
  t.id as transaction_id,
  t.transaction_type,
  t.amount,
  t.category_key,
  t.selected_account,
  t.selected_pay_from,
  t.selected_pay_to,
  t.description,
  t.date,
  t.tags,
  t.created_at,
  t.updated_at
from public.transactions t
join public.users u on u.id = t.user_id;

create or replace view public.v_user_summary as
select
  u.id as user_id,
  u.clerk_user_id,
  u.email,
  u.name,
  u.has_completed_onboarding,
  (select count(*) from public.accounts a where a.user_id = u.id) as account_count,
  (select count(*) from public.transactions t where t.user_id = u.id) as transaction_count,
  u.created_at
from public.users u;

-- Per-user account list (easy filter: WHERE user_email = '...' OR user_id = '...')
comment on view public.v_accounts_by_user is
  'Accounts with owner email/name. Filter: WHERE user_id = uuid OR clerk_user_id = ''user_...''';

comment on view public.v_transactions_by_user is
  'Transactions with owner email/name. Filter by user_id or clerk_user_id.';

comment on view public.v_user_summary is
  'One row per user with resource counts. Start here when debugging.';
