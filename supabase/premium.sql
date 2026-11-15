-- Assinaturas Premium (gravadas só pelo servidor; o aluno apenas lê a própria)
create table if not exists public.assinaturas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plano text not null default 'gratis',            -- gratis | mensal | semestral
  status text not null default 'inativa',          -- ativa | pendente | cancelada | inativa
  premium_ate timestamptz,                         -- Premium vale até esta data
  mp_preapproval_id text,                          -- assinatura mensal no Mercado Pago
  ultimo_pagamento text,
  atualizado_em timestamptz not null default now()
);
alter table public.assinaturas enable row level security;
drop policy if exists "dono le assinatura" on public.assinaturas;
create policy "dono le assinatura" on public.assinaturas for select using (auth.uid() = user_id);

-- Contador de leituras com IA por semestre (limite do plano grátis)
create table if not exists public.ia_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  periodo text not null,                           -- ex.: 2026.2
  usos int not null default 0,
  primary key (user_id, periodo)
);
alter table public.ia_uso enable row level security;
drop policy if exists "dono le uso" on public.ia_uso;
create policy "dono le uso" on public.ia_uso for select using (auth.uid() = user_id);

-- Pagamentos já processados (evita liberar duas vezes o mesmo pagamento)
create table if not exists public.pagamentos (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  plano text, valor numeric, status text,
  criado_em timestamptz not null default now()
);
alter table public.pagamentos enable row level security;
