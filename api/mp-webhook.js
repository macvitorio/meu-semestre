// Recebe avisos do Mercado Pago e libera/renova/encerra o Premium.
// Sempre consulta o Mercado Pago de novo (fonte da verdade) antes de gravar.
import crypto from 'node:crypto';
import { PLANOS, admin, mp } from './_premium.js';

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

async function gravarMensal(db, pre) {
  const userId = pre.external_reference;
  if (!userId) return;
  const ativa = pre.status === 'authorized';
  const prox = pre.next_payment_date ? new Date(pre.next_payment_date) : new Date(Date.now() + 31 * 864e5);
  const { data: atual } = await db.from('assinaturas').select('premium_ate').eq('user_id', userId).maybeSingle();
  const premium_ate = ativa ? new Date(prox.getTime() + 2 * 864e5).toISOString() : atual?.premium_ate || null; // cancelada: vale até o fim do período pago
  await db.from('assinaturas').upsert({ user_id: userId, plano: 'mensal', status: ativa ? 'ativa' : pre.status === 'pending' ? 'pendente' : 'cancelada', premium_ate, mp_preapproval_id: pre.id, atualizado_em: new Date().toISOString() });
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
