import { segredoConfere } from './_premium.js';
// Executado pela Vercel Cron todo dia às 7h (10h UTC): envia resumo do dia para quem ativou lembretes.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const DIAS = { 2: 'Seg', 3: 'Ter', 4: 'Qua', 5: 'Qui', 6: 'Sex', 7: 'Sáb' };
const SLOTS = ['0730', '0820', '0910', '1010', '1100', '1330', '1420', '1510', '1620', '1710', '1830', '1920', '2020', '2110'];
const hojeBR = (desloc = 0) => { const d = new Date(Date.now() + desloc * 864e5); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d); };
const diaSemana = iso => new Date(iso + 'T12:00:00Z').getUTCDay() + 1; // 1=dom ... 7=sáb (padrão UFSC: 2=seg)
const hhmm = h => h.slice(0, 2) + ':' + h.slice(2);

function totalFaltas(m) { return Object.values(m.faltas || {}).reduce((a, n) => a + (+n || 0), 0); }
function restam(m, S) {
  let total = +m.cargaHoraria;
  if (!total && S.semestre?.inicio && S.semestre?.fim) {
    total = 0; const fer = new Set((S.feriados || []).map(f => f.data));
    for (let d = new Date(S.semestre.inicio + 'T12:00:00Z'); d <= new Date(S.semestre.fim + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10); if (fer.has(k) || (m.canceladas || []).includes(k)) continue;
      total += (m.horarios || []).filter(h => +h.dia === d.getUTCDay() + 1).reduce((a, h) => a + (+h.aulas || 0), 0);
    }
  }
  const pres = (parseFloat(S.perfil?.regras?.presenca) || 75) / 100;
  return total ? Math.floor(total * (1 - pres)) - totalFaltas(m) : null;
}

export function resumo(S, hoje = hojeBR(), amanha = hojeBR(1)) {
  const nome = m => m.nome || m.codigo;
  const dentro = !S.semestre?.inicio || (hoje >= S.semestre.inicio && hoje <= (S.semestre.fim || hoje));
  const feriado = (S.feriados || []).find(f => f.data === hoje);
  const aulas = feriado || !dentro ? [] : (S.materias || []).flatMap(m => (m.canceladas || []).includes(hoje) ? [] : (m.horarios || []).filter(h => +h.dia === diaSemana(hoje)).map(h => ({ m, h })))
    .sort((a, b) => a.h.inicio.localeCompare(b.h.inicio));
  const datas = [
    ...(S.materias || []).flatMap(m => (m.avaliacoes || []).filter(a => a.data === hoje || a.data === amanha).map(a => ({ data: a.data, t: `${a.nome} (${nome(m)})` }))),
    ...(S.eventos || []).filter(e => e.data === hoje || e.data === amanha).map(e => ({ data: e.data, t: e.titulo })),
  ];
  const riscos = (S.materias || []).map(m => ({ m, r: restam(m, S) })).filter(o => o.r != null && o.r <= 2 && aulas.some(a => a.m === o.m));
  const linhas = [];
  if (aulas.length) linhas.push(aulas.map(({ m, h }) => `${hhmm(h.inicio)} ${nome(m)}${h.sala ? ' · ' + h.sala : ''}`).join('\n'));
  datas.filter(d => d.data === hoje).forEach(d => linhas.push(`📝 Hoje: ${d.t}`));
  datas.filter(d => d.data === amanha).forEach(d => linhas.push(`📅 Amanhã: ${d.t}`));
  riscos.forEach(({ m, r }) => linhas.push(r < 0 ? `⚠️ ${nome(m)}: limite de faltas ultrapassado` : `⚠️ ${nome(m)}: só pode faltar mais ${r}`));
  if (!linhas.length) return null;
  const title = aulas.length ? `Hoje você tem ${aulas.length} aula${aulas.length > 1 ? 's' : ''}` : feriado ? `${feriado.descricao || 'Feriado'} — sem aula` : 'Lembrete do semestre';
  return { title, body: linhas.join('\n'), tag: 'resumo-' + hoje, url: '/app#/inicio' };
}

export default async function handler(req, res) {
  if (!segredoConfere(req.headers.authorization, process.env.CRON_SECRET)) return res.status(401).json({ error: 'não autorizado' });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:suporte@meusemestre.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const { data: subs, error } = await db.from('push_subscriptions').select('endpoint,user_id,subscription');
  if (error) return res.status(500).json({ error: error.message });
  const ids = [...new Set(subs.map(s => s.user_id))];
  // lembretes diários são do Premium
  const { data: prem } = ids.length ? await db.from('assinaturas').select('user_id,premium_ate,plano').in('user_id', ids) : { data: [] };
  const premium = new Set((prem || []).filter(p => p.premium_ate && new Date(p.premium_ate) > new Date()).map(p => p.user_id));
  // teste grátis acabando: aviso com 3 dias e com 1 dia de antecedência
  const fimTeste = {};
  for (const p of prem || []) if (p.plano === 'teste' && p.premium_ate) { const d = Math.ceil((new Date(p.premium_ate) - Date.now()) / 864e5); if (d === 3 || d === 1) fimTeste[p.user_id] = d; }
  const comRegistro = new Set((prem || []).map(p => p.user_id));
  for (const id of ids) if (!comRegistro.has(id)) { const { data: u } = await db.auth.admin.getUserById(id); if (u?.user && Date.now() - new Date(u.user.created_at) < 30 * 864e5) premium.add(id); }
  const { data: rows } = ids.length ? await db.from('user_data').select('user_id,data').in('user_id', ids) : { data: [] };
  const porUser = Object.fromEntries((rows || []).map(r => [r.user_id, r.data]));

  let enviados = 0, removidos = 0;
  await Promise.all(subs.map(async s => {
    const S = porUser[s.user_id]; if (!S || S.perfil?.notif === false || !premium.has(s.user_id)) return;
    let msg = resumo(S);
    const d = fimTeste[s.user_id];
    if (d) msg = { title: d === 1 ? 'Seu Premium grátis termina amanhã ⏳' : 'Faltam 3 dias do seu Premium grátis', body: 'Assine o semestral por R$ 24,90 (menos de R$ 5/mês) e continue com lembretes, IA e disciplinas ilimitadas.' + (msg ? '\n\n' + msg.body : ''), tag: 'fim-teste', url: '/app#/premium' };
    if (!msg) return;
    try { await webpush.sendNotification(s.subscription, JSON.stringify(msg), { TTL: 6 * 3600 }); enviados++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint); removidos++; } }
  }));
  res.status(200).json({ inscritos: subs.length, enviados, removidos });
}
