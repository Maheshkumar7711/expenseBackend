-- RLS policies using user_id (uuid) instead of clerk_user_id on child tables.
-- Run after 005_user_id_fk.sql. users table still uses clerk_user_id for JWT mapping.

create or replace function public.is_user_owner(row_user_id uuid)
returns boolean
language sql
stable
as $$
  select row_user_id = (
    select u.id
    from public.users u
    where u.clerk_user_id = coalesce(auth.jwt()->>'sub', '')
  );
$$;

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

    execute format(
      'create policy %I_select_own on public.%I for select to authenticated using (public.is_user_owner(user_id))',
      tbl, tbl
    );
    execute format(
      'create policy %I_insert_own on public.%I for insert to authenticated with check (public.is_user_owner(user_id))',
      tbl, tbl
    );
    execute format(
      'create policy %I_update_own on public.%I for update to authenticated using (public.is_user_owner(user_id)) with check (public.is_user_owner(user_id))',
      tbl, tbl
    );
    execute format(
      'create policy %I_delete_own on public.%I for delete to authenticated using (public.is_user_owner(user_id))',
      tbl, tbl
    );
  end loop;
end $$;
