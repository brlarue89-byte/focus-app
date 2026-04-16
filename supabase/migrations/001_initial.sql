-- ─────────────────────────────────────────────────────────────────────────────
-- Focus app — initial schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text,
  email                 text,
  subscribed            boolean not null default false,
  stripe_customer_id    text,
  stripe_subscription_id text,
  trial_start           timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can view own profile') then
    execute 'create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can update own profile') then
    execute 'create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id)';
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can insert own profile') then
    execute 'create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id)';
  end if;
end $$;

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, trial_start)
  values (new.id, new.email, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Tasks ───────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id                    bigserial primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  text                  text not null,
  done                  boolean not null default false,
  color_index           integer not null default 0,
  position              integer not null default 0,
  scheduled_hour        integer,           -- 0–23, null = not scheduled
  scheduled_half_hour   boolean default false,
  scheduled_duration    integer,           -- slots (each = 30 min)
  reminder_active       boolean not null default false,
  created_at            timestamptz not null default now()
);

alter table public.tasks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Users manage own tasks') then
    execute 'create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id)';
  end if;
end $$;

create index if not exists tasks_user_id_idx on public.tasks(user_id);

-- ─── Progress history ─────────────────────────────────────────────────────────

create table if not exists public.progress_history (
  id             bigserial primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  completion_pct integer not null default 0,
  unique (user_id, date)
);

alter table public.progress_history enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='progress_history' and policyname='Users manage own progress') then
    execute 'create policy "Users manage own progress" on public.progress_history for all using (auth.uid() = user_id)';
  end if;
end $$;
