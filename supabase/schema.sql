-- Meu Semestre: um documento JSON por aluno, protegido por RLS
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

drop policy if exists "dono le" on public.user_data;
drop policy if exists "dono insere" on public.user_data;
drop policy if exists "dono atualiza" on public.user_data;
drop policy if exists "dono apaga" on public.user_data;
create policy "dono le"       on public.user_data for select using (auth.uid() = user_id);
create policy "dono insere"   on public.user_data for insert with check (auth.uid() = user_id);
create policy "dono atualiza" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono apaga"    on public.user_data for delete using (auth.uid() = user_id);
