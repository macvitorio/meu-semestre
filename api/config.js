// 1) Entrega ao navegador apenas a URL e a chave pública (anon) do Supabase.
// 2) Também gera as páginas públicas do fórum (/forum e /forum/:id) via rewrite no vercel.json,
//    pra não passar do limite de 12 funções do plano Hobby da Vercel.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.query.pagina === 'forum') return forum(req, res);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  });
}

// ================= Fórum público =================
const SITE = 'https://www.meusemestre.com.br';
const TIPOS = { duvida: ['❓', 'Dúvida', '#e8590c'], material: ['📚', 'Material', '#0ca678'], discussao: ['💬', 'Discussão', '#7048e8'] };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nome1 = n => esc(String(n || 'Estudante').trim().split(/\s+/)[0]);
const slug = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const texto = t => esc(t).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" rel="nofollow ugc noopener" target="_blank">$1</a>').replace(/\n/g, '<br>');
const quando = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 3600 ? 'agora há pouco' : s < 86400 ? `há ${Math.floor(s / 3600)} h` : s < 2592000 ? `há ${Math.floor(s / 86400)} d` : new Date(d).toLocaleDateString('pt-BR'); };
const tag = (t, c) => `<span class="tag" style="--c:${c || 'var(--tx2)'}">${t}</span>`;

async function forum(req, res) {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const id = parseInt(req.query.id, 10);
  try {
    if (id) return await post(res, db, id);
    return await lista(req, res, db);
  } catch (e) {
    console.error('forum publico', e.message);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(pagina({ titulo: 'Fórum fora do ar', desc: '', corpo: '<div class="card vazio"><p>O fórum está com um probleminha agora. Tenta de novo em alguns minutos.</p></div>', noindex: true }));
  }
}

