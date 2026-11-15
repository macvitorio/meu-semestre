// Cancela a assinatura mensal. O Premium continua até o fim do período já pago.
import { usuario, admin, mp } from './_premium.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login novamente.' });
  const db = admin();
  const { data: a } = await db.from('assinaturas').select('mp_preapproval_id,premium_ate').eq('user_id', user.id).maybeSingle();
  if (!a?.mp_preapproval_id) return res.status(400).json({ error: 'Você não tem assinatura mensal ativa.' });
  try {
    await mp(`/preapproval/${a.mp_preapproval_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
    await db.from('assinaturas').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('user_id', user.id);
    return res.status(200).json({ ok: true, premium_ate: a.premium_ate });
  } catch (e) {
    console.error('cancelar', e.status, e.corpo);
    return res.status(502).json({ error: 'Não foi possível cancelar agora. Tente novamente.' });
  }
}
