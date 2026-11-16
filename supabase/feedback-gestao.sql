-- Rode este no SQL Editor (gestão dos feedbacks no Admin)
alter table public.feedback add column if not exists status text not null default 'nova';
alter table public.feedback add column if not exists nota text;
alter table public.feedback add column if not exists atualizado_em timestamptz;
alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback add constraint feedback_status_check check (status in ('nova','planejada','fazendo','feito','descartada'));
