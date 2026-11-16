// Cria o pagamento no Mercado Pago e devolve o link do checkout.
// semestral: pagamento único (Pix ou cartão) · mensal: assinatura recorrente no cartão
import { PLANOS, usuario, mp, baseUrl } from './_premium.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login para assinar.' });
  if (!process.env.MP_ACCESS_TOKEN) return res.status(503).json({ error: 'Pagamentos ainda não configurados.' });
  const plano = req.body?.plano;
  if (!PLANOS[plano]) return res.status(400).json({ error: 'Plano inválido.' });
  const base = baseUrl(req), p = PLANOS[plano];
  try {
    if (plano === 'semestral') {
      const pref = await mp('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ id: 'premium-semestral', title: p.titulo, quantity: 1, unit_price: p.valor, currency_id: 'BRL' }],
          external_reference: `${user.id}|semestral`,
          back_urls: { success: `${base}/app#/premium/ok`, pending: `${base}/app#/premium/pendente`, failure: `${base}/app#/premium/erro` },
          auto_return: 'approved',
          notification_url: `${base}/api/mp-webhook`,
          statement_descriptor: 'MEUSEMESTRE',
          payment_methods: { installments: 1 },
        }),
      });
      return res.status(200).json({ url: pref.init_point });
    }
    const sub = await mp('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: p.titulo,
        external_reference: user.id,
        payer_email: user.email,
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: p.valor, currency_id: 'BRL' },
        back_url: `${base}/app#/premium/ok`,
        status: 'pending',
      }),
    });
    return res.status(200).json({ url: sub.init_point });
  } catch (e) {
    console.error('assinar', e.status, e.corpo);
    return res.status(502).json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' });
  }
}
