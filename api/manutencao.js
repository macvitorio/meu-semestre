// Manutenção administrativa: junta avaliações/eventos duplicados em todas as contas.
// GET /api/manutencao            → só relatório (não altera nada)
// GET /api/manutencao?aplicar=1  → aplica a limpeza
// Protegido pela mesma CRON_SECRET.
import '../limpeza.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'não autorizado' });
  const aplicar = req.query.aplicar === '1';
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data: rows, error } = await db.from('user_data').select('user_id,data');
  if (error) return res.status(500).json({ error: error.message });

  const contas = [];
  let alteradas = 0;
  for (const [i, r] of rows.entries()) {
    const d = structuredClone(r.data || {});
    const mudancas = globalThis.Limpeza.limparTudo(d);
    // avaliações sem nota mas com nome "solto" (P1, Nota 2…) que não casaram com nada, para conferência
    const suspeitas = (d.materias || []).flatMap(m => (m.avaliacoes || []).filter(a => !a.peso && !a.data && a.nota !== '' && a.nota != null).map(a => `${m.codigo || m.nome}: ${a.nome} = ${a.nota}`));
    if (mudancas.length || suspeitas.length) contas.push({ conta: i + 1, mudancas, semPesoNemData: suspeitas });
    if (mudancas.length && aplicar) {
      const { error: e } = await db.from('user_data').update({ data: d, updated_at: new Date().toISOString() }).eq('user_id', r.user_id);
      if (!e) alteradas++;
    }
  }
  res.status(200).json({ modo: aplicar ? 'aplicado' : 'relatório', totalContas: rows.length, contasComProblema: contas.length, alteradas, contas });
}