async function lista(req, res, db) {
  const q = String(req.query.q || '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 80), tipo = TIPOS[req.query.tipo] ? req.query.tipo : '';
  let qr = db.from('forum_posts').select('id,tipo,titulo,texto,disciplina,autor_nome,autor_curso,autor_uni,respostas,votos,melhor_resposta,criado_em,atividade_em,arquivos').eq('oculto', false).order('atividade_em', { ascending: false }).limit(40);
  if (tipo) qr = qr.eq('tipo', tipo);
  if (q) qr = qr.or(`titulo.ilike.%${q}%,texto.ilike.%${q}%,disciplina.ilike.%${q}%`);
  const { data, error } = await qr; if (error) throw error;
  const filtros = [['', 'Tudo'], ['duvida', '❓ Dúvidas'], ['material', '📚 Materiais'], ['discussao', '💬 Discussões']]
    .map(([k, l]) => `<a class="chip ${tipo === k ? 'on' : ''}" href="/forum${k ? '?tipo=' + k : ''}${q ? (k ? '&' : '?') + 'q=' + encodeURIComponent(q) : ''}">${l}</a>`).join('');
  const itens = (data || []).map(p => { const [e, n, c] = TIPOS[p.tipo] || TIPOS.duvida; return `<a class="card item" href="/forum/${p.id}-${slug(p.titulo)}">
      <div class="votos"><b>${p.votos}</b><small>votos</small></div>
      <div class="sp"><div class="meta">${tag(e + ' ' + n, c)}${p.disciplina ? tag(esc(p.disciplina)) : ''}${p.melhor_resposta ? tag('✅ Resolvida', 'var(--ok)') : ''}</div>
      <h2>${esc(p.titulo)}</h2>${p.texto ? `<p class="prev">${esc(p.texto.slice(0, 180))}</p>` : ''}
      <div class="rod">${nome1(p.autor_nome)}${p.autor_curso ? ' · ' + esc(p.autor_curso) : ''} · ${quando(p.criado_em)} · 💬 ${p.respostas}${(p.arquivos || []).length ? ' · 📎 ' + p.arquivos.length : ''}</div></div></a>`; }).join('');
  const corpo = `<section class="hero"><h1>Fórum da galera</h1><p>Dúvidas, resumos e materiais de faculdade, de estudante pra estudante. Lê à vontade; pra perguntar ou responder, é só entrar.</p>
    <form class="busca" action="/forum" method="get" role="search"><input name="q" value="${esc(q)}" placeholder="Buscar: integral por partes, resumo de anatomia…" aria-label="Buscar no fórum">${tipo ? `<input type="hidden" name="tipo" value="${tipo}">` : ''}<button>Buscar</button></form>
    <div class="chips">${filtros}</div></section>
    ${itens || `<div class="card vazio"><p>${q ? 'Nada encontrado pra essa busca.' : 'Ainda não tem publicações.'} Que tal ser a primeira pessoa a perguntar?</p><a class="btn pr" href="/app#/forum">Perguntar no fórum</a></div>`}`;
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(pagina({ titulo: q ? `“${q}” no Fórum da galera | Meu Semestre` : 'Fórum da galera: dúvidas e materiais de faculdade | Meu Semestre', desc: 'Tire dúvidas de faculdade, troque resumos e materiais com outros estudantes. Fórum gratuito do Meu Semestre.', canon: SITE + '/forum', corpo, noindex: !!q }));
}

async function post(res, db, id) {
  const { data: p } = await db.from('forum_posts').select('*').eq('id', id).eq('oculto', false).maybeSingle();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!p) { res.setHeader('Cache-Control', 'public, s-maxage=60'); return res.status(404).send(pagina({ titulo: 'Publicação não encontrada | Meu Semestre', desc: '', noindex: true, corpo: '<div class="card vazio"><p>Essa publicação não existe mais ou foi removida.</p><a class="btn" href="/forum">Ver o fórum</a></div>' })); }
  const [{ data: rs }, { data: cs }] = await Promise.all([
    db.from('forum_respostas').select('id,texto,autor_nome,autor_curso,votos,criado_em,arquivos').eq('post_id', id).eq('oculto', false).order('criado_em'),
    db.from('forum_comentarios').select('id,resposta_id,texto,autor_nome,autor_curso,criado_em').eq('post_id', id).eq('oculto', false).order('criado_em')]);
  const resp = (rs || []).sort((a, b) => (b.id === p.melhor_resposta) - (a.id === p.melhor_resposta) || b.votos - a.votos);
  const coms = rid => (cs || []).filter(c => (c.resposta_id || null) === rid).map(c => `<div class="com"><b>${nome1(c.autor_nome)}</b><span class="mu"> · ${quando(c.criado_em)}</span><div>${texto(c.texto)}</div></div>`).join('');
  const anexos = a => (a || []).length ? `<a class="anexo" href="/app#/forum/${id}">📎 ${a.length} anexo${a.length > 1 ? 's' : ''} · entre pra ver</a>` : '';
  const [e, n, c] = TIPOS[p.tipo] || TIPOS.duvida;
  const url = `${SITE}/forum/${p.id}-${slug(p.titulo)}`;
  const corpo = `<p class="volta"><a href="/forum">← Fórum da galera</a></p>
    <article class="card"><div class="meta">${tag(e + ' ' + n, c)}${p.disciplina ? tag(esc(p.disciplina)) : ''}${p.autor_uni ? tag(esc(p.autor_uni)) : ''}${p.melhor_resposta ? tag('✅ Resolvida', 'var(--ok)') : ''}</div>
      <h1>${esc(p.titulo)}</h1>${p.texto ? `<div class="txt">${texto(p.texto)}</div>` : ''}${anexos(p.arquivos)}
      <div class="rod">${nome1(p.autor_nome)}${p.autor_curso ? ' · ' + esc(p.autor_curso) : ''} · ${quando(p.criado_em)} · ▲ ${p.votos}</div>
      ${coms(null) ? `<div class="coms">${coms(null)}</div>` : ''}</article>
    <h2 class="nresp">${resp.length ? `${resp.length} resposta${resp.length > 1 ? 's' : ''}` : 'Ninguém respondeu ainda'}</h2>
    ${resp.map(r => `<div class="card ${r.id === p.melhor_resposta ? 'melhor' : ''}">${r.id === p.melhor_resposta ? tag('✅ Melhor resposta', 'var(--ok)') : ''}
      <div class="txt">${texto(r.texto)}</div>${anexos(r.arquivos)}
      <div class="rod">${nome1(r.autor_nome)}${r.autor_curso ? ' · ' + esc(r.autor_curso) : ''} · ${quando(r.criado_em)} · ▲ ${r.votos}</div>
      ${coms(r.id) ? `<div class="coms">${coms(r.id)}</div>` : ''}</div>`).join('')}
    <div class="card cta"><div><b>${resp.length ? 'Sabe mais alguma coisa sobre isso?' : 'Sabe responder? Ajuda a galera!'}</b><p class="mu">Entre de graça pra responder, comentar e votar.</p></div><a class="btn pr" href="/app#/forum/${p.id}">Responder</a></div>`;
  const pessoa = nm => ({ '@type': 'Person', name: String(nm || 'Estudante').trim().split(/\s+/)[0] });
  const resposta = r => ({ '@type': 'Answer', text: r.texto, dateCreated: r.criado_em, upvoteCount: r.votos, url: url + '#r' + r.id, author: pessoa(r.autor_nome) });
  const ld = p.tipo === 'duvida' ? { '@context': 'https://schema.org', '@type': 'QAPage', mainEntity: { '@type': 'Question', name: p.titulo, text: p.texto || p.titulo, answerCount: resp.length, upvoteCount: p.votos, dateCreated: p.criado_em, author: pessoa(p.autor_nome),
    ...(p.melhor_resposta && resp[0]?.id === p.melhor_resposta ? { acceptedAnswer: resposta(resp[0]), suggestedAnswer: resp.slice(1).map(resposta) } : { suggestedAnswer: resp.map(resposta) }) } }
    : { '@context': 'https://schema.org', '@type': 'DiscussionForumPosting', headline: p.titulo, text: p.texto || p.titulo, datePublished: p.criado_em, author: pessoa(p.autor_nome), url, commentCount: resp.length };
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.status(200).send(pagina({ titulo: `${p.titulo} | Fórum Meu Semestre`, desc: (p.texto || p.titulo).replace(/\s+/g, ' ').slice(0, 155), canon: url, corpo, ld }));
}

