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

// ---------- Indicação ----------
export const BONUS_INDICADO = 15, BONUS_INDICADOR = 30;
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export async function codigoDe(db, user) {
  const { data } = await db.from('codigos').select('codigo').eq('user_id', user.id).maybeSingle();
  if (data) return data.codigo;
  const base = (user.user_metadata?.full_name || user.email || 'ALUNO').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'ALUNO';
  for (let i = 0; i < 6; i++) {
    const cod = base + Array.from({ length: 3 }, () => ALFA[Math.floor(Math.random() * ALFA.length)]).join('');
    const { error } = await db.from('codigos').insert({ user_id: user.id, codigo: cod });
    if (!error) return cod;
  }
  throw new Error('não foi possível gerar o código');
}
// chamado quando um aluno passa a pagar: recompensa quem indicou (uma vez só)
export async function recompensarIndicador(db, indicadoId) {
  const { data: ind } = await db.from('indicacoes').update({ convertida: true, recompensado_em: new Date().toISOString() })
    .eq('indicado_id', indicadoId).eq('convertida', false).select('indicador_id').maybeSingle();
  if (!ind) return;
  const { data: a } = await db.from('assinaturas').select('*').eq('user_id', ind.indicador_id).maybeSingle();
  if (a?.plano === 'cortesia') return;
  const base = Math.max(Date.now(), a?.premium_ate ? new Date(a.premium_ate).getTime() : 0);
  await db.from('assinaturas').upsert({
    user_id: ind.indicador_id, plano: a?.plano && !['gratis'].includes(a.plano) ? a.plano : 'manual', status: 'ativa',
    premium_ate: new Date(base + BONUS_INDICADOR * 864e5).toISOString(), dias_bonus: (a?.dias_bonus || 0) + BONUS_INDICADOR,
    mp_preapproval_id: a?.mp_preapproval_id || null, atualizado_em: new Date().toISOString(),
  });
}

// Limite de leituras com IA do plano grátis (compartilhado entre planos de ensino, certificados e regulamentos)
export async function podeUsarIA(db, user) {
  const premium = await ehPremium(db, user);
  if (premium) return { ok: true, premium, usos: 0 };
  const { data: u } = await db.from('ia_uso').select('usos').eq('user_id', user.id).eq('periodo', periodo()).maybeSingle();
  const usos = u?.usos || 0;
  return { ok: usos < LIMITE_IA_GRATIS, premium, usos };
}
export async function registrarUsoIA(db, user, q) {
  if (!q.premium) await db.from('ia_uso').upsert({ user_id: user.id, periodo: periodo(), usos: q.usos + 1 });
}
