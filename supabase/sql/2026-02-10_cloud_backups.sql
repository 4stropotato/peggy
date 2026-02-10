-- Peggy cloud backup table (per-user JSON backup)
-- Run in Supabase SQL Editor (Project -> SQL Editor) once.

create extension if not exists pgcrypto;

create table if not exists public.cloud_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.cloud_backups enable row level security;

drop policy if exists "cloud_backups_select_own" on public.cloud_backups;
create policy "cloud_backups_select_own"
on public.cloud_backups
for select
using (auth.uid() = user_id);

drop policy if exists "cloud_backups_insert_own" on public.cloud_backups;
create policy "cloud_backups_insert_own"
on public.cloud_backups
for insert
with check (auth.uid() = user_id);

drop policy if exists "cloud_backups_update_own" on public.cloud_backups;
create policy "cloud_backups_update_own"
on public.cloud_backups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

