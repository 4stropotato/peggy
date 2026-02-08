-- Peggy Web Push infrastructure
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  subscription jsonb not null,
  enabled boolean not null default true,
  notif_enabled boolean not null default true,
  user_agent text,
  platform text,
  app_base_url text default '/peggy/',
  last_seen_at timestamptz not null default now(),
  last_push_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_key
  on public.push_subscriptions (endpoint);

create unique index if not exists push_subscriptions_user_device_key
  on public.push_subscriptions (user_id, device_id);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (enabled, notif_enabled, last_push_at);

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
using (auth.uid() = user_id);

-- Optional: once push-dispatch edge function is deployed, schedule it with pg_cron.
-- Requires pg_cron + pg_net extensions and project URL + PUSH_CRON_SECRET.
--
-- create extension if not exists pg_net;
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'peggy_push_dispatch_every_15m',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-dispatch',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-push-cron-secret', 'YOUR_PUSH_CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
