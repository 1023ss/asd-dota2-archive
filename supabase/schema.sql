-- ASD Dota2 社区档案馆 — Supabase 数据库结构
-- 在 Supabase SQL Editor 中执行此脚本

create table if not exists public.users (
  uid text primary key,
  nickname text not null default '',
  tag text,
  group_id text,
  avatar_url text,
  position text,
  self_description text,
  is_new_player boolean not null default false,
  steam_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.power_records (
  uid text primary key references public.users (uid) on delete cascade,
  base_power numeric,
  activity_bonus numeric,
  performance_adjustment numeric,
  ranking_adjustment numeric,
  current_power numeric,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  event_name text not null,
  event_date date,
  event_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_power_records_current_power
  on public.power_records (current_power desc nulls last);

alter table public.users enable row level security;
alter table public.power_records enable row level security;
alter table public.events enable row level security;

create policy "Public read users"
  on public.users for select
  using (true);

create policy "Public read power_records"
  on public.power_records for select
  using (true);

create policy "Public read events"
  on public.events for select
  using (true);

-- 已有库升级：新增玩家 tag 字段
alter table public.users add column if not exists tag text;
