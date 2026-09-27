-- =========================================================
-- P-Fitness Membership System — 0001_schema.sql
-- Run this FIRST in the Supabase SQL Editor.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin
  create type membership_plan as enum ('1_month', '3_months', '1_year');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_status as enum ('pending', 'active', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type history_action as enum ('registration', 'payment_confirmed', 'activation', 'renewal', 'cancellation');
exception when duplicate_object then null; end $$;

-- ---------- App settings (single row; controls DEMO_MODE server-side) ----------
create table if not exists app_settings (
  id boolean primary key default true,
  demo_mode boolean not null default true,
  constraint app_settings_singleton check (id = true)
);
insert into app_settings (id, demo_mode) values (true, true)
  on conflict (id) do nothing;

-- ---------- Staff (owner/manager/staff — distinct from public customers) ----------
create table if not exists staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role staff_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- ---------- Members / registrations ----------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_id text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  membership_plan membership_plan not null,
  membership_price integer not null,
  registration_date timestamptz not null default now(),
  payment_status payment_status not null default 'pending',
  membership_status membership_status not null default 'pending',
  start_date date,
  end_date date,
  qr_identifier text not null unique default encode(gen_random_bytes(16), 'hex'),
  confirmation_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one PENDING or ACTIVE membership per email / phone at a time.
-- This is the server-side (database-level) duplicate-prevention mechanism.
create unique index if not exists members_email_active_uidx
  on members (lower(email))
  where membership_status in ('pending', 'active');

create unique index if not exists members_phone_active_uidx
  on members (phone)
  where membership_status in ('pending', 'active');

create index if not exists members_status_idx on members (membership_status);
create index if not exists members_end_date_idx on members (end_date);
create index if not exists members_qr_idx on members (qr_identifier);

-- ---------- Membership history (renewals / registrations / payment events) ----------
create table if not exists membership_history (
  id uuid primary key default gen_random_uuid(),
  member_uuid uuid not null references members(id) on delete cascade,
  action history_action not null,
  membership_plan membership_plan not null,
  membership_price integer not null,
  payment_status payment_status not null,
  start_date date,
  end_date date,
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists membership_history_member_idx on membership_history (member_uuid);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_set_updated_at on members;
create trigger members_set_updated_at
  before update on members
  for each row execute function set_updated_at();
