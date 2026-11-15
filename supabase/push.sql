-- Inscrições de notificações (uma por aparelho)
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "dono gerencia" on public.push_subscriptions;
create policy "dono gerencia" on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
