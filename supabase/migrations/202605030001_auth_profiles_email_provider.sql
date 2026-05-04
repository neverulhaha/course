-- MVP auth profile support.
-- Adds email/provider fields used by check-auth-email without exposing auth.users to the frontend.
-- Also keeps existing profile UI columns available (full_name/app_role).

alter table if exists public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists display_name text,
  add column if not exists provider text,
  add column if not exists app_role text default 'student',
  add column if not exists updated_at timestamptz default now();

update public.profiles
set
  email = lower(trim(email)),
  display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(full_name), '')),
  full_name = coalesce(nullif(trim(full_name), ''), nullif(trim(display_name), '')),
  provider = coalesce(nullif(provider, ''), 'unknown'),
  app_role = coalesce(nullif(app_role, ''), 'student')
where email is not null
   or display_name is not null
   or full_name is not null
   or provider is null
   or app_role is null;

create index if not exists profiles_email_lookup_idx
  on public.profiles (lower(email))
  where email is not null;

alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own') then
    create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own') then
    create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
