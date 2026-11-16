// Confere direto no Mercado Pago se o aluno tem assinatura/pagamento aprovado
// (não depende do webhook chegar). Chamado pela tela de retorno do pagamento.
import { usuario, admin, mp, PLANOS, recompensarIndicador } from './_premium.js';
import { gravarMensal } from './mp-webhook.js';

export default async function handler(req, res) {
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login novamente.' });
  if (!process.env.MP_ACCESS_TOKEN) return res.status(200).json({ ok: false });
  const db = admin(), achados = {};
  try {
    // assinatura mensal mais recente deste aluno
    const subs = await mp(`/preapproval/search?external_reference=${encodeURIComponent(user.id)}&sort=date_created:desc&limit=5`);
    const pre = (subs.results || []).find(p => p.status === 'authorized') || (subs.results || [])[0];
    if (pre) { await gravarMensal(db, pre); achados.mensal = pre.status; }
    // pagamento semestral aprovado ainda não registrado
    const pags = await mp(`/v1/payments/search?external_reference=${encodeURIComponent(user.id + '|semestral')}&status=approved&sort=date_created&criteria=desc&limit=5`);
    for (const pg of pags.results || []) {
      const { error: dup } = await db.from('pagamentos').insert({ id: String(pg.id), user_id: user.id, plano: 'semestral', valor: pg.transaction_amount, status: pg.status });
      if (dup) continue;
      const { data: atual } = await db.from('assinaturas').select('premium_ate').eq('user_id', user.id).maybeSingle();
      const inicio = Math.max(Date.now(), atual?.premium_ate ? new Date(atual.premium_ate).getTime() : 0);
      await db.from('assinaturas').upsert({ user_id: user.id, plano: 'semestral', status: 'ativa', premium_ate: new Date(inicio + PLANOS.semestral.dias * 864e5).toISOString(), ultimo_pagamento: String(pg.id), atualizado_em: new Date().toISOString() });
      achados.semestral = 'approved';
      await recompensarIndicador(db, user.id);
    }
    res.status(200).json({ ok: true, achados });
  } catch (e) {
    console.error('verificar', e.status, e.corpo || e.message);
    res.status(200).json({ ok: false, erro: e.corpo?.message || e.message });
  }
}
