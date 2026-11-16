# Segurança do Meu Semestre

Revisão feita em 15/11/2026.

## Já aplicado no código
- **XSS:** textos vindos de documentos, nomes e e-mails nunca entram em código executável (revisão de mudanças, confirmação de exclusão no Admin, foto de perfil).
- **Saneamento:** todo dado carregado (nuvem, backup importado, IA) passa por validação de IDs, datas, cores, horários e faltas.
- **Cabeçalhos:** Content-Security-Policy restritiva, X-Frame-Options DENY (anti-clickjacking), HSTS com preload, nosniff, Referrer-Policy e Permissions-Policy.
- **Integridade:** a biblioteca do Supabase é carregada com hash SRI (se for adulterada no CDN, o navegador bloqueia).
- **Admin:** exige e-mail listado em `ADMIN_EMAILS` **e confirmado**; IDs validados; não apaga a própria conta.
- **IA:** login obrigatório, limite do plano grátis e teto diário de 40 leituras por conta em qualquer plano.
- **Rotinas internas:** `CRON_SECRET` comparado em tempo constante.
- **Pagamentos:** webhook confere a assinatura do Mercado Pago e consulta o pagamento direto na API antes de liberar; o aluno não consegue se dar Premium (tabelas só do servidor).
- **Arquivos:** certificados em armazenamento privado (cada aluno só acessa a própria pasta); links temporários de 10 minutos.
- **Segredos:** nenhuma chave no repositório nem no histórico do Git; arquivos `*.local.json` ignorados e fora do deploy.

## Para rodar/configurar (dono do projeto)
1. Supabase → SQL Editor: `supabase/seguranca.sql`.
2. Supabase → Authentication → Sign In / Providers → Email: **Confirm email** ligado; senha mínima 8; **Leaked password protection** ligado (se disponível no plano).
3. Anthropic Console → Limits: limite de gasto mensal.
4. Mercado Pago: `MP_WEBHOOK_SECRET` de produção configurado.
5. Ativar a verificação em duas etapas em GitHub, Vercel, Supabase, Mercado Pago, Google Cloud e Anthropic.
