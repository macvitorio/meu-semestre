-- Fórum da galera: dúvidas, materiais e discussões entre estudantes
-- Rode tudo de uma vez no SQL Editor do Supabase.

create table if not exists public.forum_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  autor_nome text, autor_curso text, autor_uni text, autor_foto text,
  tipo text not null default 'duvida' check (tipo in ('duvida','material','discussao')),
  titulo text not null check (char_length(titulo) between 5 and 140),
  texto text not null default '' check (char_length(texto) <= 5000),
  disciplina text check (char_length(disciplina) <= 80),
  arquivos jsonb not null default '[]'::jsonb,
  votos int not null default 0,
  respostas int not null default 0,
  melhor_resposta bigint,
  denuncias int not null default 0,
  oculto boolean not null default false,
  criado_em timestamptz not null default now(),
  atividade_em timestamptz not null default now()
);
create index if not exists forum_posts_atividade on public.forum_posts (atividade_em desc);

create table if not exists public.forum_respostas (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  autor_nome text, autor_curso text, autor_foto text,
  texto text not null check (char_length(texto) between 2 and 5000),
  arquivos jsonb not null default '[]'::jsonb,
  votos int not null default 0,
  denuncias int not null default 0,
  oculto boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists forum_respostas_post on public.forum_respostas (post_id, criado_em);

create table if not exists public.forum_votos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alvo text not null check (alvo in ('post','resposta')),
  alvo_id bigint not null,
  primary key (user_id, alvo, alvo_id)
);

create table if not exists public.forum_denuncias (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alvo text not null check (alvo in ('post','resposta')),
  alvo_id bigint not null,
  motivo text check (char_length(motivo) <= 300),
  resolvida boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (user_id, alvo, alvo_id)
);

-- Autor vem do servidor (ninguém consegue se passar por outra pessoa) + limite anti-spam
create or replace function public.forum_autor() returns trigger language plpgsql security definer set search_path = public as $$
declare p jsonb; m jsonb; n int;
begin
  new.user_id := auth.uid();
  select data->'perfil' into p from public.user_data where user_id = auth.uid();
  select raw_user_meta_data into m from auth.users where id = auth.uid();
  new.autor_nome := coalesce(nullif(p->>'nome',''), m->>'full_name', m->>'name', 'Estudante');
  new.autor_curso := nullif(p->>'curso','');
  new.autor_foto := coalesce(nullif(nullif(p->>'foto',''),'none'), m->>'avatar_url');
  if tg_table_name = 'forum_posts' then
    new.autor_uni := nullif(p->>'universidade','');
    select count(*) into n from public.forum_posts where user_id = auth.uid() and criado_em > now() - interval '1 hour';
    if n >= 8 then raise exception 'Calma! Muitas publicações em pouco tempo. Tente de novo daqui a pouco.'; end if;
  else
    select count(*) into n from public.forum_respostas where user_id = auth.uid() and criado_em > now() - interval '10 minutes';
    if n >= 15 then raise exception 'Calma! Muitas respostas em pouco tempo. Tente de novo daqui a pouco.'; end if;
  end if;
  new.votos := 0; new.denuncias := 0; new.oculto := false;
  return new;
end $$;
drop trigger if exists forum_posts_autor on public.forum_posts;
create trigger forum_posts_autor before insert on public.forum_posts for each row execute function public.forum_autor();
drop trigger if exists forum_respostas_autor on public.forum_respostas;
create trigger forum_respostas_autor before insert on public.forum_respostas for each row execute function public.forum_autor();

-- O aluno só edita texto/título/arquivos/melhor resposta; contadores e moderação ficam protegidos
create or replace function public.forum_protege() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    new.user_id := old.user_id; new.autor_nome := old.autor_nome; new.autor_curso := old.autor_curso; new.autor_foto := old.autor_foto;
    new.votos := old.votos; new.denuncias := old.denuncias; new.oculto := old.oculto; new.criado_em := old.criado_em;
    if tg_table_name = 'forum_posts' then
      new.respostas := old.respostas; new.autor_uni := old.autor_uni; new.atividade_em := old.atividade_em;
      if new.melhor_resposta is not null and not exists (select 1 from public.forum_respostas r where r.id = new.melhor_resposta and r.post_id = new.id) then
        new.melhor_resposta := old.melhor_resposta;
      end if;
    else
      new.post_id := old.post_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists forum_posts_protege on public.forum_posts;
create trigger forum_posts_protege before update on public.forum_posts for each row execute function public.forum_protege();
drop trigger if exists forum_respostas_protege on public.forum_respostas;
create trigger forum_respostas_protege before update on public.forum_respostas for each row execute function public.forum_protege();

