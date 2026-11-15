/* Regras para reconhecer avaliações iguais e limpar duplicadas.
   Usado no navegador (script normal) e no servidor (api/manutencao.js). */
(function () {
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const ROM = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
  // "Prova", "P", "Avaliação", "AV", "A", "Nota", "N" são o mesmo tipo: prova
  const PROVA = new Set(['p', 'prova', 'provas', 'a', 'av', 'aval', 'avaliacao', 'avaliacoes', 'n', 'nota', 'notas', 'exame']);
  const prep = nome => norm(nome)
    .replace(/\b(viii|vii|vi|iv|v|iii|ii|i)\b/g, r => ROM[r])
    .replace(/(\d)\s*[ºª°o]\b/g, '$1')
    .replace(/\b([a-z]{1,4})\s*-?\s*(\d)\b/g, '$1$2')          // "AV 1", "P-1" → av1, p1
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const tipo = w => { const m = w.match(/^([a-z]+)\d*$/); const b = m ? m[1] : w; return PROVA.has(b) ? 'p' : b; };
  const singular = w => w.replace(/(oes|aes|ns|s)$/, m => ({ oes: 'ao', aes: 'ao', ns: 'm', s: '' })[m]);

  // chave: "p2" para Prova II / P2 / 2ª avaliação; "trabalho1" para Trabalho 1; "seminario" para Seminários
  function chave(nome) {
    const n = prep(nome), pal = n.split(' ').filter(w => w && !['de', 'da', 'do', 'e', 'a'].includes(w) || /^a\d$/.test(w));
    const num = (n.match(/\d+/) || [])[0];
    const palavra = pal.find(w => /^[a-z]/.test(w)) || '';
    if (num) return (palavra ? (tipo(palavra) === 'p' ? 'p' : singular(palavra.replace(/\d+$/, ''))) : 'p') + num;
    return pal.map(singular).join(' ');
  }
  const mesmaAv = (x, a) => norm(x.nome) === norm(a.nome) || chave(x.nome) === chave(a.nome);

  function juntarDuplicadas(avs) {
    const out = [];
    for (const a of avs || []) {
      const x = out.find(o => mesmaAv(o, a));
      if (!x) { out.push(a); continue; }
      for (const k of ['peso', 'data', 'nota']) if ((x[k] === '' || x[k] == null) && a[k] !== '' && a[k] != null) x[k] = a[k];
    }
    return out;
  }
  function limparEventos(d) {
    const vistos = new Set();
    return (d.eventos || []).filter(e => {
      const m = (d.materias || []).find(x => x.id === e.materiaId);
      const repeteAv = (m ? [m] : d.materias || []).some(mm => (mm.avaliacoes || []).some(a => a.data === e.data && (m || mesmaAv(a, { nome: e.titulo })) && (e.tipo === 'prova' || mesmaAv(a, { nome: e.titulo }))));
      const k = e.data + '|' + norm(e.titulo) + '|' + (e.materiaId || '');
      if (repeteAv || vistos.has(k)) return false;
      vistos.add(k); return true;
    });
  }
  // aplica tudo e devolve um resumo do que mudou (para relatório)
  function limparTudo(d) {
    const rel = [];
    for (const m of d.materias || []) {
      const antes = (m.avaliacoes || []).map(a => a.nome);
      m.avaliacoes = juntarDuplicadas(m.avaliacoes);
      // sobras de importação: sem nota, peso nem data, numa disciplina que já tem avaliações com peso
      const vazia = a => [a.nota, a.peso, a.data].every(v => v === '' || v == null);
      if (m.avaliacoes.some(a => a.peso)) m.avaliacoes = m.avaliacoes.filter(a => !vazia(a));
      if (m.avaliacoes.length !== antes.length) rel.push({ disciplina: m.codigo || m.nome, antes, depois: m.avaliacoes.map(a => `${a.nome}${a.nota !== '' && a.nota != null ? ' = ' + a.nota : ''}`) });
    }
    const n = (d.eventos || []).length;
    d.eventos = limparEventos(d);
    if (d.eventos.length !== n) rel.push({ eventosRemovidos: n - d.eventos.length });
    return rel;
  }
  globalThis.Limpeza = { norm, chave, mesmaAv, juntarDuplicadas, limparEventos, limparTudo };
})();
