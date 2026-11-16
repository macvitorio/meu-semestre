/* Leitor local de plano de ensino (sem IA) — usado quando a IA não está disponível */
'use strict';
async function pdfText(file) {
  if (!window.pdfjsLib) await new Promise((ok, err) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; sc.onload = ok; sc.onerror = () => err(new Error('Leitor de PDF não carregou (precisa de internet).')); document.head.append(sc); });
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let txt = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const c = await (await pdf.getPage(p)).getTextContent();
    let lastY = null;
    for (const it of c.items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) txt += '\n'; else if (lastY !== null) txt += ' ';
      txt += it.str; lastY = y;
    }
    txt += '\n';
  }
  return txt;
}

function parsePlano(raw) {
  const t = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  const m = { id: uid(), codigo: '', nome: '', professor: '', turma: '', cargaHoraria: '', horarios: [], avaliacoes: [], rec: '', topicos: [], faltas: {}, canceladas: [] };

  const cod = t.match(/\b([A-Z]{3}\s?\d{4})\b/);
  if (cod) {
    m.codigo = cod[1].replace(/\s/, '');
    const after = t.slice(cod.index + cod[0].length).match(/^\s*[-–:]?\s*([^\n]{3,80})/);
    if (after && !/^\d/.test(after[1])) m.nome = after[1].replace(/\s*\(.*$/, '').trim();
  }
  const nome = t.match(/(?:nome da disciplina|disciplina)\s*[:\-]\s*([^\n]+)/i);
  if (nome) m.nome = nome[1].replace(/\b[A-Z]{3}\d{4}\b\s*[-–]?\s*/, '').trim();
  const prof = t.match(/professor(?:\(a\)|\(es\)|a|es|as)?\s*(?:respons[aá]vel)?\s*[:\-]?\s*([A-ZÀ-Ú][^\n]{3,80})/i);
  if (prof) m.professor = prof[1].replace(/\s*(e-?mail|email).*$/i, '').trim();
  const turma = t.match(/turma\s*[:\-]?\s*(\d{4,5}[A-Z]?)/i);
  if (turma) m.turma = turma[1];

  // Horários UFSC: 2.0820-2 (dia.horário-nºaulas), opcional sala depois de "/"
  const seen = new Set();
  for (const h of t.matchAll(/\b([2-7])\.(\d{4})-(\d{1,2})(?:\s*\/\s*([A-Z0-9][\w\-]{1,15}))?/g)) {
    const k = h[1] + h[2];
    if (seen.has(k)) continue; seen.add(k);
    m.horarios.push({ dia: h[1], inicio: h[2], aulas: h[3], sala: h[4] || '' });
  }

  const ch = t.match(/(?:total\s*(?:de)?\s*horas?[- ]?aula|carga\s*hor[aá]ria(?:\s*total)?|h\/a)\s*[:\-]?\s*(\d{2,3})/i) || t.match(/(\d{2,3})\s*(?:h\/?a|horas[- ]aula)\b/i);
  if (ch) m.cargaHoraria = ch[1];

  // Avaliações com peso em % (ex.: "Prova 1 (P1): 35%", "Trabalho - peso 30%")
  const av = [];
  for (const l of lines) {
    const mm = l.match(/^(.{2,60}?)\s*[:\-–=(]?\s*(?:peso\s*[:=]?\s*)?(\d{1,3}(?:[.,]\d+)?)\s*%/i);
    if (mm && !/frequ[eê]ncia|presen[cç]a|75/i.test(l)) {
      const nomeAv = mm[1].replace(/[-–:(]+$/, '').trim();
      if (nomeAv.length > 1) av.push({ id: uid(), nome: nomeAv, peso: mm[2].replace(',', '.'), nota: '', data: '' });
    }
  }
  // Fórmula da média (ex.: MF = (P1 + P2 + T)/3 ou 0,4*P1 + 0,6*P2)
  if (!av.length) {
    const f = t.match(/(?:M[ÉE]DIA\s*FINAL|\bMF|\bNF|\bMÉDIA)\s*=\s*([^\n]+)/i);
    if (f) {
      const pesos = [...f[1].matchAll(/(\d+[.,]\d+|\d+)\s*[x*×]\s*([A-Z][A-Z0-9]{0,4})/gi)];
      if (pesos.length) pesos.forEach(p => av.push({ id: uid(), nome: p[2].toUpperCase(), peso: String(parseFloat(p[1].replace(',', '.')) * (parseFloat(p[1]) < 1.01 ? 100 : 1)), nota: '', data: '' }));
      else [...new Set(f[1].match(/\b[A-Z]{1,3}\d?\b/g) || [])].forEach(n => av.push({ id: uid(), nome: n, peso: '', nota: '', data: '' }));
    }
  }
  m.avaliacoes = av;

  // Datas de avaliações no cronograma
  const ano = (S.semestre.inicio || hoje()).slice(0, 4);
  for (const l of lines) {
    const d = l.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (!d || !/prova|avalia|\bP\d\b|trabalho|semin|entrega/i.test(l)) continue;
    const y = d[3] ? (d[3].length === 2 ? '20' + d[3] : d[3]) : ano;
    const data = `${y}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
    const rx = w => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const chaves = a => [...(a.nome.match(/\b[A-Z]{1,3}\d\b/g) || []), a.nome.split(/\s/).slice(0, 2).join(' ')];
    const alvo = m.avaliacoes.find(a => !a.data && chaves(a).some(k => rx(k).test(l))) || m.avaliacoes.find(a => !a.data && rx(a.nome.split(/\s/)[0]).test(l));
    if (alvo) alvo.data = data;
    else if (m.avaliacoes.length < 12 && /prova|avalia/i.test(l)) m.avaliacoes.push({ id: uid(), nome: l.replace(d[0], '').replace(/^[\s\-–:]+/, '').slice(0, 40) || 'Avaliação', peso: '', nota: '', data });
  }

  // Conteúdo programático → tópicos de estudo
  const ini = lines.findIndex(l => /conte[uú]do\s*program[aá]tico|ementa|conte[uú]dos?\b/i.test(l));
  if (ini >= 0) {
    const stop = /^(\d+[.)]?\s*)?(metodologia|avalia[cç][aã]o|bibliografia|cronograma|objetivos|recursos|observa|procedimentos|refer[eê]ncias|atividades|crit[eé]rios)/i;
    const out = [];
    for (let i = ini + 1; i < lines.length && out.length < 60; i++) {
      if (stop.test(lines[i])) break;
      const tx = lines[i].replace(/^[•\-–·*▪]\s*/, '').trim();
      if (tx.length > 3) out.push(tx);
    }
    // Ementa costuma vir em um parágrafo separado por ponto
    const itens = out.length === 1 ? out[0].split(/\.\s+|;\s*/) : out;
    m.topicos = itens.filter(x => x.length > 3).map(x => ({ id: uid(), texto: x.replace(/\.$/, ''), feito: false }));
  }
  return m;
}

