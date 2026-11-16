// Horas complementares: a IA lê um certificado ou o regulamento/currículo do curso.
import Anthropic from '@anthropic-ai/sdk';
import { usuario, admin, podeUsarIA, registrarUsoIA, LIMITE_IA_GRATIS } from './_premium.js';

export const config = { api: { bodyParser: { sizeLimit: '4.5mb' } } };
const anthropic = new Anthropic();
const S = { type: 'string' };
const obj = props => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });

const ESQUEMAS = {
  certificado: obj({ titulo: S, horas: S, data: S, instituicao: S, categoria: S, resumo: S }),
  regulamento: obj({ horasExigidas: S, categorias: { type: 'array', items: obj({ nome: S, limiteHoras: S }) }, observacoes: S }),
};
const INSTRUCOES = {
  certificado: `Você lê certificados de atividades complementares de estudantes universitários brasileiros (cursos, eventos, palestras, monitorias, projetos de extensão, estágios, voluntariado).
Extraia: "titulo" (nome da atividade), "horas" (carga horária total em horas, só o número com ponto decimal, ex.: "20" ou "4.5"; se não aparecer, ""), "data" (data de conclusão no formato AAAA-MM-DD; se só houver período, use a data final; se não houver, ""), "instituicao" (quem emitiu).
"categoria": escolha a categoria mais adequada da lista enviada pelo aluno, copiando o nome exatamente; se a lista estiver vazia ou nenhuma servir, sugira um nome curto (ex.: "Eventos", "Cursos", "Extensão", "Monitoria", "Pesquisa").
"resumo": uma frase em português. Campo desconhecido = "".`,
  regulamento: `Você lê o currículo, projeto pedagógico ou regulamento de atividades complementares de um curso universitário brasileiro.
Extraia: "horasExigidas" (total de horas complementares exigidas para se formar, só o número; se não aparecer, ""), "categorias" (cada tipo de atividade aceito com "limiteHoras" = máximo de horas que pode contar naquela categoria, só o número, ou "" se não houver limite), "observacoes" (regras importantes resumidas em até 2 frases, em português).
Não invente categorias que não estejam no documento.`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const user = await usuario(req);
  if (!user) return res.status(401).json({ error: 'Faça login novamente.' });
  const { tipo, arquivo, categorias = [] } = req.body || {};
  if (!ESQUEMAS[tipo] || !arquivo?.data) return res.status(400).json({ error: 'Envie um arquivo.' });

  const db = admin();
  const q = await podeUsarIA(db, user);
  if (!q.ok) return res.status(402).json({ error: `Você usou as ${LIMITE_IA_GRATIS} leituras grátis deste semestre. Assine o Premium para leituras ilimitadas ou preencha manualmente.`, premium: true });

  const content = [];
  if (arquivo.mediaType === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: arquivo.data } });
  else if (/^image\/(png|jpeg|webp|gif)$/.test(arquivo.mediaType)) content.push({ type: 'image', source: { type: 'base64', media_type: arquivo.mediaType, data: arquivo.data } });
  else if (arquivo.mediaType === 'text/plain') content.push({ type: 'text', text: 'Documento colado:\n' + String(arquivo.data).slice(0, 60000) });
  else return res.status(400).json({ error: 'Formato não suportado. Use foto, PDF ou texto.' });
  content.push({ type: 'text', text: tipo === 'certificado' ? `Categorias do aluno: ${JSON.stringify(categorias).slice(0, 2000)}` : 'Extraia as regras de horas complementares.' });

  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-5-5', max_tokens: 4000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMAS[tipo] } },
      system: INSTRUCOES[tipo], messages: [{ role: 'user', content }],
    });
    if (r.stop_reason === 'refusal') return res.status(422).json({ error: 'Não foi possível ler este documento.' });
    const dados = JSON.parse(r.content.filter(b => b.type === 'text').map(b => b.text).join(''));
    await registrarUsoIA(db, user, q);
    res.status(200).json(dados);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Muitas solicitações. Tente em instantes.' });
    if (e instanceof SyntaxError) return res.status(502).json({ error: 'Resposta inválida da IA. Tente novamente.' });
    console.error('horas', e);
    res.status(500).json({ error: 'Erro ao ler o documento. Preencha manualmente.' });
  }
}
