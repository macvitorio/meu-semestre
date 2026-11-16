// GET  → meu código, link e resultados das indicações
// POST → { codigo } registra quem indicou esta conta nova (+15 dias de teste)
import { usuario, admin, codigoDe, planoDe, BONUS_INDICADO, BONUS_INDICADOR } from './_premium.js';

export default async function handler(req, res) {
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login novamente.' });
  const db = admin();
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'POST') {
    const codigo = String(req.body?.codigo || '').trim().toUpperCase();
    if (!codigo) return res.status(400).json({ error: 'Código vazio.' });
    if (Date.now() - new Date(user.created_at) > 3 * 864e5) return res.status(200).json({ ok: false, motivo: 'conta_antiga' });
    const { data: dono } = await db.from('codigos').select('user_id').eq('codigo', codigo).maybeSingle();
    if (!dono) return res.status(200).json({ ok: false, motivo: 'codigo_invalido' });
    if (dono.user_id === user.id) return res.status(200).json({ ok: false, motivo: 'proprio' });
    const { error } = await db.from('indicacoes').insert({ indicado_id: user.id, indicador_id: dono.user_id });
    if (error) return res.status(200).json({ ok: false, motivo: 'ja_indicado' });
    const p = await planoDe(db, user);
    const base = Math.max(Date.now(), p.premium_ate ? new Date(p.premium_ate).getTime() : 0);
    await db.from('assinaturas').upsert({ user_id: user.id, plano: p.plano, status: 'ativa', premium_ate: new Date(base + BONUS_INDICADO * 864e5).toISOString(), atualizado_em: new Date().toISOString() });
    return res.status(200).json({ ok: true, bonus: BONUS_INDICADO });
  }

  const codigo = await codigoDe(db, user);
  const { data: lista } = await db.from('indicacoes').select('convertida,criado_em').eq('indicador_id', user.id);
  const { data: fui } = await db.from('indicacoes').select('indicador_id').eq('indicado_id', user.id).maybeSingle();
  res.status(200).json({
    codigo, cadastros: (lista || []).length, assinaram: (lista || []).filter(i => i.convertida).length,
    diasGanhos: (lista || []).filter(i => i.convertida).length * BONUS_INDICADOR,
    fuiIndicado: !!fui, bonusIndicado: BONUS_INDICADO, bonusIndicador: BONUS_INDICADOR,
  });
}
