-- Storage buckets for receipt images and profile avatars
-- Run in Supabase SQL Editor after 001 and 002

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'receipts',
    'receipts',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
