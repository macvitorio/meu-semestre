import crypto from 'node:crypto';
// Funções compartilhadas do Premium (arquivos que começam com _ não viram rota na Vercel)
import { createClient } from '@supabase/supabase-js';

export const PLANOS = {
  mensal: { titulo: 'Meu Semestre Premium (mensal)', valor: 6.9 },
  semestral: { titulo: 'Meu Semestre Premium (semestre)', valor: 24.9, dias: 183 },
};
export const LIMITE_IA_GRATIS = 3;
export const DIAS_TESTE = 30;
export const ehAdmin = user => !!user?.email && !!user.email_confirmed_at && (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(e => e.trim()).filter(Boolean).includes(user.email.toLowerCase());

// Garante o registro do plano; conta nova ganha DIAS_TESTE de Premium a partir da criação
export async function planoDe(db, user) {
  const { data } = await db.from('assinaturas').select('*').eq('user_id', user.id).maybeSingle();
  if (data) return data;
  const fim = new Date(new Date(user.created_at || Date.now()).getTime() + DIAS_TESTE * 864e5);
  const novo = { user_id: user.id, plano: 'teste', status: 'ativa', premium_ate: fim.toISOString(), atualizado_em: new Date().toISOString() };
  const { error } = await db.from('assinaturas').insert(novo);
  if (error) { const { data: d2 } = await db.from('assinaturas').select('*').eq('user_id', user.id).maybeSingle(); return d2 || novo; }
  // conta realmente nova (criada nas últimas 48h): avisa os admins
  if (Date.now() - new Date(user.created_at || 0) < 2 * 864e5) {
    const { count } = await db.from('assinaturas').select('user_id', { count: 'exact', head: true });
    await avisarAdmins(db, { title: '🎉 Novo usuário no Meu Semestre', body: `${user.user_metadata?.full_name || user.email} acabou de entrar.${count ? ` Agora são ${count} contas.` : ''}`, tag: 'novo-' + user.id, url: '/app#/admin' }).catch(() => { });
  }
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
export const LIMITE_IA_DIA = 40; // teto diário para qualquer plano (protege contra abuso e custo)
const hojeChave = () => 'dia:' + new Date().toISOString().slice(0, 10);
export async function podeUsarIA(db, user) {
  const premium = await ehPremium(db, user);
  const { data: rows } = await db.from('ia_uso').select('periodo,usos').eq('user_id', user.id).in('periodo', [periodo(), hojeChave()]);
  const usos = rows?.find(r => r.periodo === periodo())?.usos || 0, usosDia = rows?.find(r => r.periodo === hojeChave())?.usos || 0;
  if (usosDia >= LIMITE_IA_DIA) return { ok: false, premium, usos, usosDia, motivo: 'dia' };
  return { ok: premium || usos < LIMITE_IA_GRATIS, premium, usos, usosDia, motivo: 'plano' };
}
export async function registrarUsoIA(db, user, q) {
  const linhas = [{ user_id: user.id, periodo: hojeChave(), usos: q.usosDia + 1 }];
  if (!q.premium) linhas.push({ user_id: user.id, periodo: periodo(), usos: q.usos + 1 });
  await db.from('ia_uso').upsert(linhas);
}
export function segredoConfere(recebido, esperado) {
  const a = Buffer.from(String(recebido || '')), b = Buffer.from('Bearer ' + String(esperado || ''));
  return !!esperado && a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ===== Notificações push =====
import webpush from 'web-push';
let vapidOk = false;
function vapid() { if (!vapidOk) { webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:suporte@meusemestre.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY); vapidOk = true; } }
export async function enviarPush(db, subs, msg) {
  if (!process.env.VAPID_PRIVATE_KEY) return { enviados: 0, removidos: 0 };
  vapid(); let enviados = 0, removidos = 0;
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification(s.subscription, JSON.stringify(msg), { TTL: 24 * 3600 }); enviados++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint); removidos++; } }
  }));
  return { enviados, removidos };
}
export async function idsAdmins(db) {
  const emails = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(e => e.trim()).filter(Boolean);
  const ids = [];
  for (let page = 1; page <= 20 && ids.length < emails.length; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users || []) if (u.email && emails.includes(u.email.toLowerCase())) ids.push(u.id);
    if ((data?.users || []).length < 200) break;
  }
  return ids;
}
export async function avisarAdmins(db, msg) {
  const ids = await idsAdmins(db); if (!ids.length) return { enviados: 0 };
  const { data: subs } = await db.from('push_subscriptions').select('endpoint,subscription').in('user_id', ids);
  return enviarPush(db, subs || [], msg);
}
