-- Programa de indicação
create table if not exists public.codigos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  codigo text not null unique,
  criado_em timestamptz not null default now()
);
create table if not exists public.indicacoes (
  indicado_id uuid primary key references auth.users(id) on delete cascade,
  indicador_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  convertida boolean not null default false,     -- o amigo assinou
  recompensado_em timestamptz
);
create index if not exists indicacoes_indicador on public.indicacoes(indicador_id);
alter table public.codigos enable row level security;
alter table public.indicacoes enable row level security;
-- dias extras ganhos por indicação (somados mesmo na assinatura mensal)
alter table public.assinaturas add column if not exists dias_bonus int not null default 0;
