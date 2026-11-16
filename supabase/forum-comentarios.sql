-- Comentários (discussão dentro de cada publicação e de cada resposta) + limite diário de arquivos
-- Rode no SQL Editor depois do forum.sql.

create table if not exists public.forum_comentarios (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.forum_posts(id) on delete cascade,
  resposta_id bigint references public.forum_respostas(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  autor_nome text, autor_curso text, autor_foto text,
  texto text not null check (char_length(texto) between 1 and 600),
  denuncias int not null default 0,
  oculto boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists forum_comentarios_post on public.forum_comentarios (post_id, criado_em);

-- autor pelo servidor + anti-spam (agora cobre comentários também)
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
  elsif tg_table_name = 'forum_respostas' then
    select count(*) into n from public.forum_respostas where user_id = auth.uid() and criado_em > now() - interval '10 minutes';
    if n >= 15 then raise exception 'Calma! Muitas respostas em pouco tempo. Tente de novo daqui a pouco.'; end if;
  else
    select count(*) into n from public.forum_comentarios where user_id = auth.uid() and criado_em > now() - interval '10 minutes';
    if n >= 30 then raise exception 'Calma! Muitos comentários em pouco tempo. Tente de novo daqui a pouco.'; end if;
    if new.resposta_id is not null and not exists (select 1 from public.forum_respostas r where r.id = new.resposta_id and r.post_id = new.post_id) then
      raise exception 'Resposta inválida.';
    end if;
  end if;
  new.denuncias := 0; new.oculto := false;
  if tg_table_name <> 'forum_comentarios' then new.votos := 0; end if;
  return new;
end $$;
drop trigger if exists forum_comentarios_autor on public.forum_comentarios;
create trigger forum_comentarios_autor before insert on public.forum_comentarios for each row execute function public.forum_autor();

-- comentário novo também "sobe" a publicação na lista
create or replace function public.forum_comentario_atividade() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.forum_posts set atividade_em = now() where id = new.post_id; return null; end $$;
drop trigger if exists forum_comentarios_ativ on public.forum_comentarios;
create trigger forum_comentarios_ativ after insert on public.forum_comentarios for each row execute function public.forum_comentario_atividade();

-- denúncias em comentários
alter table public.forum_denuncias drop constraint if exists forum_denuncias_alvo_check;
alter table public.forum_denuncias add constraint forum_denuncias_alvo_check check (alvo in ('post','resposta','comentario'));
create or replace function public.forum_conta_denuncias() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.alvo = 'post' then update public.forum_posts set denuncias = denuncias + 1, oculto = (denuncias + 1 >= 3) or oculto where id = new.alvo_id;
  elsif new.alvo = 'resposta' then update public.forum_respostas set denuncias = denuncias + 1, oculto = (denuncias + 1 >= 3) or oculto where id = new.alvo_id;
  else update public.forum_comentarios set denuncias = denuncias + 1, oculto = (denuncias + 1 >= 3) or oculto where id = new.alvo_id; end if;
  return null;
end $$;

alter table public.forum_comentarios enable row level security;
drop policy if exists "forum com le" on public.forum_comentarios;
drop policy if exists "forum com cria" on public.forum_comentarios;
drop policy if exists "forum com apaga" on public.forum_comentarios;
create policy "forum com le" on public.forum_comentarios for select to authenticated using (not oculto or user_id = auth.uid());
create policy "forum com cria" on public.forum_comentarios for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.forum_posts p where p.id = post_id and not p.oculto));
create policy "forum com apaga" on public.forum_comentarios for delete to authenticated using (user_id = auth.uid());

-- Arquivos: máximo 15 por aluno por dia e 5 MB por arquivo (protege o armazenamento)
update storage.buckets set file_size_limit = 5242880 where id = 'forum';
drop policy if exists "forum arq envia" on storage.objects;
create policy "forum arq envia" on storage.objects for insert to authenticated with check (
  bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text
  and (select count(*) from storage.objects o where o.bucket_id = 'forum' and o.owner = auth.uid() and o.created_at > now() - interval '1 day') < 15
);
