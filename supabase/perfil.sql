-- Fotos de perfil (Supabase Storage). Cada aluno só mexe na própria pasta: avatares/<user_id>/...
insert into storage.buckets (id, name, public) values ('avatares', 'avatares', true)
on conflict (id) do update set public = true;

drop policy if exists "avatar leitura publica" on storage.objects;
drop policy if exists "avatar dono envia" on storage.objects;
drop policy if exists "avatar dono atualiza" on storage.objects;
drop policy if exists "avatar dono apaga" on storage.objects;
create policy "avatar leitura publica" on storage.objects for select using (bucket_id = 'avatares');
create policy "avatar dono envia" on storage.objects for insert with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar dono atualiza" on storage.objects for update using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar dono apaga" on storage.objects for delete using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
