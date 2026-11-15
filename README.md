# Meu Semestre

PWA para alunos da UFSC controlarem frequência, grade, notas, agenda, estudos e histórico.
O app lê o plano de ensino, prints e PDFs com IA e mostra as mudanças para o aluno revisar antes de aplicar.

- Frontend: HTML/CSS/JS sem build (`index.html`, `app.js`, `styles.css`, `parser.js`)
- Login e banco: Supabase (Google + e-mail/senha, tabela `user_data` com RLS)
- IA: função Vercel `api/extract.js` (Claude) — a chave fica só no servidor
- Estudo de UX/UI: [UX-ESTUDO.md](UX-ESTUDO.md)

## 1. Supabase
1. Crie um projeto em supabase.com.
2. **SQL Editor** → cole e rode `supabase/schema.sql`.
3. **Authentication → Providers**: deixe *Email* ativo. Ative *Google* com o Client ID/Secret criados no Google Cloud Console
   (OAuth client "Web", URI de redirecionamento: `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
4. **Authentication → URL Configuration**: *Site URL* = URL da Vercel; adicione também `http://localhost:3000` em *Redirect URLs*.
5. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.

## 2. Vercel
1. Suba esta pasta para um repositório no GitHub e importe na Vercel (ou `npx vercel`).
2. Em **Settings → Environment Variables** crie:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (console.anthropic.com) — sem ela o app funciona, mas só lê PDFs de texto localmente.
3. Deploy. Atualize a *Site URL* do Supabase com o domínio final.

## Rodar localmente
```
npm install
npx vercel dev
```
Sem variáveis configuradas, o app abre no modo "usar sem conta" (dados só no navegador).
