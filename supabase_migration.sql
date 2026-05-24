-- ============================================================
--  Forage – Supabase Schema Migration
--  Run this in the Supabase SQL Editor:
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────
-- Extends auth.users; created automatically on signup via trigger.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── 2. FRIDGE ITEMS ─────────────────────────────────────────────────────────

create table if not exists public.fridge_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  quantity   numeric,
  unit       text,
  category   text default 'other',
  created_at timestamptz default now()
);

alter table public.fridge_items enable row level security;

create policy "Users manage their own fridge"
  on public.fridge_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists fridge_items_user_idx on public.fridge_items(user_id);


-- ─── 3. RECIPE CACHE ─────────────────────────────────────────────────────────
-- Shared across all users — same ingredient set → same cache row.
-- Spoonacular TOS allows up to 1 hour of caching; TTL enforced in app code.

create table if not exists public.recipe_cache (
  ingredients_hash text primary key,   -- sorted, lowercased CSV of ingredient names
  recipes_json     jsonb not null,
  cached_at        timestamptz default now()
);

-- No RLS needed — cache is read/write for authenticated users
alter table public.recipe_cache enable row level security;

create policy "Authenticated users can read cache"
  on public.recipe_cache for select
  to authenticated
  using (true);

create policy "Authenticated users can write cache"
  on public.recipe_cache for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update cache"
  on public.recipe_cache for update
  to authenticated
  using (true);