function pagina({ titulo, desc, canon, corpo, ld, noindex }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title><meta name="description" content="${esc(desc)}">${noindex ? '<meta name="robots" content="noindex">' : ''}${canon ? `<link rel="canonical" href="${canon}">` : ''}
<meta property="og:type" content="website"><meta property="og:site_name" content="Meu Semestre"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/og.png?v=5">${canon ? `<meta property="og:url" content="${canon}">` : ''}
<meta name="theme-color" content="#fffaf3"><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/svg+xml" href="/icon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
<style>:root{--bg:#fffaf3;--card:#fff;--s2:#fbf3e8;--tx:#1b1340;--tx2:#5b5677;--bd:#efe6da;--pr:#4f46e5;--pr2:#eef0ff;--ok:#16a36a;--sol:#ffc83d}
@media(prefers-color-scheme:dark){:root{--bg:#0e0e0e;--card:#181818;--s2:#222121;--tx:#f5f2ed;--tx2:#a3a09b;--bd:#2c2b2a;--pr:#9590ef;--pr2:#23213d;--ok:#3ccf8e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 Inter,system-ui,sans-serif}a{color:var(--pr)}
.top{display:flex;align-items:center;gap:12px;max-width:820px;margin:0 auto;padding:16px max(16px,env(safe-area-inset-left))}
.logo{display:flex;align-items:center;gap:10px;font:800 18px "Plus Jakarta Sans",sans-serif;color:var(--tx);text-decoration:none}.logo img{width:34px;height:34px;border-radius:10px}
.top .sp{flex:1}.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:0 16px;border-radius:12px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font:700 15px "Plus Jakarta Sans",sans-serif;text-decoration:none;white-space:nowrap}
.btn.pr{background:var(--pr);border-color:var(--pr);color:#fff}
main{max-width:820px;margin:0 auto;padding:8px max(16px,env(safe-area-inset-left)) 60px;display:grid;gap:12px}
h1,h2{font-family:"Plus Jakarta Sans",sans-serif;letter-spacing:-.02em;overflow-wrap:anywhere}
.hero h1{font-size:clamp(30px,6vw,44px);margin:12px 0 6px}.hero p{color:var(--tx2);margin:0 0 16px;max-width:60ch}
.busca{display:flex;gap:8px}.busca input{flex:1;min-width:0;min-height:46px;padding:10px 14px;border-radius:12px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font:inherit}
.busca button{min-height:46px;padding:0 18px;border-radius:12px;border:0;background:var(--pr);color:#fff;font:700 15px "Plus Jakarta Sans",sans-serif;cursor:pointer}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.chip{padding:7px 14px;border-radius:99px;border:1px solid var(--bd);background:var(--card);color:var(--tx);text-decoration:none;font-size:14px;font-weight:600}.chip.on{background:var(--pr);border-color:var(--pr);color:#fff}
.card{background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:16px 18px;min-width:0}
.item{display:flex;gap:14px;text-decoration:none;color:inherit}.item:hover{border-color:var(--pr)}
.votos{flex:none;width:52px;align-self:flex-start;display:flex;flex-direction:column;align-items:center;background:var(--s2);border-radius:12px;padding:8px 0}.votos b{font-size:18px}.votos small{font-size:11px;color:var(--tx2)}
.sp{flex:1;min-width:0}.item h2{font-size:17px;margin:6px 0 2px}.prev{margin:0;color:var(--tx2);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{display:flex;flex-wrap:wrap;gap:6px}.tag{--c:var(--tx2);font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent)}
.rod{font-size:13px;color:var(--tx2);margin-top:8px}.mu{color:var(--tx2)}
article h1{font-size:clamp(24px,5vw,32px);margin:10px 0}.txt{overflow-wrap:anywhere}.nresp{font-size:20px;margin:16px 2px 0}
.melhor{border-color:color-mix(in srgb,var(--ok) 55%,var(--bd))}.anexo{display:inline-block;margin-top:10px;font-size:14px;font-weight:600}
.coms{margin-top:12px;padding-top:10px;border-top:1px dashed var(--bd);display:grid;gap:8px}.com{font-size:14px;padding-left:10px;border-left:3px solid var(--bd);overflow-wrap:anywhere}
.cta{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--pr2)}.cta p{margin:2px 0 0}.vazio{text-align:center;display:grid;gap:12px;justify-items:center}
.volta{margin:6px 0 0;font-weight:600}footer{max-width:820px;margin:0 auto;padding:0 16px 40px;color:var(--tx2);font-size:13px}</style></head>
<body><header class="top"><a class="logo" href="/"><img src="/icon.svg" alt="">Meu Semestre</a><span class="sp"></span><a class="btn" href="/forum">Fórum</a><a class="btn pr" href="/app">Entrar</a></header>
<main>${corpo}</main>
<footer>Fórum da galera do <a href="/">Meu Semestre</a>, projeto independente feito por estudantes, pra estudantes. Seja gentil: nada de cola, provas sigilosas ou pirataria. <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a></footer></body></html>`;
}
