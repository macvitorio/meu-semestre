// Recebe prints/fotos/PDFs e devolve dados acadêmicos estruturados via Claude.
// Exige usuário logado no Supabase (token no header Authorization).
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { admin, ehPremium, periodo, LIMITE_IA_GRATIS } from './_premium.js';

export const config = { api: { bodyParser: { sizeLimit: '4.5mb' } } };

const anthropic = new Anthropic(); // lê ANTHROPIC_API_KEY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const S = { type: 'string' };
const arr = items => ({ type: 'array', items });
const obj = props => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });

const SCHEMA = obj({
  resumo: S,
  semestre: obj({ inicio: S, fim: S }),
  feriados: arr(obj({ data: S, descricao: S })),
  disciplinas: arr(obj({
    codigo: S, nome: S, professor: S, turma: S, cargaHoraria: S,
    horarios: arr(obj({ dia: S, inicio: S, aulas: S, sala: S })),
    avaliacoes: arr(obj({ nome: S, peso: S, data: S, nota: S })),
    topicos: arr(S),
    faltas: arr(obj({ data: S, quantidade: S })),
  })),
  eventos: arr(obj({ data: S, titulo: S, tipo: S, codigo: S })),
  historico: arr(obj({ codigo: S, nome: S, semestre: S, nota: S, creditos: S, situacao: S })),
});

const SYSTEM = `Você extrai dados acadêmicos de documentos de estudantes universitários brasileiros, de qualquer instituição (plano de ensino, cronograma, calendário acadêmico, prints de portais acadêmicos como CAGR, SIGAA, Moodle, Canvas e Google Classroom, histórico escolar, boletim de notas).
Regras:
- Extraia apenas o que está visível no documento. Campo desconhecido = "" (string vazia). Listas sem dados = [].
- Datas sempre no formato AAAA-MM-DD. Se o ano não aparecer, use o ano informado no contexto.
- Horários: "dia" é o número UFSC (2=segunda ... 7=sábado); "inicio" é HHMM entre 0730,0820,0910,1010,1100,1330,1420,1510,1620,1710,1830,1920,2020,2110; "aulas" é a quantidade de aulas de 50 min. O formato do CAGR/UFSC "2.1010-2" significa dia 2, início 1010, 2 aulas. Em outras faculdades os horários vêm como "Segunda 08:20–10:00": converta para o horário de início mais próximo da lista e calcule as aulas de 50 min.
- Pesos das avaliações em porcentagem, sem o símbolo (ex.: "35"). Notas de 0 a 10 com ponto decimal.
- "topicos" são itens do conteúdo programático, curtos, um por item.
- "eventos": entregas, feriados, dias sem aula e outras datas do calendário. NÃO repita em "eventos" as provas/avaliações que já estão em "avaliacoes" da disciplina; "tipo" é um de: prova, entrega, feriado, aula, outro. "codigo" é o código da disciplina relacionada, se houver.
- "historico": disciplinas já cursadas (histórico escolar), com situação como aparece (Aprovado, Reprovado, FI etc.).
- Se o aluno já cadastrou a disciplina (lista no contexto), use em "avaliacoes" EXATAMENTE os nomes já existentes. Ex.: o print mostra "P1" e já existe "Prova I" → use "Prova I"; "Seminário" e já existe "Seminários" → use "Seminários". Só crie nome novo se a avaliação realmente não existir.
- Em prints de notas, preencha só "nome" e "nota" (peso e data vazios, a menos que apareçam).
- "resumo": uma frase em português dizendo o que foi encontrado.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authErr } = token ? await supabase.auth.getUser(token) : { data: null, error: true };
  if (authErr || !auth?.user) return res.status(401).json({ error: 'Faça login novamente.' });

  const { tipo = 'outro', arquivos = [], contexto = {} } = req.body || {};

  // Plano grátis: até LIMITE_IA_GRATIS leituras por semestre
  const db = process.env.SUPABASE_SECRET_KEY ? admin() : null;
  const per = periodo();
  let premium = true, usos = 0;
  if (db) {
    premium = await ehPremium(db, auth.user);
    if (!premium) {
      const { data: u } = await db.from('ia_uso').select('usos').eq('user_id', auth.user.id).eq('periodo', per).maybeSingle();
      usos = u?.usos || 0;
      if (usos >= LIMITE_IA_GRATIS) return res.status(402).json({ error: `Você usou as ${LIMITE_IA_GRATIS} leituras grátis deste semestre. Assine o Premium para leituras ilimitadas.`, premium: true });
    }
  }
  if (!arquivos.length || arquivos.length > 8) return res.status(400).json({ error: 'Envie de 1 a 8 arquivos.' });

  const content = [];
  for (const a of arquivos) {
    if (a.mediaType === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.data } });
    else if (/^image\/(png|jpeg|webp|gif)$/.test(a.mediaType)) content.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } });
    else if (a.mediaType === 'text/plain') content.push({ type: 'text', text: `Documento colado:\n${a.data}` });
  }
  content.push({
    type: 'text',
    text: `Tipo informado pelo aluno: ${tipo}.\nAno de referência: ${contexto.ano || new Date().getFullYear()}.\nDisciplinas que o aluno já cadastrou (use o mesmo código quando o documento se referir a elas): ${JSON.stringify(contexto.disciplinas || []).slice(0, 8000)}\nExtraia os dados conforme o esquema.`,
  });

  try {
    // Haiku 5.5: modelo mais barato, suficiente para extrair dados de documentos
    const response = await anthropic.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'Não foi possível processar este documento.' });
    if (response.stop_reason === 'max_tokens') return res.status(422).json({ error: 'Documento grande demais. Envie menos páginas por vez.' });
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const dados = JSON.parse(text);
    if (db && !premium) await db.from('ia_uso').upsert({ user_id: auth.user.id, periodo: per, usos: usos + 1 });
    return res.status(200).json({ ...dados, _usos: premium ? null : { usados: usos + 1, limite: LIMITE_IA_GRATIS } });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Muitas solicitações. Tente em instantes.' });
    if (error instanceof Anthropic.BadRequestError) return res.status(400).json({ error: 'Arquivo não suportado ou corrompido.' });
    if (error instanceof SyntaxError) return res.status(502).json({ error: 'Resposta inválida da IA. Tente novamente.' });
    console.error(error);
    return res.status(500).json({ error: 'Erro ao processar. Tente novamente.' });
  }
}
