-- Endurecimento de segurança do Meu Semestre (pode rodar mais de uma vez)

-- 1) Tamanho máximo dos dados de cada aluno (evita abuso e custos): 2 MB de JSON
alter table public.user_data drop constraint if exists user_data_tamanho;
alter table public.user_data add constraint user_data_tamanho check (pg_column_size(data) < 2000000);

-- 2) Limites de arquivos no armazenamento
update storage.buckets set file_size_limit = 1048576, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'avatares';       -- fotos: 1 MB
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'] where id = 'certificados'; -- certificados: 5 MB

-- 3) Tabelas só do servidor: garante RLS ligada e nenhum acesso direto pelo navegador
alter table public.pagamentos enable row level security;
alter table public.codigos enable row level security;
alter table public.indicacoes enable row level security;
alter table public.ia_uso enable row level security;
alter table public.assinaturas enable row level security;
revoke insert, update, delete on public.assinaturas, public.ia_uso, public.pagamentos, public.codigos, public.indicacoes from anon, authenticated;

-- 4) Quem não está logado não acessa nada das tabelas
revoke all on public.user_data, public.push_subscriptions, public.assinaturas, public.ia_uso, public.pagamentos, public.codigos, public.indicacoes from anon;
