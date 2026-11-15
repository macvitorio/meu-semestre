// Plano do aluno logado (cria o teste grátis de 30 dias na primeira vez) + se é admin
import { usuario, admin, planoDe, ehAdmin, periodo, LIMITE_IA_GRATIS } from './_premium.js';

export default async function handler(req, res) {
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login novamente.' });
  if (!process.env.SUPABASE_SECRET_KEY) return res.status(200).json({ premium: true, plano: 'livre', admin: false });
  const db = admin();
  const p = await planoDe(db, user);
  const { data: u } = await db.from('ia_uso').select('usos').eq('user_id', user.id).eq('periodo', periodo()).maybeSingle();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    plano: p.plano, status: p.status, premium_ate: p.premium_ate,
    premium: !!(p.premium_ate && new Date(p.premium_ate) > new Date()),
    mensal: !!p.mp_preapproval_id && p.status === 'ativa',
    ia: { usados: u?.usos || 0, limite: LIMITE_IA_GRATIS },
    pagamentos: !!process.env.MP_ACCESS_TOKEN,
    admin: ehAdmin(user),
  });
}
