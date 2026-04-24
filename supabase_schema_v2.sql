-- ============================================================
-- N41 Converter v2 — Schema Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Brands (고객사) ───────────────────────────────────────
create table if not exists public.brands (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  slug        text not null unique,  -- URL-safe: 'urban-outfitters'
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now()
);

-- ── 2. Brand Members ─────────────────────────────────────────
create table if not exists public.brand_members (
  id          uuid default gen_random_uuid() primary key,
  brand_id    uuid references public.brands(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text default 'member',  -- 'owner' | 'member'
  joined_at   timestamptz default now(),
  unique(brand_id, user_id)
);

-- ── 3. Update profiles (brand_id 추가) ───────────────────────
alter table public.profiles
  add column if not exists brand_id uuid references public.brands(id),
  add column if not exists name     text;

-- ── 4. Update templates (scope + brand_id 추가) ──────────────
alter table public.templates
  alter column user_id drop not null,
  add column if not exists scope    text default 'personal',  -- 'personal' | 'brand'
  add column if not exists brand_id uuid references public.brands(id) on delete cascade;

-- ── 5. Notifications table ────────────────────────────────────
create table if not exists public.notifications (
  id          uuid default gen_random_uuid() primary key,
  type        text not null,   -- 'new_signup' | 'brand_invite' etc
  title       text not null,
  body        text,
  data        jsonb,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- ── 6. RLS ────────────────────────────────────────────────────
alter table public.brands        enable row level security;
alter table public.brand_members enable row level security;
alter table public.notifications enable row level security;

-- Brands: admin은 전부, 유저는 본인 brand만
create policy "brands_admin" on public.brands
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "brands_member_read" on public.brands
  for select using (
    exists (
      select 1 from public.brand_members
      where brand_id = brands.id and user_id = auth.uid()
    )
  );

-- Brand members: admin 전부, 본인 row만
create policy "brand_members_admin" on public.brand_members
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "brand_members_self" on public.brand_members
  for select using (user_id = auth.uid());

-- Templates: personal은 본인만, brand는 같은 brand 멤버
create policy "templates_personal" on public.templates
  for all using (
    (scope = 'personal' or scope is null) and user_id = auth.uid()
  );

create policy "templates_brand_read" on public.templates
  for select using (
    scope = 'brand' and exists (
      select 1 from public.brand_members
      where brand_id = templates.brand_id and user_id = auth.uid()
    )
  );

create policy "templates_brand_write" on public.templates
  for insert with check (
    scope = 'brand' and exists (
      select 1 from public.brand_members
      where brand_id = templates.brand_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- Notifications: admin만 읽기/쓰기
create policy "notifications_admin" on public.notifications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- notifications insert는 서버(trigger)에서만
create policy "notifications_insert_all" on public.notifications
  for insert with check (true);

-- ── 7. Update handle_new_user trigger (알림 추가) ─────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    'pending'  -- 모든 신규 가입 → pending (admin 승인 필요)
  )
  on conflict (id) do nothing;

  -- 알림 생성 (admin이 볼 수 있도록)
  insert into public.notifications (type, title, body, data)
  values (
    'new_signup',
    '새 회원가입 요청',
    new.email || '님이 가입을 요청했습니다.',
    jsonb_build_object('email', new.email, 'user_id', new.id)
  );

  return new;
end;
$$;

-- ── 8. Enforce single default template ────────────────────────
create or replace function public.enforce_single_default()
returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.templates
    set is_default = false
    where module = new.module
      and id != new.id
      and (
        (scope = 'personal' and user_id = new.user_id)
        or (scope = 'brand' and brand_id = new.brand_id)
      );
  end if;
  return new;
end;
$$;

-- ── 9. View: brand with member count ──────────────────────────
create or replace view public.brands_with_stats as
select
  b.*,
  count(bm.id) as member_count,
  count(t.id)  as template_count
from public.brands b
left join public.brand_members bm on bm.brand_id = b.id
left join public.templates t on t.brand_id = b.id and t.scope = 'brand'
group by b.id;
