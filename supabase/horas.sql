-- Certificados de horas complementares (privados: só o dono vê)
insert into storage.buckets (id, name, public) values ('certificados', 'certificados', false)
on conflict (id) do update set public = false;

drop policy if exists "cert dono le" on storage.objects;
drop policy if exists "cert dono envia" on storage.objects;
drop policy if exists "cert dono atualiza" on storage.objects;
drop policy if exists "cert dono apaga" on storage.objects;
create policy "cert dono le" on storage.objects for select using (bucket_id = 'certificados' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cert dono envia" on storage.objects for insert with check (bucket_id = 'certificados' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cert dono atualiza" on storage.objects for update using (bucket_id = 'certificados' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cert dono apaga" on storage.objects for delete using (bucket_id = 'certificados' and (storage.foldername(name))[1] = auth.uid()::text);
