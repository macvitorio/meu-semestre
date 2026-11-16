// Recebe avisos do Mercado Pago e libera/renova/encerra o Premium.
// Sempre consulta o Mercado Pago de novo (fonte da verdade) antes de gravar.
import crypto from 'node:crypto';
import { PLANOS, admin, mp, recompensarIndicador, avisarAdmins } from './_premium.js';

function assinaturaValida(req, id) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return true; // sem segredo configurado, a checagem é feita só pela consulta à API
  const sig = String(req.headers['x-signature'] || ''), reqId = req.headers['x-request-id'] || '';
  const partes = Object.fromEntries(sig.split(',').map(p => p.trim().split('=')));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${String(id).toLowerCase()};request-id:${reqId};ts:${partes.ts};`;
  const h = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
  return h.length === partes.v1.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(partes.v1));
}

async function avisarNovaAssinatura(db, userId, plano) {
  try {
    const { data } = await db.auth.admin.getUserById(userId); const u = data?.user;
    await avisarAdmins(db, { title: '💰 Nova assinatura!', body: `${u?.user_metadata?.full_name || u?.email || 'Alguém'} assinou o plano ${plano}.`, tag: 'assin-' + userId + '-' + Date.now(), url: '/app#/admin' });
  } catch { }
}
export async function gravarMensal(db, pre) {
  const userId = pre.external_reference;
  if (!userId) return;
  const ativa = pre.status === 'authorized';
  const prox = pre.next_payment_date ? new Date(pre.next_payment_date) : new Date(Date.now() + 31 * 864e5);
  const { data: atual } = await db.from('assinaturas').select('premium_ate,dias_bonus,plano,status').eq('user_id', userId).maybeSingle();
  const bonus = (atual?.dias_bonus || 0) * 864e5; // dias ganhos por indicação continuam valendo
  const premium_ate = ativa ? new Date(prox.getTime() + 2 * 864e5 + bonus).toISOString() : atual?.premium_ate || null; // cancelada: vale até o fim do período pago
  await db.from('assinaturas').upsert({ user_id: userId, plano: 'mensal', status: ativa ? 'ativa' : pre.status === 'pending' ? 'pendente' : 'cancelada', premium_ate, mp_preapproval_id: pre.id, atualizado_em: new Date().toISOString() });
  if (ativa) await recompensarIndicador(db, userId);
  if (ativa && !(atual?.plano === 'mensal' && atual?.status === 'ativa')) await avisarNovaAssinatura(db, userId, 'mensal (R$ 6,90)');
}

export default async function handler(req, res) {
  const tipo = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
  const id = req.query['data.id'] || req.body?.data?.id || req.query.id;
  if (!tipo || !id) return res.status(200).json({ ok: true });
  if (!assinaturaValida(req, id)) return res.status(401).json({ error: 'assinatura inválida' });
  const db = admin();
  try {
    if (tipo === 'payment') {
      const pg = await mp(`/v1/payments/${id}`);
      const [userId, plano] = String(pg.external_reference || '').split('|');
      if (pg.status === 'approved' && plano === 'semestral' && userId) {
        const { error: dup } = await db.from('pagamentos').insert({ id: String(pg.id), user_id: userId, plano, valor: pg.transaction_amount, status: pg.status });
        if (!dup) { // primeira vez que vemos este pagamento
          const { data: atual } = await db.from('assinaturas').select('premium_ate').eq('user_id', userId).maybeSingle();
          const inicio = Math.max(Date.now(), atual?.premium_ate ? new Date(atual.premium_ate).getTime() : 0);
          await db.from('assinaturas').upsert({ user_id: userId, plano: 'semestral', status: 'ativa', premium_ate: new Date(inicio + PLANOS.semestral.dias * 864e5).toISOString(), ultimo_pagamento: String(pg.id), atualizado_em: new Date().toISOString() });
          await recompensarIndicador(db, userId);
          await avisarNovaAssinatura(db, userId, 'semestral (R$ 24,90)');
        }
      }
    } else if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
      await gravarMensal(db, await mp(`/preapproval/${id}`));
    } else if (tipo === 'subscription_authorized_payment') {
      const ap = await mp(`/authorized_payments/${id}`);
      if (ap.preapproval_id) await gravarMensal(db, await mp(`/preapproval/${ap.preapproval_id}`));
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook', tipo, id, e.status, e.corpo || e.message);
    return res.status(500).json({ error: 'falha ao processar' }); // Mercado Pago tenta de novo
  }
}
