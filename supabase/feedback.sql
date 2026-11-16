-- Ideias e feedback enviados pelo app (botão "Dar ideia" em Configurações)
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  email text,
  tipo text not null default 'ideia' check (tipo in ('ideia','problema','elogio')),
  texto text not null check (char_length(texto) between 3 and 2000),
  criado_em timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback: aluno envia" on public.feedback;
create policy "feedback: aluno envia" on public.feedback for insert to authenticated with check (user_id = auth.uid());
-- leitura só pelo painel admin (service role)
