-- Row Level Security for direct mobile → Supabase access (Clerk JWT via anon key)
-- Backend API uses service_role and bypasses RLS — API security unchanged.
-- Requires Clerk third-party auth in Supabase (auth.jwt()->>'sub' = clerk user id).

create or replace function public.is_clerk_owner(row_clerk_user_id text)
returns boolean
language sql
stable
as $$
  select row_clerk_user_id = coalesce((select auth.jwt()->>'sub'), '');
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (public.is_clerk_owner(clerk_user_id));

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated
  with check (public.is_clerk_owner(clerk_user_id));

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (public.is_clerk_owner(clerk_user_id))
  with check (public.is_clerk_owner(clerk_user_id));

-- ---------------------------------------------------------------------------
-- Macro-style policies for clerk_user_id scoped tables
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
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I_select_own on public.%I', tbl, tbl);
    execute format(
      'create policy %I_select_own on public.%I for select to authenticated using (public.is_clerk_owner(clerk_user_id))',
      tbl, tbl
    );

    execute format('drop policy if exists %I_insert_own on public.%I', tbl, tbl);
    execute format(
      'create policy %I_insert_own on public.%I for insert to authenticated with check (public.is_clerk_owner(clerk_user_id))',
      tbl, tbl
    );

    execute format('drop policy if exists %I_update_own on public.%I', tbl, tbl);
    execute format(
      'create policy %I_update_own on public.%I for update to authenticated using (public.is_clerk_owner(clerk_user_id)) with check (public.is_clerk_owner(clerk_user_id))',
      tbl, tbl
    );

    execute format('drop policy if exists %I_delete_own on public.%I', tbl, tbl);
    execute format(
      'create policy %I_delete_own on public.%I for delete to authenticated using (public.is_clerk_owner(clerk_user_id))',
      tbl, tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage objects: receipts/{clerk_user_id}/... and avatars/{clerk_user_id}/...
-- ---------------------------------------------------------------------------
drop policy if exists receipts_select_own on storage.objects;
create policy receipts_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );

drop policy if exists receipts_insert_own on storage.objects;
create policy receipts_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );

drop policy if exists receipts_delete_own on storage.objects;
create policy receipts_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );

drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_clerk_owner((storage.foldername(name))[1])
  );
