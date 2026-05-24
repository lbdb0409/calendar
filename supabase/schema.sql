-- Run this once in your Supabase project: SQL Editor -> paste -> Run.
-- This is single-tenant (just you), so RLS is open. The dad-view URL acts
-- as the soft secret. If you want stricter security later, add an auth layer.

create extension if not exists "pgcrypto";

create table if not exists settings (
  id            int primary key default 1,
  hourly_rate   numeric not null default 50,
  weekly_target numeric not null default 25,
  dad_email     text,
  dad_name      text,
  my_name       text,
  share_token   text not null default encode(gen_random_bytes(16), 'hex'),
  updated_at    timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id) values (1) on conflict do nothing;

create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  text not null,           -- HH:MM
  end_time    text not null,           -- HH:MM
  notes       text,
  status      text not null check (status in ('planned', 'logged')) default 'logged',
  created_at  timestamptz not null default now()
);

create index if not exists entries_date_idx on entries (date);

create table if not exists uni_blocks (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  start_time   text not null,
  end_time     text not null,
  label        text,
  created_at   timestamptz not null default now()
);

-- Safe on a fresh DB AND on an older one that still had day_of_week.
-- Wrapped in DO/EXECUTE because Postgres parses the whole statement up front;
-- referencing day_of_week directly would fail on a clean install.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'uni_blocks' and column_name = 'day_of_week'
  ) then
    execute 'alter table uni_blocks add column if not exists date date';
    execute 'update uni_blocks
               set date = (current_date - extract(dow from current_date)::int + day_of_week)::date
               where date is null';
    execute 'alter table uni_blocks drop column day_of_week';
    execute 'alter table uni_blocks alter column date set not null';
  end if;
end
$$;

create index if not exists uni_blocks_date_idx on uni_blocks (date);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  amount      numeric not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists payments_date_idx on payments (date);
alter table payments enable row level security;
drop policy if exists "open payments" on payments;
create policy "open payments" on payments for all using (true) with check (true);

-- Open read/write for anon. Replace with stricter policies if you add auth.
alter table settings    enable row level security;
alter table entries     enable row level security;
alter table uni_blocks  enable row level security;

drop policy if exists "open settings" on settings;
drop policy if exists "open entries"  on entries;
drop policy if exists "open uni"      on uni_blocks;

create policy "open settings" on settings   for all using (true) with check (true);
create policy "open entries"  on entries    for all using (true) with check (true);
create policy "open uni"      on uni_blocks for all using (true) with check (true);
