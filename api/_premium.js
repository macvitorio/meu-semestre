// Funções compartilhadas do Premium (arquivos que começam com _ não viram rota na Vercel)
import { createClient } from '@supabase/supabase-js';

export const PLANOS = {
  mensal: { titulo: 'Meu Semestre Premium (mensal)', valor: 6.9 },
  semestral: { titulo: 'Meu Semestre Premium (semestre)', valor: 24.9, dias: 183 },
};
export const LIMITE_IA_GRATIS = 3;
export const DIAS_TESTE = 30;
export const ehAdmin = user => !!user?.email && (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(e => e.trim()).filter(Boolean).includes(user.email.toLowerCase());

// Garante o registro do plano; conta nova ganha DIAS_TESTE de Premium a partir da criação
export async function planoDe(db, user) {
  const { data } = await db.from('assinaturas').select('*').eq('user_id', user.id).maybeSingle();
  if (data) return data;
  const fim = new Date(new Date(user.created_at || Date.now()).getTime() + DIAS_TESTE * 864e5);
  const novo = { user_id: user.id, plano: 'teste', status: 'ativa', premium_ate: fim.toISOString(), atualizado_em: new Date().toISOString() };
  await db.from('assinaturas').upsert(novo);
  return novo;
}
export const periodo = (d = new Date()) => `${d.getFullYear()}.${d.getMonth() < 6 ? 1 : 2}`;

export const admin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });

export async function usuario(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await anon().auth.getUser(token);
  return data?.user || null;
}
export async function ehPremium(db, user) {
  const p = await planoDe(db, user);
  return !!(p.premium_ate && new Date(p.premium_ate) > new Date());
}
export async function mp(caminho, opts = {}) {
  const r = await fetch('https://api.mercadopago.com' + caminho, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(corpo.message || 'Erro no Mercado Pago'), { status: r.status, corpo });
  return corpo;
}
export const baseUrl = req => process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