-- Contadores automáticos
create or replace function public.forum_conta_respostas() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.forum_posts set respostas = respostas + 1, atividade_em = now() where id = new.post_id;
  else update public.forum_posts set respostas = greatest(respostas - 1, 0), melhor_resposta = case when melhor_resposta = old.id then null else melhor_resposta end where id = old.post_id; end if;
  return null;
end $$;
drop trigger if exists forum_respostas_conta on public.forum_respostas;
create trigger forum_respostas_conta after insert or delete on public.forum_respostas for each row execute function public.forum_conta_respostas();

create or replace function public.forum_conta_votos() returns trigger language plpgsql security definer set search_path = public as $$
declare d int := case when tg_op = 'INSERT' then 1 else -1 end; r record;
begin
  r := coalesce(new, old);
  if r.alvo = 'post' then update public.forum_posts set votos = votos + d where id = r.alvo_id;
  else update public.forum_respostas set votos = votos + d where id = r.alvo_id; end if;
  return null;
end $$;
drop trigger if exists forum_votos_conta on public.forum_votos;
create trigger forum_votos_conta after insert or delete on public.forum_votos for each row execute function public.forum_conta_votos();

-- 3 denúncias = some do fórum até o admin revisar
create or replace function public.forum_conta_denuncias() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.alvo = 'post' then update public.forum_posts set denuncias = denuncias + 1, oculto = (denuncias + 1 >= 3) or oculto where id = new.alvo_id;
  else update public.forum_respostas set denuncias = denuncias + 1, oculto = (denuncias + 1 >= 3) or oculto where id = new.alvo_id; end if;
  return null;
end $$;
drop trigger if exists forum_denuncias_conta on public.forum_denuncias;
create trigger forum_denuncias_conta after insert on public.forum_denuncias for each row execute function public.forum_conta_denuncias();

-- Regras de acesso
alter table public.forum_posts enable row level security;
alter table public.forum_respostas enable row level security;
alter table public.forum_votos enable row level security;
alter table public.forum_denuncias enable row level security;

drop policy if exists "forum posts le" on public.forum_posts;
drop policy if exists "forum posts cria" on public.forum_posts;
drop policy if exists "forum posts edita" on public.forum_posts;
drop policy if exists "forum posts apaga" on public.forum_posts;
create policy "forum posts le" on public.forum_posts for select to authenticated using (not oculto or user_id = auth.uid());
create policy "forum posts cria" on public.forum_posts for insert to authenticated with check (user_id = auth.uid());
create policy "forum posts edita" on public.forum_posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "forum posts apaga" on public.forum_posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "forum resp le" on public.forum_respostas;
drop policy if exists "forum resp cria" on public.forum_respostas;
drop policy if exists "forum resp edita" on public.forum_respostas;
drop policy if exists "forum resp apaga" on public.forum_respostas;
create policy "forum resp le" on public.forum_respostas for select to authenticated using (not oculto or user_id = auth.uid());
create policy "forum resp cria" on public.forum_respostas for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.forum_posts p where p.id = post_id and not p.oculto));
create policy "forum resp edita" on public.forum_respostas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "forum resp apaga" on public.forum_respostas for delete to authenticated using (user_id = auth.uid());

drop policy if exists "forum votos le" on public.forum_votos;
drop policy if exists "forum votos cria" on public.forum_votos;
drop policy if exists "forum votos apaga" on public.forum_votos;
create policy "forum votos le" on public.forum_votos for select to authenticated using (user_id = auth.uid());
create policy "forum votos cria" on public.forum_votos for insert to authenticated with check (user_id = auth.uid());
create policy "forum votos apaga" on public.forum_votos for delete to authenticated using (user_id = auth.uid());

drop policy if exists "forum denuncia cria" on public.forum_denuncias;
create policy "forum denuncia cria" on public.forum_denuncias for insert to authenticated with check (user_id = auth.uid());

-- Arquivos dos materiais (qualquer aluno logado lê; cada um só mexe na própria pasta)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum', 'forum', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];
drop policy if exists "forum arq le" on storage.objects;
drop policy if exists "forum arq envia" on storage.objects;
drop policy if exists "forum arq apaga" on storage.objects;
create policy "forum arq le" on storage.objects for select to authenticated using (bucket_id = 'forum');
create policy "forum arq envia" on storage.objects for insert to authenticated with check (bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "forum arq apaga" on storage.objects for delete to authenticated using (bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text);
