-- Globally unique customer ID per user (6-digit display id for support).
-- Assigned automatically on insert via trigger + sequence.
-- The sequence never decreases when a user is deleted — IDs are not reused (audit/support).

create sequence if not exists public.customer_id_seq start 1;

alter table public.users
  add column if not exists customer_id text;

-- Backfill any existing rows (empty DB after fresh 001–008 has none).
update public.users
set customer_id = lpad(nextval('public.customer_id_seq')::text, 6, '0')
where customer_id is null;

alter table public.users
  alter column customer_id set not null;

create unique index if not exists users_customer_id_idx on public.users (customer_id);

create or replace function public.assign_customer_id()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id is null or new.customer_id = '' then
    new.customer_id := lpad(nextval('public.customer_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists users_assign_customer_id on public.users;

create trigger users_assign_customer_id
before insert on public.users
for each row
execute function public.assign_customer_id();

-- Refresh summary view to expose customer_id for support lookups.
-- Must DROP first: CREATE OR REPLACE cannot insert a column in the middle.
drop view if exists public.v_user_summary;

create view public.v_user_summary as
select
  u.id as user_id,
  u.clerk_user_id,
  u.customer_id,
  u.email,
  u.name,
  u.has_completed_onboarding,
  (select count(*) from public.accounts a where a.user_id = u.id) as account_count,
  (select count(*) from public.transactions t where t.user_id = u.id) as transaction_count,
  u.created_at
from public.users u;

comment on view public.v_user_summary is
  'One row per user with resource counts and customer_id. Start here when debugging.';
