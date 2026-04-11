-- ============================================================
-- N41 Converter — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. User profiles (extends auth.users)
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text not null,
  name         text,
  role         text not null default 'pending',  -- 'pending' | 'user' | 'admin'
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. Mapping templates (per user, per module)
create table public.templates (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  module      text not null,  -- 'sales_order' | 'purchase_order' | 'style' | 'customer' | 'inventory'
  name        text not null,
  mapping     jsonb not null,  -- { col: { src, tf, fixedVal } }
  is_default  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. Invitations
create table public.invitations (
  id          uuid default gen_random_uuid() primary key,
  email       text not null unique,
  invited_by  uuid references public.profiles(id),
  status      text default 'pending',  -- 'pending' | 'accepted'
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.templates   enable row level security;
alter table public.invitations enable row level security;

-- Profiles: users see their own; admins see all
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id);

create policy "profiles_admin" on public.profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Templates: users manage their own only
create policy "templates_owner" on public.templates
  for all using (user_id = auth.uid());

-- Invitations: admins manage all
create policy "invitations_admin" on public.invitations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    -- If email was invited, set role to 'user', else 'pending'
    case when exists (
      select 1 from public.invitations
      where email = new.email and status = 'pending'
    ) then 'user' else 'pending' end
  );
  -- Mark invitation as accepted
  update public.invitations set status = 'accepted'
  where email = new.email and status = 'pending';
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helper: only one default template per user per module
-- ============================================================
create or replace function public.enforce_single_default()
returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.templates
    set is_default = false
    where user_id = new.user_id and module = new.module and id != new.id;
  end if;
  return new;
end;
$$;

create trigger single_default_template
  after insert or update on public.templates
  for each row execute function public.enforce_single_default();

-- ============================================================
-- Seed: first admin (replace with your email)
-- ============================================================
-- After you sign up, run this to make yourself admin:
-- update public.profiles set role = 'admin' where email = 'your@email.com';
