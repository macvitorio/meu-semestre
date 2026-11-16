// Painel de administração (somente e-mails listados em ADMIN_EMAILS)
// GET  → lista de contas com plano e resumo de uso
// POST → { userId, acao: 'cortesia' | 'remover' | 'dias' | 'apagar', dias }
import { usuario, admin, ehAdmin, planoDe, mp } from './_premium.js';

export default async function handler(req, res) {
  const user = await usuario(req);
  if (!ehAdmin(user)) return res.status(403).json({ error: 'Acesso restrito.' });
  const db = admin();
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'POST') {
    const { userId, acao, dias } = req.body || {};
    if (acao !== 'zerar_pagamentos' && !/^[0-9a-f-]{36}$/i.test(String(userId || ''))) return res.status(400).json({ error: 'Conta inválida.' });
    if (acao === 'zerar_pagamentos') { // limpa registros de pagamentos de teste (receita volta a zero)
      const { data, error } = await db.from('pagamentos').delete().neq('id', '').select('id');
      return error ? res.status(500).json({ error: error.message }) : res.status(200).json({ ok: true, apagados: data.length });
    }
    const { data: alvo } = await db.auth.admin.getUserById(userId);
    if (!alvo?.user) return res.status(404).json({ error: 'Conta não encontrada.' });
    if (acao === 'apagar') {
      if (userId === user.id) return res.status(400).json({ error: 'Você não pode apagar a própria conta por aqui.' });
      const { data: a } = await db.from('assinaturas').select('mp_preapproval_id,status').eq('user_id', userId).maybeSingle();
      if (a?.mp_preapproval_id && a.status === 'ativa' && process.env.MP_ACCESS_TOKEN) {
        try { await mp(`/preapproval/${a.mp_preapproval_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }); } catch { return res.status(502).json({ error: 'Não consegui cancelar a assinatura no Mercado Pago. Cancele lá antes de apagar.' }); }
      }
      // dados, plano, lembretes e uso da IA são apagados junto (on delete cascade)
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, apagada: true });
    }
    const atual = await planoDe(db, alvo.user);
    const agora = new Date().toISOString();
    let mud;
    if (acao === 'cortesia') mud = { plano: 'cortesia', status: 'ativa', premium_ate: '2099-12-31T00:00:00Z' };
    else if (acao === 'remover') mud = { plano: 'gratis', status: 'inativa', premium_ate: agora };
    else if (acao === 'dias') {
      const n = Math.max(1, Math.min(3650, parseInt(dias, 10) || 0));
      const base = Math.max(Date.now(), atual.premium_ate ? new Date(atual.premium_ate).getTime() : 0);
      mud = { plano: atual.plano === 'gratis' || atual.plano === 'teste' ? 'manual' : atual.plano, status: 'ativa', premium_ate: new Date(base + n * 864e5).toISOString() };
    } else return res.status(400).json({ error: 'Ação inválida.' });
    await db.from('assinaturas').upsert({ user_id: userId, ...mud, atualizado_em: agora });
    return res.status(200).json({ ok: true, ...mud });
  }

  const usuarios = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return res.status(500).json({ error: error.message });
    usuarios.push(...data.users);
    if (data.users.length < 200) break;
  }
  const ids = usuarios.map(u => u.id);
  const [{ data: ass }, { data: dados }, { data: pags }] = await Promise.all([
    db.from('assinaturas').select('*').in('user_id', ids),
    db.from('user_data').select('user_id,data,updated_at').in('user_id', ids),
    db.from('pagamentos').select('user_id,valor,status'),
  ]);
  const { data: inds } = await db.from('indicacoes').select('indicador_id,indicado_id,convertida');
  const porIndicador = {}, indicadoPor = {};
  for (const i of inds || []) { (porIndicador[i.indicador_id] ||= { total: 0, assinaram: 0 }).total++; if (i.convertida) porIndicador[i.indicador_id].assinaram++; indicadoPor[i.indicado_id] = i.indicador_id; }
  const A = Object.fromEntries((ass || []).map(a => [a.user_id, a])), D = Object.fromEntries((dados || []).map(d => [d.user_id, d]));
  const agora = new Date();
  const contas = usuarios.map(u => {
    const a = A[u.id], d = D[u.id]?.data || {};
    const fimTeste = new Date(new Date(u.created_at).getTime() + 30 * 864e5);
    const premium_ate = a?.premium_ate || fimTeste.toISOString();
    return {
      id: u.id, email: u.email, nome: u.user_metadata?.full_name || d.perfil?.nome || '', foto: d.perfil?.foto && d.perfil.foto !== 'none' ? d.perfil.foto : (u.user_metadata?.avatar_url || ''),
      criado: u.created_at, ultimo_acesso: u.last_sign_in_at, atualizado: D[u.id]?.updated_at || null,
      provedor: u.app_metadata?.provider || 'email',
      plano: a?.plano || 'teste', status: a?.status || 'ativa', premium_ate,
      premium: new Date(premium_ate) > agora,
      disciplinas: (d.materias || []).length,
      indicacoes: porIndicador[u.id] || { total: 0, assinaram: 0 }, indicadoPor: indicadoPor[u.id] ? (usuarios.find(x => x.id === indicadoPor[u.id])?.email || 'conta apagada') : null,
    };
  }).sort((x, y) => (y.criado || '').localeCompare(x.criado || ''));
  const { data: fb } = await db.from('feedback').select('id,email,tipo,texto,criado_em').order('criado_em', { ascending: false }).limit(100);
  const receita = (pags || []).filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.valor || 0), 0);
  res.status(200).json({ contas, feedback: fb || [], resumo: { total: contas.length, premium: contas.filter(c => c.premium).length, pagantes: contas.filter(c => ['mensal', 'semestral'].includes(c.plano) && c.premium).length, cortesias: contas.filter(c => c.plano === 'cortesia').length, receita, indicacoes: (inds || []).length, indicacoesAssinaram: (inds || []).filter(i => i.convertida).length } });
}
