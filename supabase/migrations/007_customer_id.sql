-- Globally unique customer ID per user (6-digit display id for support).
-- Assigned automatically on insert via trigger + sequence.
-- The sequence never decreases when a user is deleted — IDs are not reused (audit/support).

create sequence if not exists public.customer_id_seq start 1;

alter table public.users
  add column if not exists customer_id text;

-- Backfill any existing rows (empty DB after fresh 001–006 has none).
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
