-- Ensure RLS policies exist for tasks and progress_history
do $$ begin
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Users manage own tasks') then
    execute 'create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='progress_history' and policyname='Users manage own progress') then
    execute 'create policy "Users manage own progress" on public.progress_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;

-- Ensure RLS is enabled on both tables
alter table public.tasks enable row level security;
alter table public.progress_history enable row level security;
