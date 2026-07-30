-- Single-slot cloud backup per user (WhatsApp-style overwrite)
-- Run after 008_sync_infrastructure.sql

begin;

create table if not exists public.user_backups (
  user_id uuid primary key references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  schema_version integer not null default 1,
  server_revision_at_backup bigint not null default 0,
  byte_size integer not null default 0,
  payload jsonb not null
);

comment on table public.user_backups is
  'One cloud backup snapshot per user; upsert replaces the previous backup.';

commit;
