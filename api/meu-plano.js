// Plano do aluno logado (cria o teste grátis de 30 dias na primeira vez) + se é admin
import { usuario, admin, planoDe, ehAdmin, periodo, LIMITE_IA_GRATIS, mp } from './_premium.js';

async function limparPasta(db, bucket, pasta) {
  const { data } = await db.storage.from(bucket).list(pasta, { limit: 1000 });
  const paths = (data || []).filter(f => f.name).map(f => `${pasta}/${f.name}`);
  if (paths.length) await db.storage.from(bucket).remove(paths);
}



export default async function handler(req, res) {
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login novamente.' });
  if (req.method === 'POST' && req.body?.acao === 'excluir_conta') return excluirConta(req, res, user);
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

// Exclusão da própria conta (LGPD / lojas): cancela assinatura, apaga arquivos e a conta (o resto sai em cascata)
async function excluirConta(req, res, user) {
  if (String(req.body?.confirmacao || '').trim().toLowerCase() !== String(user.email || '').toLowerCase()) return res.status(400).json({ error: 'O e-mail digitado não confere.' });
  const db = admin();
  const { data: a } = await db.from('assinaturas').select('mp_preapproval_id,status').eq('user_id', user.id).maybeSingle();
  if (a?.mp_preapproval_id && a.status === 'ativa' && process.env.MP_ACCESS_TOKEN) {
    try { await mp(`/preapproval/${a.mp_preapproval_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }); }
    catch { return res.status(502).json({ error: 'Não consegui cancelar sua assinatura no Mercado Pago. Tente de novo em alguns minutos.' }); }
  }
  for (const b of ['avatares', 'certificados', 'forum']) { try { await limparPasta(db, b, user.id); } catch { } }
  try { await db.from('feedback').delete().eq('user_id', user.id); } catch { }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: 'Não foi possível excluir agora. Tente de novo ou escreva para suporte.meusemestre@gmail.com.' });
  res.status(200).json({ ok: true });
}
