/* Meu Semestre — PWA com login (Supabase), sincronização e atualização por print/PDF */
'use strict';

// ================= Constantes =================
const DIAS = { 2: 'Seg', 3: 'Ter', 4: 'Qua', 5: 'Qui', 6: 'Sex', 7: 'Sáb' };
const DIAS_L = { 2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta', 7: 'Sábado' };
const SLOTS = ['0730', '0820', '0910', '1010', '1100', '1330', '1420', '1510', '1620', '1710', '1830', '1920', '2020', '2110'];
const CORES = ['#4f46e5', '#14945a', '#d6336c', '#e8590c', '#7048e8', '#0c8599', '#b08800', '#c92a2a', '#5f3dc4', '#2b8a3e'];
let FREQ_MIN = 0.75, MEDIA_APROV = 6, MEDIA_REC = 3; // ajustáveis em Configurações (cada faculdade tem sua regra)
function aplicarRegras() { const r = S.perfil.regras || {}; MEDIA_APROV = num(r.media) ?? 6; FREQ_MIN = (num(r.presenca) ?? 75) / 100; MEDIA_REC = num(r.rec) ?? 3; }
const TIPOS_EV = { prova: 'Prova', entrega: 'Entrega', feriado: 'Feriado', aula: 'Aula', outro: 'Outro' };
const KEY = 'meu-semestre-v2';

// ================= Ícones =================
const P = {
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z" fill="currentColor" stroke="none"/><path d="M6 12v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3z" fill="#fbbf24" stroke="none"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6c0-4.4-4.5-8.4-10-8.4z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  spark: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>',
  clip: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const ic = (n, s = 20) => `<svg class="i" viewBox="0 0 24 24" style="width:${s}px;height:${s}px" aria-hidden="true">${P[n]}</svg>`;
const GOOGLE = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

// ================= Utilidades =================
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hoje = () => iso(new Date());
const brD = s => s ? parseISO(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
const brDL = s => parseISO(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
const hhmm = h => h ? h.slice(0, 2) + ':' + h.slice(2) : '';
const fimAula = (ini, n) => { const i = Math.max(0, SLOTS.indexOf(ini)); const last = SLOTS[Math.min(SLOTS.length - 1, i + (+n || 1) - 1)]; const m = +last.slice(0, 2) * 60 + +last.slice(2) + 50; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const fmt = n => n == null ? '—' : n.toFixed(1).replace('.', ',');
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const diasAte = d => Math.round((parseISO(d) - parseISO(hoje())) / 864e5);
const quando = d => { const n = diasAte(d); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n < 0 ? `há ${-n}d` : `em ${n} dias`; };

// ================= Estado =================
const novoEstado = () => ({ v: 2, perfil: { nome: '' }, semestre: { inicio: '', fim: '' }, feriados: [], materias: [], eventos: [], historico: [] });
let S = novoEstado();
function migrar(d) {
  d = Object.assign(novoEstado(), d || {});
  d.feriados = (d.feriados || []).map(f => typeof f === 'string' ? { data: f, descricao: 'Sem aula' } : f);
  d.materias.forEach(m => { m.faltas ||= {}; m.canceladas ||= []; m.avaliacoes ||= []; m.topicos ||= []; m.horarios ||= []; });
  const idOk = v => typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : uid();
  const corOk = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;
  d.materias.forEach((m, i) => {
    m.id = idOk(m.id); m.cor = corOk(m.cor) || CORES[i % CORES.length];
    m.avaliacoes.forEach(a => a.id = idOk(a.id)); m.topicos.forEach(t => t.id = idOk(t.id));
    m.horarios = m.horarios.filter(h => DIAS[h.dia] && SLOTS.includes(h.inicio));
    const fl = {}; for (const [k, v] of Object.entries(m.faltas)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && +v >= 0 && +v < 20) fl[k] = +v; m.faltas = fl;
    m.canceladas = m.canceladas.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x));
  });
  d.eventos = (d.eventos || []).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e?.data || '')).map(e => ({ ...e, id: idOk(e.id) }));
  d.feriados = d.feriados.filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f?.data || ''));
  d.historico = (d.historico || []).map(h => ({ ...h, id: idOk(h.id) }));
  if (d.perfil?.cor && !corOk(d.perfil.cor)) d.perfil.cor = '';
  d.materias.forEach(m => { m.avaliacoes = juntarDuplicadas(m.avaliacoes); });
  d.eventos = limparEventos(d);
  d.horas = Object.assign({ exigidas: '', categorias: [], atividades: [], obs: '' }, d.horas || {});
  d.horas.atividades = (d.horas.atividades || []).map(x => ({ ...x, id: /^[\w-]{1,40}$/.test(x.id || '') ? x.id : uid() }));
  return d;
}
const { mesmaAv, juntarDuplicadas, limparEventos } = Limpeza;
const byId = id => S.materias.find(m => m.id === id);
const nomeM = m => m ? (m.nome || m.codigo) : '';

// ================= Backend / Sync =================
let sb = null, user = null, cfg = { aiEnabled: false }, modoLocal = false, syncState = 'ok', saveT = null;
function saveLocal() { try { localStorage.setItem(KEY + (user ? ':' + user.id : ':local'), JSON.stringify(S)); } catch { } }
function loadLocal(k) { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch { return null; } }
function save() {
  saveLocal();
  if (!sb || !user) return;
  setSync('busy');
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const { error } = await sb.from('user_data').upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() });
    setSync(error ? 'off' : 'ok');
    if (error) toast('Sem conexão — salvo no aparelho, sincroniza depois.');
  }, 700);
}
function setSync(s) { syncState = s; const el = $('#sync'); if (el) { el.className = 'sync ' + s; el.lastChild.textContent = s === 'busy' ? 'Salvando…' : s === 'off' ? 'Offline' : user ? 'Sincronizado' : 'Neste aparelho'; } }
addEventListener('online', () => user && save());

// link de convite: www.meusemestre.com.br/?c=CODIGO
(() => { try { const c = new URLSearchParams(location.search).get('c'); if (c) { localStorage.setItem(KEY + ':convite', c.toUpperCase().slice(0, 20)); history.replaceState(null, '', location.pathname + location.hash); } } catch { } })();
const convitePendente = () => { try { return localStorage.getItem(KEY + ':convite'); } catch { return null; } };
async function boot() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { });
  $('#root').innerHTML = `<div class="auth"><div class="spin"></div></div>`;
  let cache = null; try { cache = JSON.parse(localStorage.getItem(KEY + ':cfg')); } catch { }
  const buscarCfg = fetch('/api/config').then(r => r.ok ? r.json() : null).then(c => { if (c) { cfg = { ...cfg, ...c }; try { localStorage.setItem(KEY + ':cfg', JSON.stringify(c)); } catch { } } return c; }).catch(() => null);
  if (cache?.supabaseUrl) { cfg = { ...cfg, ...cache }; buscarCfg; } else await buscarCfg;
  // desenvolvimento local sem Vercel: lê config.local.json (fora do git)
  if (!cfg.supabaseUrl && ['localhost', '127.0.0.1'].includes(location.hostname)) { try { const r = await fetch('config.local.json'); if (r.ok) cfg = { ...cfg, ...(await r.json()) }; } catch { } }
  if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') return novaSenhaSheet();
      if (ev === 'SIGNED_IN' && (!user || user.id !== session.user.id)) entrar(session.user);
      if (ev === 'SIGNED_OUT') { user = null; renderAuth(); }
    });
    const { data } = await sb.auth.getSession();
    if (data.session) return entrar(data.session.user);
  }
  if (localStorage.getItem(KEY + ':modo') === 'local') return entrarLocal();
  renderAuth();
}
async function entrar(u) {
  user = u; modoLocal = false;
  S = migrar(loadLocal(':' + u.id));
  startApp();
  setSync('busy');
  const { data, error } = await sb.from('user_data').select('data,updated_at').eq('user_id', u.id).maybeSingle();
  if (error) return setSync('off');
  if (data?.data && Object.keys(data.data).length) {
    S = migrar(data.data);
    if (JSON.stringify(S) !== JSON.stringify(data.data)) save(); else { saveLocal(); setSync('ok'); } // grava na nuvem a limpeza de duplicadas
  }
  else {
    const local = loadLocal(':local');
    if (local?.materias?.length) { S = migrar(local); toast('Seus dados deste aparelho foram enviados para sua conta.'); }
    S.perfil.nome ||= u.user_metadata?.full_name || u.user_metadata?.name || '';
    save();
  }
  render();
  carregarPlano();
}
function entrarLocal() { modoLocal = true; user = null; try { localStorage.setItem(KEY + ':modo', 'local'); } catch { } S = migrar(loadLocal(':local')); startApp(); }
async function sair() {
  closeSheet();
  try { localStorage.removeItem(KEY + ':modo'); } catch { }
  if (sb && user) await sb.auth.signOut();
  user = null; modoLocal = false; PLANO = { premium: false, plano: 'gratis', admin: false, ia: { usados: 0, limite: 3 } }; try { localStorage.removeItem(KEY + ':plano'); } catch { } renderAuth();
}

// ================= Tela de login =================
let authMode = 'entrar';
function renderAuth() {
  document.body.classList.remove('app');
  const semBackend = !sb;
  $('#root').innerHTML = `<div class="auth"><div class="box">
    <img class="logo" src="icon.svg" alt="">
    <h1>${authMode === 'criar' ? 'Crie sua conta' : 'Seu semestre, organizado'}</h1>
    <p class="mu" style="margin:6px 0 22px">Frequência, grade, notas e estudos — montados a partir do plano de ensino.</p>
    ${convitePendente() ? `<div class="card flat convite"><span style="font-size:22px">🎁</span><div class="sp"><b class="sm">Você foi convidado!</b><div class="mu">Crie sua conta e ganhe <b>45 dias de Premium grátis</b> (15 a mais que o normal).</div></div></div>` : ''}
    ${semBackend ? `<div class="card flat" style="margin-bottom:16px"><div class="row">${ic('alert')}<span class="sm">Login indisponível neste ambiente (Supabase não configurado). Você pode usar o app só neste aparelho.</span></div></div>` : `
    <div id="gbtn" style="min-height:44px;display:flex;justify-content:center"><button class="btn block" onclick="loginGoogle()">${GOOGLE} Continuar com Google</button></div>
    <div class="divider">ou com e-mail</div>
    <form class="fields" onsubmit="event.preventDefault();loginEmail()">
      ${authMode === 'criar' ? `<label class="f">Nome<input id="a-nome" autocomplete="name" required></label>` : ''}
      <label class="f">E-mail<input id="a-email" type="email" autocomplete="email" required></label>
      <label class="f">Senha<input id="a-senha" type="password" minlength="6" autocomplete="${authMode === 'criar' ? 'new-password' : 'current-password'}" required></label>
      <button class="btn pr block" id="a-btn">${authMode === 'criar' ? 'Criar conta' : 'Entrar'}</button>
    </form>
    <div class="between" style="margin-top:12px">
      <button class="btn ghost sm" onclick="authMode='${authMode === 'criar' ? 'entrar' : 'criar'}';renderAuth()">${authMode === 'criar' ? 'Já tenho conta' : 'Criar conta'}</button>
      ${authMode === 'entrar' ? `<button class="btn ghost sm" onclick="esqueciSenha()">Esqueci a senha</button>` : ''}
    </div>
    <div class="divider"></div>`}
    <button class="btn ${semBackend ? 'pr' : ''} block" onclick="entrarLocal()">Usar sem conta (só neste aparelho)</button>
    ${!standalone() && (isIOS() || /android/i.test(navigator.userAgent)) ? `<button class="btn ghost block" style="margin-top:12px" onclick="instalar()">${ic('phone', 18)} Instalar o app no celular</button>` : ''}
    <p class="mu" style="text-align:center;margin-top:18px">App independente, sem vínculo com nenhuma universidade.<br><a href="privacidade.html" style="color:inherit">Privacidade</a> · <a href="termos.html" style="color:inherit">Termos</a></p>
  </div></div>`;
  montarGoogle();
}
async function loginGoogle() {
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  if (error) toast('Não foi possível abrir o Google: ' + error.message);
}
async function loginEmail() {
  const email = $('#a-email').value.trim(), password = $('#a-senha').value, btn = $('#a-btn');
  btn.disabled = true; btn.textContent = 'Aguarde…';
  let r;
  if (authMode === 'criar') r = await sb.auth.signUp({ email, password, options: { data: { full_name: $('#a-nome').value.trim() }, emailRedirectTo: location.origin + '/app' } });
  else r = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = authMode === 'criar' ? 'Criar conta' : 'Entrar';
  if (r.error) return toast(traduzErro(r.error.message));
  if (authMode === 'criar' && !r.data.session) toast('Conta criada! Confirme pelo link enviado ao seu e-mail.');
}
const traduzErro = m => /invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /already registered/i.test(m) ? 'Este e-mail já tem conta. Entre com ele.' : /not confirmed/i.test(m) ? 'Confirme seu e-mail antes de entrar.' : m;
async function esqueciSenha() {
  const email = ($('#a-email')?.value || '').trim();
  if (!email) return toast('Digite seu e-mail no campo acima.');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/app' });
  toast(error ? traduzErro(error.message) : 'Enviamos um link para redefinir sua senha.');
}
function novaSenhaSheet() {
  sheet(`<h2>Nova senha</h2><div class="fields" style="margin-top:14px"><label class="f">Nova senha<input id="ns" type="password" minlength="6"></label></div>
  <div class="actions"><button class="btn pr block" onclick="trocarSenha()">Salvar</button></div>`);
}
async function trocarSenha() { const { error } = await sb.auth.updateUser({ password: $('#ns').value }); toast(error ? error.message : 'Senha alterada.'); if (!error) closeSheet(); }

// ================= Cálculos =================
function diasDeAula(m) {
  const out = [];
  if (!S.semestre.inicio || !S.semestre.fim) return out;
  const fer = new Set(S.feriados.map(f => f.data)), canc = new Set(m.canceladas || []);
  for (let d = parseISO(S.semestre.inicio); d <= parseISO(S.semestre.fim); d.setDate(d.getDate() + 1)) {
    const k = iso(d), hs = m.horarios.filter(h => +h.dia - 1 === d.getDay());
    if (!hs.length || fer.has(k) || canc.has(k)) continue;
    out.push({ data: k, aulas: hs.reduce((a, h) => a + (+h.aulas || 0), 0) });
  }
  return out;
}
function freq(m) {
  const dias = diasDeAula(m), gerado = dias.reduce((a, d) => a + d.aulas, 0);
  const total = +m.cargaHoraria || gerado;
  const faltas = Object.values(m.faltas || {}).reduce((a, n) => a + (+n || 0), 0);
  const max = Math.floor(total * (1 - FREQ_MIN));
  const pct = total ? Math.max(0, (1 - faltas / total) * 100) : 100;
  const nivel = max - faltas < 0 ? 'bad' : max && faltas / max >= .7 ? 'warn' : 'ok';
  return { dias, total, faltas, max, restam: max - faltas, pct, nivel };
}
function notas(m) {
  const av = m.avaliacoes || [], pesos = av.map(a => num(a.peso)), usaPeso = pesos.some(p => p > 0);
  const w = i => usaPeso ? (pesos[i] || 0) : 1, sumW = av.reduce((a, _, i) => a + w(i), 0);
  let feito = 0, wF = 0;
  av.forEach((a, i) => { const n = num(a.nota); if (n != null) { feito += n * w(i); wF += w(i); } });
  const parcial = wF ? feito / wF : null, wR = sumW - wF;
  const final = sumW && wR === 0 && av.length ? feito / sumW : null;
  const precisa = wR > 0 ? (MEDIA_APROV * sumW - feito) / wR : null;
  let sit = 'Em andamento', nivel = 'neu', mf = final;
  if (final != null) {
    const rec = num(m.rec);
    if (final >= MEDIA_APROV) { sit = 'Aprovado'; nivel = 'ok'; }
    else if (final >= MEDIA_REC) {
      if (rec != null) { mf = (final + rec) / 2; sit = mf >= MEDIA_APROV ? 'Aprovado (REC)' : 'Reprovado'; nivel = mf >= MEDIA_APROV ? 'ok' : 'bad'; }
      else { sit = 'Recuperação'; nivel = 'warn'; }
    } else { sit = 'Reprovado'; nivel = 'bad'; }
  } else if (precisa != null && wF && precisa > 10) { sit = 'Em risco'; nivel = 'bad'; }
  else if (precisa != null && wF && precisa > 7.5) { sit = 'Atenção'; nivel = 'warn'; }
  return { parcial, final, mf, precisa, sit, nivel };
}
function agendaDoDia(d) {
  const dow = parseISO(d).getDay() + 1, fer = S.feriados.find(f => f.data === d);
  const fora = S.semestre.inicio && S.semestre.fim && (d < S.semestre.inicio || d > S.semestre.fim);
  const aulas = fer || fora ? [] : S.materias.flatMap(m => (m.canceladas || []).includes(d) ? [] : m.horarios.filter(h => +h.dia === dow).map(h => ({ m, h })))
    .sort((a, b) => a.h.inicio.localeCompare(b.h.inicio));
  return { aulas, evs: todosEventos().filter(e => e.data === d), fer };
}
function todosEventos() {
  const avs = S.materias.flatMap(m => m.avaliacoes.filter(a => a.data).map(a => ({ id: 'av:' + m.id + ':' + a.id, data: a.data, titulo: a.nome, tipo: 'prova', materiaId: m.id, _av: true })));
  const fer = S.feriados.map(f => ({ id: 'fer:' + f.data, data: f.data, titulo: f.descricao || 'Feriado', tipo: 'feriado', _fer: true }));
  return [...S.eventos, ...avs, ...fer].sort((a, b) => a.data.localeCompare(b.data));
}
const corEv = e => e.tipo === 'feriado' ? 'var(--ok)' : byId(e.materiaId)?.cor || 'var(--tx-2)';

// ================= Navegação =================
let R = { v: 'inicio' };
function parseHash() { const [v = 'inicio', id, sub] = location.hash.replace(/^#\/?/, '').split('/'); R = { v: v || 'inicio', id, sub }; }
addEventListener('hashchange', () => {
  const antes = R.v; parseHash();
  const v = $('#view'); if (v) { v.classList.toggle('lado', R.v === 'disc' && antes !== 'disc'); v.classList.add('anim'); clearTimeout(v._t); v._t = setTimeout(() => v.classList.remove('anim'), 320); }
  render(); scrollTo(0, 0);
});
const go = h => { location.hash = '#/' + h; };
function startApp() {
  document.body.classList.add('app');
  parseHash();
  $('#root').innerHTML = `<header class="top" id="top"><div class="brand">${marca()}<span class="brand-tx">Meu Semestre</span></div><span class="ttl" id="ttl"></span><span class="sp"></span>
    <span class="sync" id="sync"><i></i><span></span></span>
    <a class="ib so-mobile" aria-label="Configurações" href="#/config">${ic('gear', 22)}</a></header>
    <main id="view"></main><nav class="bn" id="nav"></nav>`;
  setSync(syncState);
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
}
const NAV = [['inicio', 'home', 'Início'], ['agenda', 'cal', 'Agenda'], ['atualizar', 'plus', 'Atualizar'], ['disciplinas', 'book', 'Disciplinas'], ['historico', 'hist', 'Histórico']];
function render() {
  if (!$('#view')) return;
  const cur = R.v === 'disc' ? 'disciplinas' : R.v;
  $('#nav').innerHTML = NAV.map(([k, i, l]) => k === 'atualizar'
    ? `<a href="#/atualizar" class="fab ${cur === k ? 'on' : ''}"><span class="circ">${ic(i, 24)}</span><small>${l}</small></a>`
    : `<a href="#/${k}" class="${cur === k ? 'on' : ''}">${ic(i, 22)}${l}</a>`).join('') + `<a href="#/horas" class="so-desktop-nav ${cur === 'horas' ? 'on' : ''}">${ic('clip', 22)}Horas complementares</a><div class="cfg-link">${PLANO.admin ? `<a href="#/admin" class="${cur === 'admin' ? 'on' : ''}">${ic('user', 22)}Admin</a>` : ''}${user ? `<a href="#/indicar" class="${cur === 'indicar' ? 'on' : ''}">${ic('share', 22)}Indique e ganhe</a>` : ''}${user ? `<a href="#/premium" class="${cur === 'premium' ? 'on' : ''}">${ic('spark', 22)}${premium() && !['teste', 'gratis'].includes(PLANO.plano) ? 'Meu plano' : 'Seja Premium'}</a>` : ''}<a href="#/config" class="${cur === 'config' ? 'on' : ''}">${ic('gear', 22)}Configurações</a>
    <a href="#/config" class="eu">${avatarHTML(34)}<span class="tx"><b>${esc(S.perfil.nome || 'Sem nome')}</b><small>${esc(user?.email || 'Neste aparelho')}</small></span></a></div>`;
  $('#nav').insertAdjacentHTML('afterbegin', `<a href="#/inicio" class="nav-brand">${marca()}<b>Meu Semestre</b></a>`);
  aplicarTema(); aplicarRegras();
  $('#view').innerHTML = (V[R.v] || V.inicio)();
  const t = $('#ttl'); if (t) t.textContent = R.v === 'disc' ? nomeM(byId(R.id)) : R.v === 'config' ? 'Configurações' : R.v === 'premium' ? 'Premium' : R.v === 'indicar' ? 'Indique e ganhe' : R.v === 'horas' ? 'Horas complementares' : R.v === 'admin' ? 'Admin' : (NAV.find(n => n[0] === cur) || [, , ''])[2];
}

// ================= Componentes =================
const tag = (txt, n) => `<span class="tag ${n}">${esc(txt)}</span>`;
const pen = (fn, lbl = 'Editar') => `<button class="ib" aria-label="${lbl}" title="${lbl}" onclick="event.stopPropagation();${fn}">${ic('pen', 18)}</button>`;
const ring = (p, c, t) => `<div class="ring" style="--p:${p};--c:${c}"><b>${t}</b></div>`;
const nivelCor = n => `var(--${n === 'neu' ? 'tx-2' : n})`;
const vazio = (icn, t, d, acao = '') => `<div class="card empty"><div class="ic">${ic(icn, 26)}</div><h3>${t}</h3><p class="mu" style="margin:6px 0 16px">${d}</p><div class="row wrap" style="justify-content:center">${acao}</div></div>`;
const marca = () => `<span class="marca">${ic('cap', 20)}</span>`;
const ctaImportar = `<a class="btn pr" href="#/atualizar">${ic('up')} Enviar plano de ensino</a>`;

// ================= Telas =================
const V = {};

V.inicio = () => {
  const h = hoje(), ag = agendaDoDia(h), agora = new Date(), mins = agora.getHours() * 60 + agora.getMinutes();
  const nome = (S.perfil.nome || '').split(' ')[0];
  const sauda = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const topo = `<div class="pg-h"><div><p class="mu cap1">${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${sauda}${nome ? ', ' + esc(nome) : ''} 👋</h1>${linhaCurso()}</div>
    <div class="row pg-acoes"><button class="btn" onclick="eventoSheet()">${ic('plus', 18)} Evento</button><a class="btn pr" href="#/atualizar">${ic('up', 18)} Atualizar</a></div></div>`;
  if (!S.materias.length) return `<div class="stack">${topo}${avisoTeste()}${boasVindas()}</div>`;

  // indicadores
  const fs = S.materias.map(freq), ns = S.materias.map(notas).map(n => n.mf ?? n.parcial).filter(n => n != null);
  const freqMed = fs.length ? fs.reduce((a, f) => a + f.pct, 0) / fs.length : 100;
  const mediaG = ns.length ? ns.reduce((a, n) => a + n, 0) / ns.length : null;
  const em7 = todosEventos().filter(e => e.data >= h && diasAte(e.data) <= 7 && e.tipo !== 'feriado').length;
  const tp = S.materias.flatMap(m => m.topicos), feitos = tp.filter(t => t.feito).length, pc = tp.length ? Math.round(feitos / tp.length * 100) : 0;
  const risco = fs.filter(f => f.nivel !== 'ok').length;
  const kpi = (icone, rot, val, sub, cor = 'var(--pr)', link = '') => `<${link ? `a href="${link}"` : 'div'} class="kpi card ${link ? 'tap' : ''}"><span class="kpi-ic" style="color:${cor};background:color-mix(in srgb,${cor} 14%,transparent)">${ic(icone, 18)}</span><div class="mu">${rot}</div><div class="kpi-v">${val}</div><div class="mu sm">${sub}</div></${link ? 'a' : 'div'}>`;
  const kpis = `<div class="kpis">
    ${kpi('check', 'Presença média', Math.round(freqMed) + '%', risco ? `${risco} disciplina(s) em atenção` : 'Tudo em dia', risco ? 'var(--warn)' : 'var(--ok)', '#/disciplinas')}
    ${kpi('pen', 'Média geral', fmt(mediaG), mediaG == null ? 'Sem notas ainda' : mediaG >= MEDIA_APROV ? 'Acima de 6,0' : 'Abaixo de 6,0', mediaG != null && mediaG < MEDIA_APROV ? 'var(--bad)' : 'var(--pr)', '#/disciplinas')}
    ${kpi('cal', 'Próximos 7 dias', em7, em7 === 1 ? 'prova ou entrega' : 'provas e entregas', '#7048e8', '#/agenda')}
    ${kpi('book', 'Conteúdos', pc + '%', `${feitos} de ${tp.length} estudados`, '#0ca678', '#/disciplinas')}</div>`;

  // coluna principal
  let main = '';
  if (!S.semestre.inicio) main += `<a class="card tap row" href="#/config" style="color:inherit;text-decoration:none">${ic('alert')}<div class="sp"><b>Defina as datas do semestre</b><div class="mu">Necessário para calcular os dias de aula e as faltas.</div></div>${ic('right')}</a>`;
  const prox = ag.aulas.find(a => { const f = fimAula(a.h.inicio, a.h.aulas).split(':'); return +f[0] * 60 + +f[1] > mins; });
  if (prox) {
    const em = +prox.h.inicio.slice(0, 2) * 60 + +prox.h.inicio.slice(2) - mins;
    main += `<div class="card hero tap" onclick="go('disc/${prox.m.id}')"><p class="mu">${em <= 0 ? 'Acontecendo agora' : em < 90 ? `Começa em ${em} min` : 'Próxima aula hoje'}</p>
      <h2 style="margin:4px 0">${esc(nomeM(prox.m))}</h2><p class="mu">${hhmm(prox.h.inicio)}–${fimAula(prox.h.inicio, prox.h.aulas)}${prox.h.sala ? ' · ' + esc(prox.h.sala) : ''}</p></div>`;
  }
  main += `<div class="card"><div class="card-h"><h3 class="sp">Aulas de hoje</h3><a class="btn ghost sm" href="#/agenda">Ver agenda</a></div>`;
  if (ag.fer) main += `<p class="mu">${esc(ag.fer.descricao || 'Feriado')} — sem aula 🎉</p>`;
  else if (!ag.aulas.length) main += `<p class="mu">Nenhuma aula hoje. Bom descanso!</p>`;
  else main += `<div class="list">${ag.aulas.map(({ m, h: x }) => {
    const f = m.faltas[h] || 0;
    return `<div class="row"><span class="swatch" style="background:${m.cor}"></span><div class="sp"><b>${esc(nomeM(m))}</b><div class="mu">${hhmm(x.inicio)}–${fimAula(x.inicio, x.aulas)}${x.sala ? ' · ' + esc(x.sala) : ''}</div></div>
      <button class="btn sm ${f ? 'danger' : ''}" onclick="toggleFalta('${m.id}','${h}')" aria-pressed="${!!f}">${f ? ic('x', 16) + ' Faltei' : ic('check', 16) + ' Presente'}</button></div>`;
  }).join('')}</div>`;
  main += `</div>`;
  // disciplinas resumidas
  main += `<div class="card"><div class="card-h"><h3 class="sp">Suas disciplinas</h3><a class="btn ghost sm" href="#/disciplinas">Ver todas</a></div><div class="list">${S.materias.map(m => {
    const f = freq(m), n = notas(m);
    return `<a class="row" href="#/disc/${m.id}" style="color:inherit;text-decoration:none"><span class="swatch" style="background:${m.cor}"></span><div class="sp"><b>${esc(nomeM(m))}</b><div class="mu">${esc(m.codigo)}</div></div>
      <div class="mini"><span class="mu">Presença</span><b style="color:${nivelCor(f.nivel)}">${Math.round(f.pct)}%</b></div><div class="mini"><span class="mu">Média</span><b>${fmt(n.mf ?? n.parcial)}</b></div>${ic('right', 18)}</a>`;
  }).join('')}</div></div>`;

  // coluna lateral
  let lado = '';
  const al = S.materias.map(m => ({ m, f: freq(m) })).filter(o => o.f.nivel !== 'ok');
  if (al.length) lado += `<div class="card" style="border-color:var(--warn)"><div class="card-h"><span style="color:var(--warn)">${ic('alert')}</span><h3>Atenção às faltas</h3></div><div class="list">${al.map(({ m, f }) => `<div class="between"><span class="sm">${esc(nomeM(m))}</span>${f.restam < 0 ? tag('Limite ultrapassado', 'bad') : tag(`Mais ${f.restam}`, 'warn')}</div>`).join('')}</div></div>`;
  const evs = todosEventos().filter(e => e.data >= h).slice(0, 6);
  lado += `<div class="card"><div class="card-h"><h3 class="sp">Próximas datas</h3><button class="btn ghost sm" onclick="eventoSheet()">${ic('plus', 16)}</button></div>
    ${evs.length ? `<div class="list">${evs.map(e => `<div class="row"><div class="dia-box" style="--c:${corEv(e)}"><b>${parseISO(e.data).getDate()}</b><small>${parseISO(e.data).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div><div class="sp"><b class="sm">${esc(e.titulo)}</b><div class="mu">${esc(nomeM(byId(e.materiaId)) || TIPOS_EV[e.tipo] || '')} · ${quando(e.data)}</div></div></div>`).join('')}</div>` : '<p class="mu">Nenhuma data cadastrada.</p>'}</div>`;
  lado += `<div class="card tap" onclick="go('disciplinas')"><div class="row">${ring(pc, 'var(--pr)', tp.length ? pc + '%' : '—')}<div class="sp"><b>Conteúdos estudados</b><div class="mu">${feitos} de ${tp.length} em ${S.materias.length} disciplina(s)</div></div>${ic('right')}</div></div>`;
  lado += cardHoras();
  if (user) lado += `<a class="card tap row indica-card" href="#/indicar" style="color:inherit;text-decoration:none"><span style="font-size:26px">🎁</span><div class="sp"><b>Indique e ganhe</b><div class="mu">1 mês de Premium por amigo que assinar</div></div>${ic('right')}</a>`;
  lado += cardInstalar();

  return `<div class="stack">${topo}${avisoTeste()}${kpis}<div class="dash"><div class="stack">${main}</div><div class="stack">${lado}</div></div></div>`;
};
function boasVindas() {
  const passo = (n, icone, t, d, acao) => `<div class="card passo"><div class="row"><span class="num">${n}</span><span class="kpi-ic" style="color:var(--pr);background:var(--pr-2)">${ic(icone, 18)}</span></div><h3 style="margin:14px 0 6px">${t}</h3><p class="mu" style="margin:0 0 16px">${d}</p>${acao}</div>`;
  return `<div class="card boas"><div class="boas-tx"><span class="tag neu" style="margin-bottom:12px">${ic('spark', 14)} Comece por aqui</span><h2 style="font-size:24px">Vamos montar seu semestre</h2>
      <p class="mu" style="margin:8px 0 18px;font-size:15px">Envie o plano de ensino de cada disciplina (PDF ou print). O app cria a grade, calcula as faltas permitidas, monta as avaliações e a lista de conteúdos. Depois é só editar o que quiser pelo ✏️.</p>
      <a class="btn pr" href="#/atualizar">${ic('up', 18)} Enviar plano de ensino</a></div>
    <div class="boas-ilu" aria-hidden="true"><div class="mock"><i style="background:#2846d6;grid-row:span 2"></i><i></i><i style="background:#14945a"></i><i></i><i style="background:#d6336c;grid-row:span 2"></i><i style="background:#7048e8"></i><i></i><i style="background:#e8590c"></i><i></i></div></div></div>
  <div class="passos">
    ${passo(1, 'up', 'Envie os planos', 'PDF do CAGR, print do Moodle ou texto colado. Pode mandar vários de uma vez.', `<a class="btn sm" href="#/atualizar">Enviar agora</a>`)}
    ${passo(2, 'cal', 'Confira o semestre', 'Datas de início e fim e feriados, para contar os dias de aula certinho.', `<a class="btn sm" href="#/config">Abrir configurações</a>`)}
    ${passo(3, 'bell', 'Receba lembretes', 'Resumo diário com aulas, provas e alerta de faltas. Funciona com o app instalado.', standalone() ? `<a class="btn sm" href="#/config">Ativar lembretes</a>` : `<button class="btn sm" onclick="instalar()">Instalar o app</button>`)}
  </div>`;
}

let agModo = 'semana', agMes = null, agSel = null;
V.agenda = () => {
  let html = `<div class="stack"><div class="between"><h1>Agenda</h1><button class="btn sm" onclick="eventoSheet()">${ic('plus', 16)} Evento</button></div>
    <div class="seg"><button class="${agModo === 'semana' ? 'on' : ''}" onclick="agModo='semana';render()">Grade</button><button class="${agModo === 'mes' ? 'on' : ''}" onclick="agModo='mes';render()">Calendário</button><button class="${agModo === 'lista' ? 'on' : ''}" onclick="agModo='lista';render()">Datas</button></div>`;
  if (agModo === 'semana') {
    const dias = [2, 3, 4, 5, 6, 7].filter(d => d < 7 || S.materias.some(m => m.horarios.some(h => +h.dia === 7)));
    const oc = {};
    S.materias.forEach(m => m.horarios.forEach(h => { const i = SLOTS.indexOf(h.inicio); for (let k = 0; k < (+h.aulas || 1); k++) { const s = SLOTS[i + k]; if (s) oc[h.dia + s] = { m, h, first: !k }; } }));
    const usados = SLOTS.filter(s => dias.some(d => oc[d + s]));
    if (!usados.length) return html + vazio('cal', 'Grade vazia', 'Os horários aparecem aqui quando você importa um plano de ensino ou edita uma disciplina.', ctaImportar) + '</div>';
    const porNome = !!S.perfil.gradeNome;
    html += `<div class="row wrap"><div class="seg" style="width:auto"><button class="${porNome ? '' : 'on'}" onclick="S.perfil.gradeNome=false;save();render()">Código</button><button class="${porNome ? 'on' : ''}" onclick="S.perfil.gradeNome=true;save();render()">Nome</button></div><span class="sp"></span><button class="btn sm" onclick="compartilharGrade()">${ic('up', 16)} Compartilhar grade</button><button class="btn sm" onclick="exportarAgenda()">${ic('cal', 16)} Google Agenda</button></div>`;
    html += `<div class="card"><div class="wk" style="--d:${dias.length}"><div></div>${dias.map(d => `<div class="h">${DIAS[d]}</div>`).join('')}
      ${usados.map(s => `<div class="t">${hhmm(s)}</div>${dias.map(d => { const o = oc[d + s]; return o ? `<div class="c has" style="background:${o.m.cor};${o.first ? '' : 'opacity:.8'}" onclick="go('disc/${o.m.id}')">${o.first ? `<span class="wk-nome">${esc(porNome ? (o.m.nome || o.m.codigo) : (o.m.codigo || o.m.nome))}</span>` + (o.h.sala ? `<small>${esc(o.h.sala)}</small>` : '') : ''}</div>` : '<div class="c"></div>'; }).join('')}`).join('')}</div></div>`;
  } else if (agModo === 'mes') {
    agMes ||= hoje().slice(0, 7); agSel ||= hoje();
    const [y, mo] = agMes.split('-').map(Number), first = new Date(y, mo - 1, 1), start = new Date(first); start.setDate(1 - first.getDay());
    const evs = todosEventos();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = iso(d);
      const ag = agendaDoDia(k), dots = [...new Set([...ag.aulas.map(a => a.m.cor), ...evs.filter(e => e.data === k).map(corEv)])].slice(0, 4);
      cells += `<button class="${d.getMonth() !== mo - 1 ? 'out' : ''} ${k === hoje() ? 'today' : ''} ${k === agSel ? 'sel' : ''}" aria-label="${brDL(k)}" onclick="agSel='${k}';render()">${d.getDate()}<span class="ds">${dots.map(c => `<i style="background:${c}"></i>`).join('')}</span></button>`;
    }
    const nav = dm => iso(new Date(y, mo - 1 + dm, 1)).slice(0, 7);
    html += `<div class="card"><div class="between" style="margin-bottom:8px"><button class="ib" aria-label="Mês anterior" onclick="agMes='${nav(-1)}';render()">${ic('left')}</button><h3 style="text-transform:capitalize">${first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3><button class="ib" aria-label="Próximo mês" onclick="agMes='${nav(1)}';render()">${ic('right')}</button></div>
      <div class="cal">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<div class="wd">${d}</div>`).join('')}${cells}</div></div>`;
    const ag = agendaDoDia(agSel);
    html += `<div class="card"><div class="card-h"><h3 class="sp" style="text-transform:capitalize">${brDL(agSel)}</h3><button class="btn ghost sm" onclick="eventoSheet(null,'${agSel}')">${ic('plus', 16)} Evento</button></div>
      ${ag.fer ? `<p>${tag('Feriado', 'ok')} ${esc(ag.fer.descricao)}</p>` : ''}
      <div class="list">${ag.aulas.map(({ m, h }) => `<div class="row"><span class="swatch" style="background:${m.cor}"></span><div class="sp"><b>${esc(nomeM(m))}</b><div class="mu">${hhmm(h.inicio)}–${fimAula(h.inicio, h.aulas)}</div></div>${m.faltas[agSel] ? tag(m.faltas[agSel] + ' falta(s)', 'bad') : ''}</div>`).join('')}
      ${ag.evs.filter(e => !e._fer).map(linhaEvento).join('')}</div>
      ${!ag.aulas.length && !ag.evs.length ? '<p class="mu">Nada neste dia.</p>' : ''}</div>`;
  } else {
    const evs = todosEventos().filter(e => e.data >= hoje());
    html += evs.length ? `<div class="card"><div class="list">${evs.map(linhaEvento).join('')}</div></div>` : vazio('cal', 'Sem datas futuras', 'Provas, entregas e feriados aparecem aqui. Envie um print do cronograma ou do calendário acadêmico na aba Atualizar.', `<a class="btn pr" href="#/atualizar/cronograma">${ic('cam')} Enviar print</a>`);
  }
  return html + '</div>';
};
const linhaEvento = e => `<div class="row"><span class="dot" style="background:${corEv(e)}"></span><div class="sp"><b>${esc(e.titulo)}</b><div class="mu">${brDL(e.data)} · ${esc(TIPOS_EV[e.tipo] || e.tipo)}${e.materiaId ? ' · ' + esc(nomeM(byId(e.materiaId))) : ''}</div></div>
  ${e._av ? pen(`avSheet('${e.materiaId}','${e.id.split(':')[2]}')`) : e._fer ? pen('configSheet()') : pen(`eventoSheet('${e.id}')`)}</div>`;

V.disciplinas = () => {
  let html = `<div class="stack"><div class="between"><h1>Disciplinas</h1><div class="row"><a class="btn sm" href="#/horas">${ic('clip', 16)} Horas compl.</a><button class="btn sm" onclick="discSheet()">${ic('plus', 16)} Nova</button></div></div>`;
  if (!S.materias.length) return html + vazio('book', 'Nenhuma disciplina ainda', 'Importe pelo plano de ensino ou crie manualmente.', `${ctaImportar}<button class="btn" onclick="discSheet()">Criar manual</button>`) + '</div>';
  html += `<div class="grid two">${S.materias.map(m => {
    const f = freq(m), n = notas(m), tp = m.topicos, fe = tp.filter(t => t.feito).length;
    return `<div class="card tap" onclick="go('disc/${m.id}')"><div class="row" style="align-items:flex-start"><span class="swatch" style="background:${m.cor};min-height:44px"></span>
      <div class="sp"><div class="mu">${esc(m.codigo)}${m.turma ? ' · ' + esc(m.turma) : ''}</div><h3>${esc(m.nome || m.codigo)}</h3></div>${tag(n.sit, n.nivel)}</div>
      <div class="stats" style="margin-top:12px"><div class="stat"><div class="mu">Presença</div><div class="v" style="color:${nivelCor(f.nivel)}">${f.pct.toFixed(0)}%</div></div>
      <div class="stat"><div class="mu">Média</div><div class="v">${fmt(n.mf ?? n.parcial)}</div></div>
      <div class="stat"><div class="mu">Estudos</div><div class="v">${fe}/${tp.length}</div></div></div></div>`;
  }).join('')}</div>`;
  return html + '</div>';
};

V.disc = () => {
  const m = byId(R.id);
  if (!m) { setTimeout(() => go('disciplinas')); return ''; }
  const sub = R.sub || 'resumo', f = freq(m), n = notas(m);
  let html = `<div class="stack"><div class="row"><a class="ib" href="#/disciplinas" aria-label="Voltar">${ic('back')}</a><span class="sp"></span>${pen(`discSheet('${m.id}')`, 'Editar disciplina')}</div>
  <div class="card" style="border-top:5px solid ${m.cor}"><div class="mu">${esc(m.codigo)}${m.turma ? ' · Turma ' + esc(m.turma) : ''}</div><h1 style="font-size:22px;margin:2px 0 4px">${esc(m.nome || m.codigo)}</h1>
    <div class="mu">${esc(m.professor || 'Professor(a) não informado')} · ${f.total} h/a</div>
    <div class="chips" style="margin-top:10px">${m.horarios.map(h => `<span class="tag neu">${DIAS[h.dia]} ${hhmm(h.inicio)}–${fimAula(h.inicio, h.aulas)}${h.sala ? ' · ' + esc(h.sala) : ''}</span>`).join('') || '<span class="mu">Sem horários</span>'}</div></div>
  <div class="seg">${[['resumo', 'Resumo'], ['faltas', 'Faltas'], ['notas', 'Notas'], ['estudos', 'Estudos']].map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" onclick="go('disc/${m.id}/${k}')">${l}</button>`).join('')}</div>`;

  if (sub === 'resumo') {
    const prox = m.avaliacoes.filter(a => a.data && a.data >= hoje()).sort((a, b) => a.data.localeCompare(b.data))[0];
    html += `<div class="grid two"><div class="card"><div class="row">${ring(Math.round(f.pct), nivelCor(f.nivel), Math.round(f.pct) + '%')}<div class="sp"><b>Presença</b><div class="mu" style="margin-bottom:4px">${f.faltas} de ${f.max} faltas usadas</div>${f.restam >= 0 ? tag(`Pode faltar mais ${f.restam}`, f.nivel) : tag('Reprovado por frequência', 'bad')}</div></div></div>
      <div class="card"><div class="row"><div class="sp"><b>Média ${n.final != null ? 'final' : 'parcial'}</b><div class="big">${fmt(n.mf ?? n.parcial)}</div></div>${tag(n.sit, n.nivel)}</div>
      ${n.precisa != null ? `<p class="mu">Precisa de <b>${n.precisa > 10 ? 'mais de 10' : fmt(Math.max(0, n.precisa))}</b> de média nas próximas para fechar 6,0.</p>` : ''}</div></div>
      ${prox ? `<div class="card"><div class="row">${ic('cal')}<div class="sp"><b>Próxima avaliação: ${esc(prox.nome)}</b><div class="mu">${brDL(prox.data)} · ${quando(prox.data)}</div></div></div></div>` : ''}
      <a class="card tap row" style="text-decoration:none;color:inherit" href="#/atualizar">${ic('cam')}<div class="sp"><b>Atualizar com print ou PDF</b><div class="mu">Notas do Moodle, novo cronograma, mudança de sala…</div></div>${ic('right')}</a>`;
  }
  if (sub === 'faltas') {
    const uso = f.max ? Math.min(100, f.faltas / f.max * 100) : 0;
    html += `<div class="card"><div class="between"><b>${f.faltas} / ${f.max} faltas</b>${tag(f.pct.toFixed(0) + '% de presença', f.nivel)}</div><div class="bar" style="margin:10px 0 6px"><i style="width:${uso}%;background:${nivelCor(f.nivel)}"></i></div>
      <p class="mu">Mínimo de 75% de presença. Total de ${f.total} h/a${m.cargaHoraria ? '' : ' (calculado pela grade)'}.</p></div>`;
    if (!f.dias.length) html += vazio('cal', 'Sem dias de aula', 'Defina as datas do semestre nas configurações e os horários da disciplina.', `<button class="btn pr" onclick="configSheet()">Definir semestre</button>`);
    else html += `<div class="card"><div class="list">${f.dias.filter(d => d.data <= hoje()).reverse().map(d => {
      const v = m.faltas[d.data] || 0;
      return `<div class="row"><div class="sp"><b class="sm" style="text-transform:capitalize">${brDL(d.data)}</b><div class="mu">${d.aulas} aula(s)</div></div>
        <select style="width:auto;min-height:36px" aria-label="Presença em ${brD(d.data)}" onchange="setFalta('${m.id}','${d.data}',this.value)">${Array.from({ length: d.aulas + 1 }, (_, i) => `<option value="${i}" ${i === v ? 'selected' : ''}>${i ? i + ' falta(s)' : 'Presente'}</option>`).join('')}</select>
        <button class="ib" aria-label="Marcar aula como cancelada" title="Aula cancelada" onclick="cancelarAula('${m.id}','${d.data}')">${ic('x', 18)}</button></div>`;
    }).join('') || '<p class="mu">Nenhuma aula até hoje.</p>'}</div></div>
    ${m.canceladas.length ? `<p class="mu">${m.canceladas.length} aula(s) cancelada(s) · <button class="btn ghost sm" onclick="upd(()=>byId('${m.id}').canceladas=[])">restaurar</button></p>` : ''}`;
  }
  if (sub === 'notas') {
    html += `<div class="card"><div class="card-h"><h3 class="sp">Avaliações</h3><button class="btn ghost sm" onclick="avSheet('${m.id}')">${ic('plus', 16)} Adicionar</button></div>
      ${m.avaliacoes.length ? `<div class="list">${m.avaliacoes.map(a => `<div class="row"><div class="sp"><b>${esc(a.nome)}</b><div class="mu">${a.peso ? 'Peso ' + esc(a.peso) + '%' : 'Peso igual'}${a.data ? ' · ' + brD(a.data) : ''}</div></div><span class="big" style="font-size:20px">${fmt(num(a.nota))}</span>${pen(`avSheet('${m.id}','${a.id}')`)}</div>`).join('')}</div>` : '<p class="mu">Nenhuma avaliação. Adicione ou importe o plano de ensino.</p>'}</div>
      <div class="card"><div class="between"><div><div class="mu">Média ${n.final != null ? 'final' : 'parcial'}</div><div class="big">${fmt(n.mf ?? n.parcial)}</div></div>${tag(n.sit, n.nivel)}</div>
      ${n.final != null && n.final < MEDIA_APROV && n.final >= MEDIA_REC ? `<label class="f" style="margin-top:12px">Nota da recuperação<input inputmode="decimal" value="${esc(m.rec)}" onchange="upd(()=>byId('${m.id}').rec=this.value)"></label>` : ''}
      <p class="mu" style="margin-top:8px">Sua regra: aprovação com média ≥ ${fmt(MEDIA_APROV)} e presença ≥ ${Math.round(FREQ_MIN * 100)}%. Média a partir de ${fmt(MEDIA_REC)} dá direito à recuperação; a final é (média + REC) ÷ 2. <a href="#/config">Ajustar regras</a></p></div>`;
  }
  if (sub === 'estudos') {
    const tp = m.topicos, fe = tp.filter(t => t.feito).length;
    html += `<div class="card"><div class="between"><b>${fe} de ${tp.length} conteúdos</b><span class="mu">${tp.length ? Math.round(fe / tp.length * 100) : 0}%</span></div><div class="bar" style="margin-top:8px"><i style="width:${tp.length ? fe / tp.length * 100 : 0}%;background:${m.cor}"></i></div></div>
      <div class="card">${tp.map(t => `<div class="todo ${t.feito ? 'done' : ''}"><input type="checkbox" aria-label="Concluído" ${t.feito ? 'checked' : ''} onchange="togTop('${m.id}','${t.id}')"><span class="tx sp">${esc(t.texto)}</span>${pen(`topicoSheet('${m.id}','${t.id}')`)}</div>`).join('')}
      <form class="row" style="margin-top:10px" onsubmit="event.preventDefault();addTop('${m.id}',this.t.value)"><input name="t" placeholder="Adicionar conteúdo para estudar"><button class="btn pr" aria-label="Adicionar">${ic('plus')}</button></form></div>`;
  }
  return html + '</div>';
};
function togTop(mid_, tid) { vibrar(8); upd(() => { const t = byId(mid_).topicos.find(x => x.id === tid); t.feito = !t.feito; }); }
function addTop(mid_, v) { if (v.trim()) upd(() => byId(mid_).topicos.push({ id: uid(), texto: v.trim(), feito: false })); }

V.historico = () => {
  const hs = S.historico, grupos = {};
  hs.forEach(h => (grupos[h.semestre || 'Sem semestre'] ||= []).push(h));
  let somaN = 0, somaC = 0;
  hs.forEach(h => { const n = num(h.nota), c = num(h.creditos) || 1; if (n != null) { somaN += n * c; somaC += c; } });
  const cred = hs.filter(h => /aprov|valid/i.test(h.situacao)).reduce((a, h) => a + (num(h.creditos) || 0), 0);
  let html = `<div class="stack"><div class="between"><h1>Histórico</h1><button class="btn sm" onclick="histSheet()">${ic('plus', 16)} Adicionar</button></div>`;
  if (!hs.length) return html + vazio('hist', 'Seu histórico aparece aqui', 'Envie um print ou o PDF do histórico escolar (CAGR) e as disciplinas cursadas são lançadas automaticamente.', `<a class="btn pr" href="#/atualizar/historico">${ic('cam')} Enviar histórico</a>`) + '</div>';
  html += `<div class="stats"><div class="stat"><div class="mu">Média geral</div><div class="v">${fmt(somaC ? somaN / somaC : null)}</div></div><div class="stat"><div class="mu">Disciplinas</div><div class="v">${hs.length}</div></div><div class="stat"><div class="mu">Créditos</div><div class="v">${cred}</div></div></div>
    <p class="mu">Média ponderada pelos créditos — uma estimativa do IAA.</p>`;
  html += Object.keys(grupos).sort().reverse().map(sem => `<div class="card"><h3 style="margin-bottom:6px">${esc(sem)}</h3><div class="list">${grupos[sem].map(h => `<div class="row"><div class="sp"><b>${esc(h.nome || h.codigo)}</b><div class="mu">${esc(h.codigo)}${h.creditos ? ' · ' + esc(h.creditos) + ' créd.' : ''}</div></div>
    <div style="text-align:right"><div><b>${fmt(num(h.nota))}</b></div>${h.situacao ? tag(h.situacao, /aprov|valid/i.test(h.situacao) ? 'ok' : /reprov|\bfi\b/i.test(h.situacao) ? 'bad' : 'neu') : ''}</div>${pen(`histSheet('${h.id}')`)}</div>`).join('')}</div></div>`).join('');
  return html + '</div>';
};

// ================= Atualizar (print / PDF / texto → IA → revisão) =================
const TIPOS_UP = [['plano', 'Plano de ensino'], ['curriculo', 'Currículo do curso'], ['cronograma', 'Cronograma / calendário'], ['notas', 'Notas'], ['historico', 'Histórico escolar'], ['grade', 'Grade de horários'], ['outro', 'Outro']];
let UP = { tipo: 'plano', arquivos: [], fase: 'enviar', mudancas: [], resumo: '', erro: '' };
V.atualizar = () => {
  if (R.id && TIPOS_UP.some(t => t[0] === R.id) && UP.fase === 'enviar' && !UP.arquivos.length) UP.tipo = R.id;
  if (UP.fase === 'processando') return `<div class="card empty" style="margin-top:24px"><div class="spin"></div><h3 style="margin-top:16px">Lendo seus arquivos…</h3><p class="mu" id="up-etapa">Isso leva de 10 a 40 segundos.</p></div>`;
  if (UP.fase === 'revisar') return revisarView();
  const ia = cfg.aiEnabled && user;
  return `<div class="stack"><div><h1>Atualizar</h1><p class="mu" style="margin-top:4px">Envie prints, fotos ou PDFs. ${ia ? 'A IA identifica o que mudou e você revisa antes de aplicar.' : 'Sem login com IA ativa, só PDFs de texto e texto colado de plano de ensino são lidos.'}</p></div>
    <div><div class="mu" style="margin-bottom:8px">O que você está enviando?</div><div class="chips">${TIPOS_UP.map(([k, l]) => `<button class="chip ${UP.tipo === k ? 'on' : ''}" onclick="UP.tipo='${k}';render()">${l}</button>`).join('')}</div></div>
    <div class="drop" id="drop" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="event.preventDefault();this.classList.remove('over');addArquivos(event.dataTransfer.files)">
      <div class="empty" style="padding:0"><div class="ic">${ic('up', 26)}</div><b>Arraste arquivos ou escolha abaixo</b><p class="mu" style="margin:4px 0 14px">PNG, JPG ou PDF · até 8 arquivos</p></div>
      <div class="row wrap" style="justify-content:center">
        <label class="btn pr">${ic('cam')} Tirar foto<input type="file" accept="image/*" capture="environment" hidden onchange="addArquivos(this.files);this.value=''"></label>
        <label class="btn">${ic('file')} Escolher arquivos<input type="file" accept="image/*,application/pdf" multiple hidden onchange="addArquivos(this.files);this.value=''"></label>
        <button class="btn ghost" onclick="colarSheet()">${ic('clip')} Colar texto</button>
      </div>
      ${UP.arquivos.length ? `<div class="thumbs" style="justify-content:center">${UP.arquivos.map((a, i) => `<div class="th">${a.preview ? `<img src="${a.preview}" alt="">` : `<div>${ic('file')}<br>${esc(a.name.slice(0, 18))}</div>`}<button aria-label="Remover" onclick="UP.arquivos.splice(${i},1);render()">✕</button></div>`).join('')}</div>` : ''}
    </div>
    ${UP.erro ? `<div class="card flat" style="border-color:var(--bad)"><div class="row" style="color:var(--bad)">${ic('alert')}<span class="sm">${esc(UP.erro)}</span></div></div>` : ''}
    <button class="btn pr block" ${UP.arquivos.length ? '' : 'disabled'} onclick="processar()">${ic('spark')} Analisar ${UP.arquivos.length || ''} arquivo(s)</button>
    <div class="card flat"><h3 style="margin-bottom:6px">Dicas</h3><ul class="mu" style="margin:0;padding-left:18px">
      <li>Plano de ensino: o PDF do CAGR funciona melhor que foto.</li><li>Notas: print da tela de notas do Moodle.</li><li>Calendário: print do cronograma da disciplina ou do calendário acadêmico.</li><li>Nada é alterado sem a sua confirmação.</li></ul></div></div>`;
};
async function addArquivos(files) {
  UP.erro = '';
  for (const f of [...files].slice(0, 8 - UP.arquivos.length)) {
    try {
      if (f.type === 'application/pdf') {
        if (f.size > 3.3e6) { UP.erro = `${f.name} é grande demais (máx. ~3 MB). Envie só as páginas necessárias.`; continue; }
        UP.arquivos.push({ name: f.name, mediaType: f.type, file: f, data: await b64(f) });
      } else if (f.type.startsWith('image/')) {
        const { data, preview } = await comprimir(f);
        UP.arquivos.push({ name: f.name, mediaType: 'image/jpeg', data, preview });
      } else UP.erro = `${f.name}: formato não suportado.`;
    } catch { UP.erro = `Não foi possível abrir ${f.name}.`; }
  }
  render();
}
const b64 = f => new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.onerror = err; r.readAsDataURL(f); });
async function comprimir(f) {
  const img = await createImageBitmap(f), k = Math.min(1, 1800 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', .85);
  return { data: url.split(',')[1], preview: url };
}
function colarSheet() {
  sheet(`<h2>Colar texto</h2><p class="mu" style="margin:6px 0 12px">Copie o texto do plano de ensino, do Moodle ou do CAGR e cole aqui.</p><textarea id="cola" style="min-height:220px"></textarea>
  <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" onclick="addTexto()">Adicionar</button></div>`);
}
function addTexto() { const t = $('#cola').value.trim(); if (!t) return; UP.arquivos.push({ name: 'Texto colado', mediaType: 'text/plain', data: t }); closeSheet(); render(); }
async function processar() {
  UP.erro = ''; UP.fase = 'processando'; render();
  try {
    let res;
    if (cfg.aiEnabled && user) {
      const { data: { session } } = await sb.auth.getSession();
      const etapas = ['Enviando arquivos…', 'Identificando disciplinas…', 'Lendo datas e notas…', 'Quase lá…']; let i = 0;
      const t = setInterval(() => { const el = $('#up-etapa'); if (el) el.textContent = etapas[Math.min(++i, etapas.length - 1)]; }, 6000);
      const r = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ tipo: UP.tipo, arquivos: UP.arquivos.map(({ mediaType, data, name }) => ({ mediaType, data, name })), contexto: { ano: (S.semestre.inicio || hoje()).slice(0, 4), disciplinas: S.materias.map(m => ({ codigo: m.codigo, nome: m.nome, avaliacoes: m.avaliacoes.map(a => a.nome) })) } }),
      }).finally(() => clearInterval(t));
      res = await r.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
      if (r.status === 402) { UP.fase = 'enviar'; render(); exigirPremium(res.error); return; }
      if (!r.ok) throw new Error(res.error || 'Falha ao processar.');
      if (res._usos) { PLANO.ia = res._usos; }
    } else {
      res = { resumo: '', semestre: { inicio: '', fim: '' }, feriados: [], disciplinas: [], eventos: [], historico: [] };
      for (const a of UP.arquivos) {
        if (a.mediaType.startsWith('image/')) throw new Error('Ler prints precisa de login com a IA ativa. Entre com sua conta ou envie o PDF/texto.');
        const txt = a.mediaType === 'text/plain' ? a.data : await pdfText(a.file);
        const m = parsePlano(txt);
        res.disciplinas.push({ ...m, topicos: m.topicos.map(t => t.texto), faltas: [] });
      }
      res.resumo = `Leitura local de ${res.disciplinas.length} plano(s) de ensino.`;
    }
    UP.resumo = res.resumo || ''; UP.mudancas = montarMudancas(res); UP.fase = 'revisar';
  } catch (e) { UP.fase = 'enviar'; UP.erro = e.message; }
  render();
}

// --- cálculo das diferenças entre o que foi lido e o que já existe ---
function acharMat(d) {
  const c = norm(d.codigo), n = norm(d.nome);
  return S.materias.find(m => (c && norm(m.codigo) === c) || (n && norm(m.nome) === n));
}
const mid = cod => (S.materias.find(m => cod && norm(m.codigo) === norm(cod)) || {}).id || '';
const okHor = h => DIAS[h.dia] && SLOTS.includes(h.inicio);
const okData = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
function montarMudancas(r) {
  const out = [], add = (grupo, titulo, detalhe, apply) => out.push({ id: uid(), grupo, titulo, detalhe, apply, on: true });
  if (okData(r.semestre?.inicio) && r.semestre.inicio !== S.semestre.inicio) add('Semestre', 'Início das aulas', `${brD(S.semestre.inicio) || '—'} → ${brD(r.semestre.inicio)}`, () => S.semestre.inicio = r.semestre.inicio);
  if (okData(r.semestre?.fim) && r.semestre.fim !== S.semestre.fim) add('Semestre', 'Fim das aulas', `${brD(S.semestre.fim) || '—'} → ${brD(r.semestre.fim)}`, () => S.semestre.fim = r.semestre.fim);
  const ferAdd = (data, desc) => { if (!S.feriados.some(x => x.data === data) && !out.some(o => o.grupo === 'Feriados' && o._d === data)) { add('Feriados', desc || 'Feriado', brDL(data), () => S.feriados.push({ data, descricao: desc })); out[out.length - 1]._d = data; } };
  (r.feriados || []).filter(f => okData(f.data)).forEach(f => ferAdd(f.data, f.descricao));

  for (const d of r.disciplinas || []) {
    const hor = (d.horarios || []).filter(okHor).map(h => ({ dia: String(h.dia), inicio: h.inicio, aulas: String(+h.aulas || 2), sala: h.sala || '' }));
    const ex = acharMat(d), nome = d.nome || d.codigo || 'Disciplina';
    if (!ex) {
      add('Nova disciplina', `${d.codigo ? d.codigo + ' · ' : ''}${nome}`, [hor.length && `${hor.length} horário(s)`, d.avaliacoes?.length && `${d.avaliacoes.length} avaliação(ões)`, d.topicos?.length && `${d.topicos.length} conteúdo(s)`].filter(Boolean).join(' · ') || 'Dados básicos', () => {
        S.materias.push(migrar({ materias: [{
          id: uid(), codigo: (d.codigo || '').toUpperCase(), nome: d.nome || '', professor: d.professor || '', turma: d.turma || '', cargaHoraria: d.cargaHoraria || '', cor: CORES[S.materias.length % CORES.length], horarios: hor, rec: '',
          avaliacoes: (d.avaliacoes || []).map(a => ({ id: uid(), nome: a.nome, peso: a.peso || '', data: okData(a.data) ? a.data : '', nota: a.nota || '' })),
          topicos: (d.topicos || []).map(t => ({ id: uid(), texto: t, feito: false })),
          faltas: Object.fromEntries((d.faltas || []).filter(f => okData(f.data) && +f.quantidade).map(f => [f.data, +f.quantidade])),
        }] }).materias[0]);
      });
      continue;
    }
    const g = nomeM(ex);
    for (const [k, l] of [['nome', 'Nome'], ['professor', 'Professor(a)'], ['turma', 'Turma'], ['cargaHoraria', 'Carga horária']])
      if (d[k] && String(d[k]) !== String(ex[k] || '')) add(g, l, `${ex[k] || '—'} → ${d[k]}`, () => ex[k] = d[k]);
    const fmtH = hs => hs.map(h => `${DIAS[h.dia]} ${hhmm(h.inicio)}${h.sala ? ' (' + h.sala + ')' : ''}`).join(', ');
    if (hor.length && fmtH(hor) !== fmtH(ex.horarios)) add(g, 'Horários', `${fmtH(ex.horarios) || '—'} → ${fmtH(hor)}`, () => ex.horarios = hor);
    for (const a of d.avaliacoes || []) {
      const ea = ex.avaliacoes.find(x => mesmaAv(x, a));
      if (!ea) { add(g, `Nova avaliação: ${a.nome}`, [a.peso && `peso ${a.peso}%`, okData(a.data) && brD(a.data), a.nota && `nota ${a.nota}`].filter(Boolean).join(' · ') || '—', () => ex.avaliacoes.push({ id: uid(), nome: a.nome, peso: a.peso || '', data: okData(a.data) ? a.data : '', nota: a.nota || '' })); continue; }
      const ch = [];
      if (a.nota && num(a.nota) !== num(ea.nota)) ch.push(['nota', a.nota, `nota ${ea.nota || '—'} → ${a.nota}`]);
      if (okData(a.data) && a.data !== ea.data) ch.push(['data', a.data, `data ${brD(ea.data) || '—'} → ${brD(a.data)}`]);
      if (a.peso && num(a.peso) !== num(ea.peso)) ch.push(['peso', a.peso, `peso ${ea.peso || '—'} → ${a.peso}%`]);
      if (ch.length) add(g, ea.nome, ch.map(c => c[2]).join(' · '), () => ch.forEach(([k, v]) => ea[k] = v));
    }
    const novos = (d.topicos || []).filter(t => !ex.topicos.some(x => norm(x.texto) === norm(t)));
    if (novos.length) add(g, `+${novos.length} conteúdo(s) para estudar`, novos.slice(0, 3).join('; ') + (novos.length > 3 ? '…' : ''), () => novos.forEach(t => ex.topicos.push({ id: uid(), texto: t, feito: false })));
    const fl = (d.faltas || []).filter(f => okData(f.data) && (+f.quantidade || 0) !== (ex.faltas[f.data] || 0));
    if (fl.length) add(g, `${fl.length} registro(s) de falta`, fl.map(f => `${brD(f.data)}: ${f.quantidade}`).join(', '), () => fl.forEach(f => { if (+f.quantidade) ex.faltas[f.data] = +f.quantidade; else delete ex.faltas[f.data]; }));
  }
  for (const e of r.eventos || []) {
    if (!okData(e.data) || e.tipo === 'aula') continue;
    if (e.tipo === 'feriado') { ferAdd(e.data, e.titulo); continue; }
    const dLida = (r.disciplinas || []).filter(d => !e.codigo || norm(d.codigo) === norm(e.codigo));
    const ehAv = dLida.some(d => (d.avaliacoes || []).some(a => a.data === e.data && (e.tipo === 'prova' || mesmaAv(a, { nome: e.titulo }))))
      || S.materias.filter(m => !e.codigo || norm(m.codigo) === norm(e.codigo)).some(m => m.avaliacoes.some(a => a.data === e.data && (e.tipo === 'prova' || mesmaAv(a, { nome: e.titulo }))));
    const dup = ehAv || todosEventos().some(x => x.data === e.data && norm(x.titulo) === norm(e.titulo)) || out.some(o => o.grupo === 'Agenda' && norm(o.titulo) === norm(e.titulo) && o._d === e.data);
    if (!dup) { add('Agenda', e.titulo, `${brDL(e.data)}${e.codigo ? ' · ' + e.codigo : ''}`, () => S.eventos.push({ id: uid(), data: e.data, titulo: e.titulo, tipo: TIPOS_EV[e.tipo] ? e.tipo : 'outro', materiaId: mid(e.codigo) })); out[out.length - 1]._d = e.data; }
  }
  // currículo: curso, universidade e regras de horas complementares
  const c = r.curso || {};
  if (c.nome && norm(c.nome) !== norm(S.perfil.curso)) add('Seu curso', 'Curso', `${S.perfil.curso || '—'} → ${c.nome}`, () => S.perfil.curso = c.nome);
  if (c.universidade && norm(c.universidade) !== norm(S.perfil.universidade)) add('Seu curso', 'Universidade', `${S.perfil.universidade || '—'} → ${c.universidade}`, () => S.perfil.universidade = c.universidade);
  if (num(c.horasComplementares) && String(num(c.horasComplementares)) !== String(S.horas.exigidas)) add('Horas complementares', 'Total exigido', `${S.horas.exigidas ? S.horas.exigidas + 'h' : '—'} → ${num(c.horasComplementares)}h`, () => S.horas.exigidas = String(num(c.horasComplementares)));
  const catsNovas = (c.categoriasHoras || []).filter(x => x.nome && !S.horas.categorias.some(y => norm(y.nome) === norm(x.nome)));
  if (catsNovas.length) add('Horas complementares', `${catsNovas.length} categoria(s) de atividades`, catsNovas.map(x => x.nome + (num(x.limiteHoras) ? ` (máx. ${num(x.limiteHoras)}h)` : '')).join('; '), () => catsNovas.forEach(x => S.horas.categorias.push({ id: uid(), nome: x.nome, limite: String(num(x.limiteHoras) ?? '') })));
  for (const h of r.historico || []) {
    const ex = h.codigo && S.historico.find(x => norm(x.codigo) === norm(h.codigo) && x.semestre === h.semestre);
    if (!ex) add('Histórico', `${h.codigo ? h.codigo + ' · ' : ''}${h.nome}`, [h.semestre, h.nota && `nota ${h.nota}`, h.situacao].filter(Boolean).join(' · '), () => S.historico.push({ id: uid(), ...h }));
    else if ((h.nota && num(h.nota) !== num(ex.nota)) || (h.situacao && h.situacao !== ex.situacao)) add('Histórico', ex.nome || ex.codigo, `${ex.nota || '—'} → ${h.nota || ex.nota} ${h.situacao || ''}`, () => Object.assign(ex, { nota: h.nota || ex.nota, situacao: h.situacao || ex.situacao }));
  }
  return out;
}
function revisarView() {
  const ms = UP.mudancas, grupos = [...new Set(ms.map(m => m.grupo))], n = ms.filter(m => m.on).length;
  if (!ms.length) return `<div class="stack">${vazio('check', 'Tudo já está atualizado', esc(UP.resumo) || 'Não encontramos nada novo nesses arquivos.', `<button class="btn pr" onclick="resetUP()">Enviar outros</button>`)}</div>`;
  return `<div class="stack"><div><h1>Revisar mudanças</h1><p class="mu" style="margin-top:4px">${esc(UP.resumo)} Desmarque o que não quiser aplicar — dá para editar tudo depois pelo ✏️.</p></div>
    ${grupos.map((g, gi) => `<div class="card"><div class="between" style="margin-bottom:4px"><h3>${esc(g)}</h3><button class="btn ghost sm" onclick="marcarGrupo(${gi})">Alternar</button></div>${ms.filter(m => m.grupo === g).map(m => `<label class="chg"><input type="checkbox" ${m.on ? 'checked' : ''} onchange="UP.mudancas.find(x=>x.id==='${m.id}').on=this.checked;render()"><div class="sp"><b class="sm">${esc(m.titulo)}</b><div class="mu">${esc(m.detalhe)}</div></div></label>`).join('')}</div>`).join('')}
    <div class="row" style="position:sticky;bottom:calc(var(--nav-h) + 12px)"><button class="btn" onclick="resetUP()">Descartar</button><button class="btn pr sp" ${n ? '' : 'disabled'} onclick="aplicar()">${ic('check')} Aplicar ${n} mudança(s)</button></div></div>`;
}
function marcarGrupo(gi) { const g = [...new Set(UP.mudancas.map(m => m.grupo))][gi]; const ms = UP.mudancas.filter(m => m.grupo === g), v = !ms.every(m => m.on); ms.forEach(m => m.on = v); render(); }
function aplicar() {
  const backup = JSON.stringify(S), ms = UP.mudancas.filter(m => m.on);
  const novas = ms.filter(m => m.grupo === 'Nova disciplina');
  if (!premium() && S.materias.length + novas.length > LIMITE_DISC) { exigirPremium(`O plano grátis permite até ${LIMITE_DISC} disciplinas. Desmarque algumas ou assine o Premium.`); return; }
  novas.forEach(m => m.apply());
  ms.filter(m => m.grupo !== 'Nova disciplina').forEach(m => m.apply());
  S.materias.forEach(m => { m.avaliacoes = juntarDuplicadas(m.avaliacoes); }); S.eventos = limparEventos(S);
  save(); resetUP(false);
  toast(`${ms.length} mudança(s) aplicada(s).`, () => { S = migrar(JSON.parse(backup)); save(); render(); });
  go(ms.some(m => m.grupo === 'Histórico') && !ms.some(m => m.grupo === 'Nova disciplina') ? 'historico' : 'inicio');
}
function resetUP(r = true) { UP = { tipo: UP.tipo, arquivos: [], fase: 'enviar', mudancas: [], resumo: '', erro: '' }; if (r) render(); }

// ================= Ações rápidas =================
function upd(fn) { fn(); save(); render(); }
function toggleFalta(id, d) {
  const m = byId(id), dia = diasDeAula(m).find(x => x.data === d);
  const aulas = dia ? dia.aulas : m.horarios.filter(h => +h.dia - 1 === parseISO(d).getDay()).reduce((a, h) => a + (+h.aulas || 0), 0) || 1;
  const antes = m.faltas[d];
  vibrar(antes ? 8 : [10, 40, 10]);
  upd(() => { if (antes) delete m.faltas[d]; else m.faltas[d] = aulas; });
  if (!antes) { const f = freq(m); toast(f.restam >= 0 ? `Falta registrada. Restam ${f.restam}.` : 'Falta registrada — limite ultrapassado!', () => upd(() => delete m.faltas[d])); }
}
function setFalta(id, d, v) { upd(() => { const m = byId(id); if (+v) m.faltas[d] = +v; else delete m.faltas[d]; }); }
function cancelarAula(id, d) { const m = byId(id), f = m.faltas[d]; upd(() => { m.canceladas.push(d); delete m.faltas[d]; }); toast('Aula marcada como cancelada.', () => upd(() => { m.canceladas = m.canceladas.filter(x => x !== d); if (f) m.faltas[d] = f; })); }

// ================= Sheets de edição (✏️) =================
function sheet(html) { $('#layer').innerHTML = `<div class="scrim" onclick="if(event.target===this)closeSheet()"><div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}</div></div>`; setTimeout(() => $('.sheet input:not([type=checkbox]):not([type=file]),.sheet textarea')?.focus(), 50); }
function closeSheet() { $('#layer').innerHTML = ''; }
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
const val = id => ($('#' + id)?.value ?? '').trim();
const acoes = (salvar, excluir) => `<div class="actions">${excluir ? `<button class="btn danger" onclick="${excluir}" aria-label="Excluir">${ic('trash', 18)}</button>` : ''}<button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" onclick="${salvar}">Salvar</button></div>`;
function excluirComDesfazer(msg, fn) { const b = JSON.stringify(S); closeSheet(); upd(fn); toast(msg, () => { S = migrar(JSON.parse(b)); save(); render(); }); }

let draftH = [];
function discSheet(id) {
  if (!id && S.materias.length >= LIMITE_DISC && !exigirPremium(`O plano grátis permite até ${LIMITE_DISC} disciplinas.`)) return;
  const m = id ? byId(id) : { codigo: '', nome: '', professor: '', turma: '', cargaHoraria: '', cor: CORES[S.materias.length % CORES.length], horarios: [] };
  draftH = structuredClone(m.horarios);
  sheet(`<h2>${id ? 'Editar disciplina' : 'Nova disciplina'}</h2><div class="fields" style="margin-top:14px">
    <div class="fields c2"><label class="f">Código<input id="d-codigo" value="${esc(m.codigo)}" placeholder="INE5408"></label><label class="f">Turma<input id="d-turma" value="${esc(m.turma)}"></label></div>
    <label class="f">Nome<input id="d-nome" value="${esc(m.nome)}"></label>
    <label class="f">Professor(a)<input id="d-professor" value="${esc(m.professor)}"></label>
    <div class="fields c2"><label class="f">Carga horária (h/a)<input id="d-ch" inputmode="numeric" value="${esc(m.cargaHoraria)}" placeholder="automática"></label><label class="f">Cor<input id="d-cor" type="color" value="${m.cor}" style="padding:4px"></label></div>
    <div><div class="between"><b>Horários</b><button class="btn ghost sm" onclick="draftH.push({dia:'2',inicio:'0820',aulas:'2',sala:''});horRender()">${ic('plus', 16)} Horário</button></div><div id="hor"></div></div>
  </div>${acoes(`salvarDisc('${id || ''}')`, id ? `excluirComDesfazer('Disciplina excluída.',()=>S.materias=S.materias.filter(x=>x.id!=='${id}'));go('disciplinas')` : '')}`);
  horRender();
}
function horRender() {
  $('#hor').innerHTML = draftH.map((h, i) => `<div class="row" style="margin-top:8px">
    <select aria-label="Dia" onchange="draftH[${i}].dia=this.value">${Object.entries(DIAS_L).map(([k, v]) => `<option value="${k}" ${k == h.dia ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select aria-label="Início" onchange="draftH[${i}].inicio=this.value">${SLOTS.map(s => `<option value="${s}" ${s === h.inicio ? 'selected' : ''}>${hhmm(s)}</option>`).join('')}</select>
    <input aria-label="Nº de aulas" style="width:56px" inputmode="numeric" value="${esc(h.aulas)}" onchange="draftH[${i}].aulas=this.value">
    <input aria-label="Sala" placeholder="Sala" style="width:90px" value="${esc(h.sala)}" onchange="draftH[${i}].sala=this.value">
    <button class="ib" aria-label="Remover horário" onclick="draftH.splice(${i},1);horRender()">${ic('x', 18)}</button></div>`).join('') || '<p class="mu">Nenhum horário.</p>';
}
function salvarDisc(id) {
  const d = { codigo: val('d-codigo').toUpperCase(), nome: val('d-nome'), professor: val('d-professor'), turma: val('d-turma'), cargaHoraria: val('d-ch'), cor: val('d-cor'), horarios: draftH };
  if (!d.nome && !d.codigo) return toast('Informe o nome ou o código.');
  closeSheet();
  if (id) upd(() => Object.assign(byId(id), d));
  else { const m = migrar({ materias: [{ id: uid(), ...d, rec: '' }] }).materias[0]; upd(() => S.materias.push(m)); go('disc/' + m.id); }
}
function avSheet(mid_, aid) {
  const m = byId(mid_), a = aid ? m.avaliacoes.find(x => x.id === aid) : { nome: '', peso: '', data: '', nota: '' };
  sheet(`<h2>${aid ? 'Editar avaliação' : 'Nova avaliação'}</h2><p class="mu">${esc(nomeM(m))}</p><div class="fields" style="margin-top:14px">
    <label class="f">Nome<input id="a-n" value="${esc(a.nome)}" placeholder="Prova 1"></label>
    <div class="fields c2"><label class="f">Peso (%)<input id="a-p" inputmode="decimal" value="${esc(a.peso)}" placeholder="igual"></label><label class="f">Nota<input id="a-o" inputmode="decimal" value="${esc(a.nota)}" placeholder="0 a 10"></label></div>
    <label class="f">Data<input id="a-d" type="date" value="${esc(a.data)}"></label></div>
    ${acoes(`salvarAv('${mid_}','${aid || ''}')`, aid ? `excluirComDesfazer('Avaliação excluída.',()=>{const m=byId('${mid_}');m.avaliacoes=m.avaliacoes.filter(x=>x.id!=='${aid}')})` : '')}`);
}
function salvarAv(mid_, aid) {
  const d = { nome: val('a-n') || 'Avaliação', peso: val('a-p').replace(',', '.'), nota: val('a-o').replace(',', '.'), data: val('a-d') };
  if (d.nota && (num(d.nota) == null || num(d.nota) < 0 || num(d.nota) > 10)) return toast('A nota deve estar entre 0 e 10.');
  closeSheet(); const m = byId(mid_);
  upd(() => aid ? Object.assign(m.avaliacoes.find(x => x.id === aid), d) : m.avaliacoes.push({ id: uid(), ...d }));
}
function topicoSheet(mid_, tid) {
  const t = byId(mid_).topicos.find(x => x.id === tid);
  sheet(`<h2>Editar conteúdo</h2><div class="fields" style="margin-top:14px"><label class="f">Conteúdo<textarea id="t-x" style="min-height:80px">${esc(t.texto)}</textarea></label></div>
    ${acoes(`salvarTop('${mid_}','${tid}')`, `excluirComDesfazer('Conteúdo removido.',()=>{const m=byId('${mid_}');m.topicos=m.topicos.filter(x=>x.id!=='${tid}')})`)}`);
}
function salvarTop(mid_, tid) { const v = val('t-x'); if (!v) return; closeSheet(); upd(() => byId(mid_).topicos.find(x => x.id === tid).texto = v); }
function eventoSheet(id, data) {
  const e = id ? S.eventos.find(x => x.id === id) : { titulo: '', data: data || hoje(), tipo: 'prova', materiaId: '' };
  sheet(`<h2>${id ? 'Editar evento' : 'Novo evento'}</h2><div class="fields" style="margin-top:14px">
    <label class="f">Título<input id="e-t" value="${esc(e.titulo)}" placeholder="Entrega do trabalho"></label>
    <div class="fields c2"><label class="f">Data<input id="e-d" type="date" value="${esc(e.data)}"></label><label class="f">Tipo<select id="e-y">${Object.entries(TIPOS_EV).filter(([k]) => k !== 'feriado').map(([k, v]) => `<option value="${k}" ${k === e.tipo ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <label class="f">Disciplina<select id="e-m"><option value="">Nenhuma</option>${S.materias.map(m => `<option value="${m.id}" ${m.id === e.materiaId ? 'selected' : ''}>${esc(nomeM(m))}</option>`).join('')}</select></label></div>
    ${acoes(`salvarEv('${id || ''}')`, id ? `excluirComDesfazer('Evento excluído.',()=>S.eventos=S.eventos.filter(x=>x.id!=='${id}'))` : '')}`);
}
function salvarEv(id) {
  const d = { titulo: val('e-t'), data: val('e-d'), tipo: val('e-y'), materiaId: val('e-m') };
  if (!d.titulo || !d.data) return toast('Preencha título e data.');
  closeSheet(); upd(() => id ? Object.assign(S.eventos.find(x => x.id === id), d) : S.eventos.push({ id: uid(), ...d }));
}
function histSheet(id) {
  const h = id ? S.historico.find(x => x.id === id) : { codigo: '', nome: '', semestre: '', nota: '', creditos: '', situacao: 'Aprovado' };
  const sits = ['Aprovado', 'Reprovado', 'Reprovado por frequência (FI)', 'Cursando', 'Validada', 'Trancada'];
  sheet(`<h2>${id ? 'Editar disciplina cursada' : 'Adicionar ao histórico'}</h2><div class="fields" style="margin-top:14px">
    <div class="fields c2"><label class="f">Código<input id="h-c" value="${esc(h.codigo)}"></label><label class="f">Semestre<input id="h-s" value="${esc(h.semestre)}" placeholder="2025.2"></label></div>
    <label class="f">Nome<input id="h-n" value="${esc(h.nome)}"></label>
    <div class="fields c2"><label class="f">Nota<input id="h-o" inputmode="decimal" value="${esc(h.nota)}"></label><label class="f">Créditos<input id="h-r" inputmode="numeric" value="${esc(h.creditos)}"></label></div>
    <label class="f">Situação<select id="h-x">${(sits.includes(h.situacao) || !h.situacao ? sits : [h.situacao, ...sits]).map(s => `<option ${s === h.situacao ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label></div>
    ${acoes(`salvarHist('${id || ''}')`, id ? `excluirComDesfazer('Removido do histórico.',()=>S.historico=S.historico.filter(x=>x.id!=='${id}'))` : '')}`);
}
function salvarHist(id) {
  const d = { codigo: val('h-c').toUpperCase(), semestre: val('h-s'), nome: val('h-n'), nota: val('h-o').replace(',', '.'), creditos: val('h-r'), situacao: val('h-x') };
  if (!d.nome && !d.codigo) return toast('Informe o nome ou código.');
  closeSheet(); upd(() => id ? Object.assign(S.historico.find(x => x.id === id), d) : S.historico.push({ id: uid(), ...d }));
}
function configSheet() { closeSheet(); go('config'); }
function exportar() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' })); a.download = 'meu-semestre-backup.json'; a.click(); }
async function importar(inp) { try { const d = JSON.parse(await inp.files[0].text()); if (!d.materias) throw 0; const b = JSON.stringify(S); S = migrar(d); save(); closeSheet(); render(); toast('Backup importado.', () => { S = migrar(JSON.parse(b)); save(); render(); }); } catch { toast('Arquivo inválido.'); } }
function apagarTudo() {
  sheet(`<h2>Apagar todos os dados?</h2><p class="mu" style="margin-top:8px">Disciplinas, faltas, notas, agenda e histórico serão apagados${user ? ' da sua conta e deste aparelho' : ' deste aparelho'}. Isso não pode ser desfeito. Considere exportar um backup antes.</p>
  <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" style="background:var(--bad);border-color:var(--bad)" onclick="closeSheet();S=novoEstado();save();go('inicio');render()">Apagar tudo</button></div>`);
}

// ================= Toast =================
let toastT;
function toast(msg, desfazer) {
  clearTimeout(toastT); document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${desfazer ? '<button>Desfazer</button>' : ''}`;
  if (desfazer) el.querySelector('button').onclick = () => { el.remove(); desfazer(); };
  document.body.append(el); toastT = setTimeout(() => el.remove(), desfazer ? 6000 : 3500);
}

// ================= Sensação de app nativo =================
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function vibrar(p = 10) { try { navigator.vibrate?.(p); } catch { } }

// cabeçalho mostra o título da tela ao rolar
addEventListener('scroll', () => $('#top')?.classList.toggle('scrolled', scrollY > 40), { passive: true });
// tocar de novo na aba ativa volta ao topo
document.addEventListener('click', e => { const a = e.target.closest('nav.bn a'); if (a && a.classList.contains('on')) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); } });

// gestos: arrastar para atualizar, deslizar da borda para voltar, arrastar sheet para fechar
(() => {
  let y0 = 0, x0 = 0, modo = null, dy = 0, ptr;
  addEventListener('touchstart', e => {
    const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dy = 0; modo = null;
    if (e.target.closest('#grade')) return; // arrastar na grade de cores não fecha o painel
    const sh = e.target.closest('.sheet');
    if (sh) { if (sh.scrollTop <= 0) modo = 'sheet'; return; }
    if (!document.body.classList.contains('app') || $('.scrim')) return;
    if (x0 < 24 && R.v === 'disc') modo = 'voltar';
    else if (scrollY <= 0 && user) modo = 'ptr';
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (!modo) return;
    const t = e.touches[0]; dy = t.clientY - y0; const dx = t.clientX - x0;
    if (modo === 'sheet') { const sh = $('.sheet'); if (dy > 0 && sh) { sh.classList.add('drag'); sh.style.transform = `translateY(${dy}px)`; } }
    if (modo === 'ptr' && dy > 0) {
      ptr ||= Object.assign(document.body.appendChild(document.createElement('div')), { className: 'ptr', innerHTML: ic('hist', 20) });
      const p = Math.min(dy, 120); ptr.style.transform = `translateY(${p - 60}px) rotate(${p * 3}deg)`; ptr.style.opacity = Math.min(1, p / 70);
    }
    if (modo === 'voltar') $('#view').style.transform = `translateX(${Math.max(0, dx)}px)`;
  }, { passive: true });
  addEventListener('touchend', async e => {
    const dx = (e.changedTouches[0]?.clientX || x0) - x0;
    if (modo === 'sheet') { const sh = $('.sheet'); if (sh) { sh.classList.remove('drag'); if (dy > 110) closeSheet(); else sh.style.transform = ''; } }
    if (modo === 'voltar') { $('#view').style.transform = ''; if (dx > 90) { vibrar(8); history.length > 1 ? history.back() : go('disciplinas'); } }
    if (modo === 'ptr' && ptr) {
      if (dy > 80) { ptr.classList.add('on'); ptr.style.transform = 'translateY(10px)'; vibrar(10); await sincronizar(); }
      ptr.remove(); ptr = null;
    }
    modo = null;
  });
})();
async function sincronizar() {
  if (!sb || !user) return;
  setSync('busy');
  const { data, error } = await sb.from('user_data').select('data').eq('user_id', user.id).maybeSingle();
  if (error) { setSync('off'); return toast('Sem conexão.'); }
  if (data?.data) { S = migrar(data.data); saveLocal(); }
  setSync('ok'); render(); toast('Atualizado.');
}

// ================= Instalação =================
let promptInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; if (R.v === 'inicio') render(); });
addEventListener('appinstalled', () => { promptInstalar = null; toast('App instalado! 🎉'); render(); });
function cardInstalar() {
  if (standalone() || localStorage.getItem(KEY + ':sem-instalar')) return '';
  if (!promptInstalar && !isIOS() && !/android/i.test(navigator.userAgent)) return '';
  return `<div class="card install"><img src="icons/icon-192.png" alt=""><div class="sp"><b>Instale o Meu Semestre</b><div class="mu">Abre em tela cheia, funciona offline e recebe lembretes.</div></div>
    <div class="row"><button class="ib" aria-label="Dispensar" onclick="try{localStorage.setItem(KEY+':sem-instalar',1)}catch{};render()">${ic('x', 18)}</button><button class="btn pr sm" onclick="instalar()">Instalar</button></div></div>`;
}
async function instalar() {
  if (promptInstalar) { promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; render(); return; }
  if (/android/i.test(navigator.userAgent)) return sheet(`<h2>Instalar no Android</h2><p class="mu" style="margin-top:6px">No <b>Chrome</b>:</p>
    <ol class="ios-steps"><li><span>Toque no menu <b>⋮</b> no canto superior direito</span></li><li><span>Toque em <b>Instalar app</b> (não use "Adicionar à tela inicial", que cria só um atalho de site)</span></li><li><span>Confirme em <b>Instalar</b>. O app abre em tela cheia, sem barra do navegador</span></li></ol>
    <p class="mu" style="margin-top:12px">Se você já tinha um ícone antigo, apague-o antes. Ele aponta para o endereço antigo e abre como site.</p>
    <div class="actions"><button class="btn pr block" onclick="closeSheet()">Entendi</button></div>`);
  sheet(`<h2>Instalar no iPhone</h2><p class="mu" style="margin-top:6px">Abra este site no <b>Safari</b> e siga:</p>
    <ol class="ios-steps"><li><span>Toque em <b>Compartilhar</b> (quadrado com seta ↑) na barra do Safari</span></li><li><span>Role e toque em <b>Adicionar à Tela de Início</b></span></li><li><span>Toque em <b>Adicionar</b>. O ícone aparece na sua tela inicial</span></li></ol>
    <p class="mu" style="margin-top:12px">Se você já tinha adicionado antes, remova o ícone antigo e adicione de novo para atualizar o ícone.</p>
    <div class="actions"><button class="btn pr block" onclick="closeSheet()">Entendi</button></div>`);
}

// ================= Notificações (Web Push) =================
const b64ToU8 = b => { const p = '='.repeat((4 - b.length % 4) % 4), r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
async function alternarNotif(on) {
  if (on && !exigirPremium('Lembretes diários fazem parte do Premium.')) { const c = $('#c-notif'); if (c) c.checked = false; return; }
  const reverter = () => { const c = $('#c-notif'); if (c) c.checked = !on; };
  if (!user) { reverter(); return toast('Entre com sua conta para receber lembretes.'); }
  if (!cfg.vapidPublicKey) { reverter(); return toast('Lembretes ainda não configurados no servidor.'); }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    reverter();
    return isIOS() && !standalone() ? instalar().then(() => toast('No iPhone, instale o app para ativar lembretes.')) : toast('Este navegador não suporta notificações.');
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (on) {
      if (await Notification.requestPermission() !== 'granted') { reverter(); return toast('Permissão negada. Libere nas configurações do aparelho.'); }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.vapidPublicKey) });
      const { error } = await sb.from('push_subscriptions').upsert({ user_id: user.id, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: 'endpoint' });
      if (error) throw error;
      toast('Pronto! Você recebe o resumo todo dia às 7h.');
    } else {
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
      toast('Lembretes desativados.');
    }
    S.perfil.notif = on; save(); vibrar(10);
  } catch (e) { reverter(); toast('Não foi possível ativar: ' + (e.message || e)); }
}

// ================= Google Agenda (.ics) =================
function exportarAgenda() {
  if (!exigirPremium('Exportar para o Google Agenda faz parte do Premium.')) return;
  if (!S.materias.length) return toast('Cadastre disciplinas primeiro.');
  const tz = 'America/Sao_Paulo', z = s => s.replace(/-/g, ''), escI = t => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ev = [];
  const add = (id, campos) => ev.push(['BEGIN:VEVENT', `UID:${id}@meusemestre`, `DTSTAMP:${stamp}`, ...campos, 'END:VEVENT'].join('\r\n'));
  const diaSeg = d => { const x = parseISO(d); x.setDate(x.getDate() + 1); return iso(x); };
  for (const m of S.materias) {
    for (const d of diasDeAula(m)) for (const h of m.horarios.filter(h => +h.dia - 1 === parseISO(d.data).getDay())) {
      add(`${m.id}-${d.data}-${h.inicio}`, [`DTSTART;TZID=${tz}:${z(d.data)}T${h.inicio}00`, `DTEND;TZID=${tz}:${z(d.data)}T${fimAula(h.inicio, h.aulas).replace(':', '')}00`, `SUMMARY:${escI((m.codigo ? m.codigo + ' · ' : '') + nomeM(m))}`, h.sala ? `LOCATION:${escI(h.sala)}` : '', m.professor ? `DESCRIPTION:${escI('Prof. ' + m.professor)}` : ''].filter(Boolean));
    }
    for (const a of m.avaliacoes.filter(a => a.data)) add(`av-${m.id}-${a.id}`, [`DTSTART;VALUE=DATE:${z(a.data)}`, `DTEND;VALUE=DATE:${z(diaSeg(a.data))}`, `SUMMARY:${escI('📝 ' + a.nome + ' · ' + nomeM(m))}`, 'BEGIN:VALARM', 'TRIGGER:-PT15H', 'ACTION:DISPLAY', `DESCRIPTION:${escI(a.nome)}`, 'END:VALARM']);
  }
  for (const e of S.eventos) add(`ev-${e.id}`, [`DTSTART;VALUE=DATE:${z(e.data)}`, `DTEND;VALUE=DATE:${z(diaSeg(e.data))}`, `SUMMARY:${escI(e.titulo + (e.materiaId ? ' · ' + nomeM(byId(e.materiaId)) : ''))}`]);
  for (const f of S.feriados) add(`fer-${f.data}`, [`DTSTART;VALUE=DATE:${z(f.data)}`, `DTEND;VALUE=DATE:${z(diaSeg(f.data))}`, `SUMMARY:${escI('🎉 ' + (f.descricao || 'Sem aula'))}`, 'TRANSP:TRANSPARENT']);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Meu Semestre//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Meu Semestre', `X-WR-TIMEZONE:${tz}`, ...ev, 'END:VCALENDAR'].join('\r\n');
  const file = new File([ics], 'meu-semestre.ics', { type: 'text/calendar' });
  closeSheet();
  sheet(`<h2>Levar para sua agenda</h2><p class="mu" style="margin-top:6px">${ev.length} eventos: aulas do semestre, provas (com lembrete na véspera), entregas e feriados.</p>
    <ol class="ios-steps"><li><span><b>iPhone:</b> toque em Baixar e depois em <b>Adicionar tudo</b></span></li><li><span><b>Google Agenda:</b> no computador, abra calendar.google.com → ⚙️ Configurações → <b>Importar e exportar</b> → selecione o arquivo</span></li><li><span>Se mudar algo no app, exporte de novo. Para não duplicar, importe numa agenda nova chamada "Meu Semestre".</span></li></ol>
    <div class="actions"><button class="btn" onclick="closeSheet()">Fechar</button><button class="btn pr sp" id="ics-btn">${ic('cal', 18)} Baixar arquivo</button></div>`);
  $('#ics-btn').onclick = () => baixarOuCompartilhar(file);
}
async function baixarOuCompartilhar(file) {
  if (navigator.canShare?.({ files: [file] }) && /mobi|android|iphone/i.test(navigator.userAgent)) { try { await navigator.share({ files: [file], title: file.name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ================= Grade como imagem =================
async function compartilharGrade() {
  if (!exigirPremium('Compartilhar a grade como imagem faz parte do Premium.')) return;
  const dias = [2, 3, 4, 5, 6, 7].filter(d => d < 7 || S.materias.some(m => m.horarios.some(h => +h.dia === 7)));
  const oc = {};
  S.materias.forEach(m => m.horarios.forEach(h => { const i = SLOTS.indexOf(h.inicio); for (let k = 0; k < (+h.aulas || 1); k++) { const s = SLOTS[i + k]; if (s) oc[h.dia + s] = { m, h, first: !k }; } }));
  const usados = SLOTS.filter(s => dias.some(d => oc[d + s]));
  if (!usados.length) return toast('Sua grade está vazia.');
  await document.fonts?.ready;
  const W = 1080, pad = 48, colT = 110, top = 210, cw = (W - pad * 2 - colT) / dias.length, rh = 96;
  const H = top + usados.length * rh + 150;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = c.getContext('2d');
  const F = (w, s) => `${w} ${s}px Inter, system-ui, sans-serif`;
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, '#0e1530'); grad.addColorStop(1, '#1d2a6b');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.font = F(700, 54); g.fillText('Minha grade', pad, 100);
  g.fillStyle = 'rgba(255,255,255,.65)'; g.font = F(500, 28); g.fillText(`${S.perfil.nome ? S.perfil.nome.split(' ')[0] + ' · ' : ''}${S.materias.length} disciplinas`, pad, 146);
  g.textAlign = 'center'; g.font = F(600, 26);
  dias.forEach((d, i) => g.fillText(DIAS[d], pad + colT + cw * i + cw / 2, top - 18));
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); };
  usados.forEach((s, r) => {
    const y = top + r * rh;
    g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.55)'; g.font = F(500, 24); g.fillText(hhmm(s), pad + colT - 18, y + 38);
    dias.forEach((d, i) => {
      const x = pad + colT + cw * i + 4, o = oc[d + s];
      g.fillStyle = o ? o.m.cor : 'rgba(255,255,255,.06)'; g.globalAlpha = o && !o.first ? .8 : 1; rr(x, y + 4, cw - 8, rh - 8, 16); g.globalAlpha = 1;
      if (o?.first) {
        g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = F(700, 24); g.fillText((o.m.codigo || o.m.nome).slice(0, 9), x + 14, y + 40);
        if (o.h.sala) { g.font = F(500, 19); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(o.h.sala.slice(0, 11), x + 14, y + 68); }
      }
    });
  });
  g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.5)'; g.font = F(500, 24); g.fillText('Feito com Meu Semestre · ' + location.host, pad, H - 56);
  c.toBlob(b => baixarOuCompartilhar(new File([b], 'minha-grade.png', { type: 'image/png' })), 'image/png');
}

// ================= Tema (claro / escuro / sistema + cor) =================
const CORES_APP = ['#4f46e5', '#7048e8', '#d6336c', '#e03131', '#e8590c', '#f59f00', '#2f9e44', '#0ca678', '#1098ad', '#1c7ed6', '#495057'];
function aplicarTema(t = S.perfil.tema || 'sistema', c = S.perfil.cor || '') {
  const r = document.documentElement;
  if (t === 'sistema') delete r.dataset.theme; else r.dataset.theme = t === 'claro' ? 'light' : 'dark';
  if (c) r.style.setProperty('--pr-base', c); else r.style.removeProperty('--pr-base');
  try { localStorage.setItem(KEY + ':tema', JSON.stringify({ t, c })); } catch { }
  const bg = getComputedStyle(document.body).backgroundColor;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => { m.content = bg; m.removeAttribute('media'); });
}
(() => { try { const x = JSON.parse(localStorage.getItem(KEY + ':tema')); if (x) addEventListener('DOMContentLoaded', () => aplicarTema(x.t, x.c)); } catch { } })();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => aplicarTema());
function setTema(t) { vibrar(8); S.perfil.tema = t; save(); render(); }
function setCor(c) {
  if (!exigirPremium('Personalizar a cor do app faz parte do Premium.')) return; vibrar(8); S.perfil.cor = c; save(); render(); }

// ================= Tela de Configurações =================
const li = (icone, cor, titulo, sub, direita = '', attrs = '') => `<${attrs.startsWith('onclick') ? 'button' : attrs.startsWith('for') ? 'label' : 'div'} class="li" ${attrs}><span class="ico" style="background:${cor}">${ic(icone)}</span><span class="tx">${titulo}${sub ? `<small>${sub}</small>` : ''}</span>${direita}</${attrs.startsWith('onclick') ? 'button' : attrs.startsWith('for') ? 'label' : 'div'}>`;
const chev = `<span class="chev">${ic('right', 18)}</span>`;
V.config = () => {
  const p = S.perfil, tema = p.tema || 'sistema', corAtual = p.cor || CORES_APP[0];
  const nome = p.nome || user?.user_metadata?.full_name || '';
  const ini = (nome || user?.email || '?').trim()[0].toUpperCase();
  return `<div class="stack"><h1>Configurações</h1><div class="cfg">

  ${secaoPlano()}
  ${user ? `<section class="grp full"><div class="card">${li('share', '#7048e8', 'Indique e ganhe', 'Ganhe 1 mês de Premium por amigo que assinar', chev, `onclick="go('indicar')"`)}</div></section>` : ''}
  ${PLANO.admin ? `<section class="grp full"><h4>Administração</h4><div class="card">${li('user', '#495057', 'Painel Admin', 'Contas, planos e cortesias', chev, `onclick="go('admin')"`)}</div></section>` : ''}
  <section class="grp full"><div class="card"><div class="perfil"><label class="avatar-edit" aria-label="Trocar foto de perfil">${avatarHTML(64)}<span class="cam">${ic('cam', 14)}</span><input type="file" accept="image/*" hidden onchange="trocarFoto(this)"></label><div class="sp">
    ${''}<input class="inl" style="font-weight:600;font-size:17px;background:none;border:0;padding:0;min-height:0;box-shadow:none" value="${esc(nome)}" placeholder="Seu nome" aria-label="Seu nome" onchange="S.perfil.nome=this.value.trim();save();toast('Nome salvo.')">
    <div class="mu">${user ? esc(user.email) + ' · ' + (syncState === 'off' ? 'offline' : 'sincronizado') : 'Sem conta — dados só neste aparelho'}</div>
    <div style="margin-top:4px">${linhaCurso(true)}</div>
    ${user ? `<div class="mu" style="margin-top:4px">Toque na foto para trocar${fotoPerfil() ? ` · <a href="#" onclick="event.preventDefault();removerFoto()">remover foto</a>` : ''}</div>` : ''}</div></div></div></section>

  <section class="grp"><h4>Aparência</h4><div class="card">
    <div style="padding:14px 16px 10px" class="sm"><b>Tema</b></div>
    <div class="seg tema">${[['sistema', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']].map(([k, l]) => `<button class="${tema === k ? 'on' : ''}" onclick="setTema('${k}')">${l}</button>`).join('')}</div>
    <div style="padding:6px 16px 0" class="sm"><b>Cor do app</b></div>
    <div class="cores">${CORES_APP.map(c => `<button class="cor ${c === corAtual ? 'on' : ''}" style="background:${c}" aria-label="Cor ${c}" onclick="setCor('${c}')"></button>`).join('')}
      <button class="cor custom ${!CORES_APP.includes(corAtual) ? 'on' : ''}" aria-label="Cor personalizada" onclick="gradeCores()"></button></div>
  </div></section>

  <section class="grp"><h4>Semestre</h4><div class="card">
    ${li('cal', '#1c7ed6', 'Início das aulas', '', `<input type="date" value="${S.semestre.inicio}" aria-label="Início das aulas" onchange="setSemestre('inicio',this.value)">`)}
    ${li('cal', '#1c7ed6', 'Fim das aulas', '', `<input type="date" value="${S.semestre.fim}" aria-label="Fim das aulas" onchange="setSemestre('fim',this.value)">`)}
    ${li('check', '#e8590c', 'Regras de aprovação', `Média ${fmt(MEDIA_APROV)} · presença ${Math.round(FREQ_MIN * 100)}% · recuperação a partir de ${fmt(MEDIA_REC)}`, chev, `onclick="regrasSheet()"`)}
    ${li('sun', '#2f9e44', 'Feriados e dias sem aula', S.feriados.length ? `${S.feriados.length} cadastrado(s)` : 'Nenhum cadastrado', chev, `onclick="feriadosSheet()"`)}
  </div></section>

  <section class="grp"><h4>Lembretes</h4><div class="card">
    ${li('bell', '#e8590c', 'Resumo diário às 7h', 'Aulas do dia, provas próximas e faltas', `<label class="switch"><input type="checkbox" id="c-notif" ${p.notif ? 'checked' : ''} onchange="alternarNotif(this.checked)"><i></i></label>`)}
  </div></section>

  <section class="grp"><h4>Agenda e compartilhamento</h4><div class="card">
    ${li('cal', '#7048e8', 'Exportar para Google Agenda', 'Aulas, provas, entregas e feriados', chev, `onclick="exportarAgenda()"`)}
    ${li('share', '#d6336c', 'Compartilhar grade como imagem', 'Para WhatsApp ou Stories', chev, `onclick="compartilharGrade()"`)}
    ${standalone() ? '' : li('phone', '#0ca678', 'Instalar o app', isIOS() ? 'Adicionar à Tela de Início' : 'Abrir em tela cheia, com ícone', chev, `onclick="instalar()"`)}
  </div></section>

  <section class="grp"><h4>Dados</h4><div class="card">
    ${li('db', '#495057', 'Exportar backup', 'Arquivo com todos os seus dados', chev, `onclick="exportar()"`)}
    ${li('up', '#495057', 'Importar backup', '', `<input type="file" accept="application/json" hidden id="imp" onchange="importar(this)">` + chev, `for="imp"`)}
  </div></section>

  <section class="grp"><h4>Conta</h4><div class="card">
    ${li('out', '#868e96', user ? 'Sair da conta' : 'Entrar com uma conta', user ? '' : 'Para sincronizar entre aparelhos', chev, `onclick="sair()"`)}
    <button class="li danger" onclick="apagarTudo()"><span class="ico" style="background:var(--bad)">${ic('trash')}</span><span class="tx">Apagar todos os dados</span></button>
  </div></section>

  </div><p class="versao">Meu Semestre · app independente, sem vínculo com universidades<br><a href="privacidade.html">Privacidade</a> · <a href="termos.html">Termos</a></p></div>`;
};
function setSemestre(k, v) {
  const novo = { ...S.semestre, [k]: v };
  if (novo.inicio && novo.fim && novo.fim < novo.inicio) { render(); return toast('O fim deve ser depois do início.'); }
  S.semestre = novo; save(); toast('Semestre atualizado.');
}
function feriadosSheet() {
  const lista = [...S.feriados].sort((a, b) => a.data.localeCompare(b.data));
  sheet(`<h2>Feriados e dias sem aula</h2><p class="mu" style="margin:4px 0 12px">Nesses dias não há aula e as faltas não contam.</p>
    <div class="list">${lista.map(f => `<div class="row"><div class="sp"><b class="sm">${esc(f.descricao || 'Sem aula')}</b><div class="mu" style="text-transform:capitalize">${brDL(f.data)}</div></div><button class="ib" aria-label="Remover" onclick="removerFeriado('${f.data}')">${ic('trash', 18)}</button></div>`).join('') || '<p class="mu">Nenhum cadastrado.</p>'}</div>
    <div class="fields c2" style="margin-top:16px"><label class="f">Data<input type="date" id="fer-d"></label><label class="f">Descrição<input id="fer-t" placeholder="Feriado"></label></div>
    <div class="actions"><button class="btn" onclick="closeSheet();render()">Fechar</button><button class="btn pr sp" onclick="addFeriado()">${ic('plus', 18)} Adicionar</button></div>`);
}
function addFeriado() { const d = val('fer-d'); if (!d) return toast('Escolha a data.'); if (!S.feriados.some(f => f.data === d)) S.feriados.push({ data: d, descricao: val('fer-t') || 'Sem aula' }); save(); feriadosSheet(); }
function removerFeriado(d) { S.feriados = S.feriados.filter(f => f.data !== d); save(); feriadosSheet(); }

// iPhone no Safari: mostra uma vez como instalar (sem isso fica com cara de site)
addEventListener('load', () => setTimeout(() => {
  if (!document.body.classList.contains('app') || standalone() || !isIOS()) return;
  try { if (localStorage.getItem(KEY + ':ios-dica')) return; localStorage.setItem(KEY + ':ios-dica', 1); } catch { return; }
  instalar();
}, 1500));

// ================= Comportamento de app nativo (sem zoom, sem seleção, sem menu de toque longo) =================
(() => {
  const editavel = el => el && el.closest && el.closest('input,textarea,select,[contenteditable]');
  // iOS ignora user-scalable=no: bloqueia gesto de pinça e zoom de duplo toque
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let ultimoToque = 0;
  document.addEventListener('touchend', e => { const agora = Date.now(); if (agora - ultimoToque < 300 && !editavel(e.target)) e.preventDefault(); ultimoToque = agora; }, { passive: false });
  // sem menu de "copiar / abrir link" ao segurar o dedo, e sem arrastar imagens
  document.addEventListener('contextmenu', e => { if (!editavel(e.target)) e.preventDefault(); });
  document.addEventListener('selectstart', e => { if (!editavel(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (!editavel(e.target)) e.preventDefault(); });
  // ctrl/cmd + roda do mouse ou + / - não dão zoom no app instalado
  if (standalone()) {
    addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault(); });
  }
})();

// ================= Login com Google dentro do app (Google Identity Services) =================
// Mostra "Meu Semestre" e o endereço do app na tela do Google, em vez do domínio do Supabase.
let gisNonce = null, gisPronto = null;
const sha256 = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
function carregarGIS() {
  return window.google?.accounts?.id ? Promise.resolve() : new Promise((ok, err) => {
    const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = ok; sc.onerror = err; document.head.append(sc);
  });
}
// inicializa o Google UMA vez por carregamento (o mesmo nonce vale para o botão e o One Tap)
function iniciarGIS() {
  return gisPronto ||= (async () => {
    await carregarGIS();
    gisNonce = crypto.randomUUID();
    google.accounts.id.initialize({
      client_id: cfg.googleClientId, nonce: await sha256(gisNonce), callback: entrarComGoogle,
      ux_mode: 'popup', auto_select: false, itp_support: true, use_fedcm_for_prompt: true, context: 'signin', cancel_on_tap_outside: true,
    });
  })();
}
async function montarGoogle() {
  const box = $('#gbtn');
  if (!box || !cfg.googleClientId || !sb) return; // sem Client ID: usa o login antigo (redirecionamento)
  try {
    await iniciarGIS();
    if (!document.body.contains(box)) return;
    const escuro = getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0, 3).reduce((a, n) => a + +n, 0) < 300;
    box.innerHTML = '';
    google.accounts.id.renderButton(box, { type: 'standard', theme: escuro ? 'filled_black' : 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'center', width: Math.min(400, box.clientWidth || 340), locale: 'pt-BR' });
    google.accounts.id.prompt();
  } catch { /* mantém o botão antigo */ }
}
async function entrarComGoogle({ credential }) {
  const { error } = await sb.auth.signInWithIdToken({ provider: 'google', token: credential, nonce: gisNonce });
  if (error) {
    console.warn('login google (id token):', error.message);
    toast('Abrindo o login do Google…');
    loginGoogle(); // plano B: login pelo redirecionamento, que sempre funciona
  }
}

// ================= Grade de cores (arrastar o dedo para escolher) =================
const hex = (h, sat, l) => { l /= 100; const a = sat * Math.min(l, 1 - l) / 100, f = n => { const k = (n + h / 30) % 12, c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
function gradeCores() {
  if (!exigirPremium('Personalizar a cor do app faz parte do Premium.')) return;
  const hues = [0, 15, 30, 45, 60, 90, 130, 160, 185, 205, 225, 250, 275, 300, 330], luz = [78, 66, 56, 46, 38, 30];
  const cores = [...luz.flatMap(l => hues.map(h => hex(h, l > 70 ? 70 : 78, l))), ...hues.map((_, i) => hex(220, 8, 92 - i * 6))];
  let escolhida = S.perfil.cor || CORES_APP[0];
  sheet(`<h2>Cor personalizada</h2><p class="mu" style="margin:4px 0 14px">Arraste o dedo pela grade, o app muda na hora. Solte na cor que quiser.</p>
    <div id="grade" style="display:grid;grid-template-columns:repeat(${hues.length},1fr);border-radius:14px;overflow:hidden;touch-action:none;cursor:crosshair">
      ${cores.map(c => `<i data-c="${c}" style="aspect-ratio:1;background:${c};outline-offset:-3px${c === escolhida ? ';outline:3px solid #fff' : ''}"></i>`).join('')}</div>
    <div class="row" style="margin-top:14px"><span id="prev" class="avatar" style="width:40px;height:40px;font-size:15px;background:${escolhida}">Aa</span><b id="hexc" class="sp">${escolhida.toUpperCase()}</b>
      <label class="btn sm">Outra…<input type="color" hidden value="${escolhida}" onchange="marcar(this.value);"></label></div>
    <div class="actions"><button class="btn" onclick="aplicarTema();closeSheet()">Cancelar</button><button class="btn pr sp" id="usar">Usar esta cor</button></div>`);
  const g = $('#grade');
  window.marcar = c => { escolhida = c; g.querySelectorAll('i').forEach(i => i.style.outline = i.dataset.c === c ? '3px solid #fff' : ''); $('#prev').style.background = c; $('#hexc').textContent = c.toUpperCase(); aplicarTema(S.perfil.tema || 'sistema', c); };
  let ultimo = null;
  const em = e => { const el = document.elementFromPoint(e.clientX, e.clientY); if (el?.dataset?.c && el.dataset.c !== ultimo) { ultimo = el.dataset.c; vibrar(4); marcar(el.dataset.c); } };
  g.addEventListener('pointerdown', e => { g.setPointerCapture(e.pointerId); em(e); });
  g.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') em(e); });
  $('#usar').onclick = () => { closeSheet(); setCor(escolhida); };
}


// ================= Plano / Premium =================
const LIMITE_DISC = 3;
let PLANO = { premium: false, plano: 'gratis', admin: false, ia: { usados: 0, limite: 3 } };
try { const c = JSON.parse(localStorage.getItem(KEY + ':plano')); if (c) PLANO = c; } catch { }
const premium = () => !!PLANO.premium;
const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
const diasRestam = d => Math.max(0, Math.ceil((new Date(d) - new Date()) / 864e5));
async function tokenAtual(renovar = false) {
  if (renovar) { const r = await sb?.auth.refreshSession(); if (r?.data?.session) return r.data.session.access_token; }
  return (await sb?.auth.getSession())?.data?.session?.access_token;
}
async function carregarPlano() {
  if (!sb || !user) return;
  try {
    const r = await fetch('/api/meu-plano', { headers: { Authorization: 'Bearer ' + await tokenAtual() } });
    if (r.ok) { PLANO = await r.json(); try { localStorage.setItem(KEY + ':plano', JSON.stringify(PLANO)); } catch { } render(); aplicarConvite(); }
  } catch { }
}
function exigirPremium(motivo) {
  if (premium()) return true;
  sheet(`<div class="pw-top">${ic('spark', 28)}</div><h2 style="text-align:center">Recurso Premium</h2><p class="mu" style="text-align:center;margin:6px 0 16px">${esc(motivo || '')}</p>
    ${listaBeneficios()}
    <div class="actions">${user ? `<button class="btn" onclick="closeSheet()">Agora não</button><button class="btn pr sp" onclick="closeSheet();go('premium')">Ver planos</button>` : `<button class="btn" onclick="closeSheet()">Agora não</button><button class="btn pr sp" onclick="sair()">Criar conta (30 dias grátis)</button>`}</div>`);
  return false;
}
const BENEFICIOS = [['book', 'Disciplinas ilimitadas', `O grátis tem até ${LIMITE_DISC}`], ['spark', 'Leituras ilimitadas com IA', 'Prints e PDFs sem limite'], ['bell', 'Lembretes diários às 7h', 'Aulas, provas e faltas'], ['cal', 'Exportar para Google Agenda', 'Aulas, provas e feriados'], ['share', 'Grade como imagem', 'Para WhatsApp e Stories'], ['palette', 'Cores personalizadas', 'Deixe o app com a sua cara']];
const listaBeneficios = () => `<div class="benef">${BENEFICIOS.map(([i, t, d]) => `<div class="row"><span class="kpi-ic" style="margin:0;color:var(--pr);background:var(--pr-2)">${ic(i, 18)}</span><div class="sp"><b class="sm">${t}</b><div class="mu">${d}</div></div><span style="color:var(--ok)">${ic('check', 18)}</span></div>`).join('')}</div>`;
function secaoPlano() {
  if (!user) return '';
  const p = PLANO, nome = { teste: 'Teste grátis', mensal: 'Premium mensal', semestral: 'Premium semestral', cortesia: 'Premium (cortesia)', manual: 'Premium', gratis: 'Grátis' }[p.plano] || 'Grátis';
  const sub = !p.premium ? 'Recursos básicos' : p.plano === 'cortesia' ? 'Sem data de vencimento' : p.plano === 'teste' ? `Termina em ${diasRestam(p.premium_ate)} dia(s), ${fmtData(p.premium_ate)}` : p.status === 'cancelada' ? `Cancelado · vale até ${fmtData(p.premium_ate)}` : `Válido até ${fmtData(p.premium_ate)}`;
  return `<section class="grp full"><h4>Seu plano</h4><a class="card plano-card ${p.premium ? 'on' : ''}" href="#/premium"><span class="kpi-ic" style="margin:0;color:#fff;background:${p.premium ? 'var(--pr)' : 'var(--tx-2)'}">${ic('spark', 18)}</span><div class="sp"><b>${nome}</b><div class="mu">${sub}</div></div><span class="btn sm ${p.premium && p.plano !== 'teste' ? '' : 'pr'}">${p.premium && p.plano !== 'teste' ? 'Gerenciar' : 'Assinar'}</span></a></section>`;
}
V.premium = () => {
  const p = PLANO, sub = R.id;
  if (sub === 'ok' || sub === 'pendente') {
    if (!p.premium || p.plano === 'teste') setTimeout(aguardarPagamento, 2500);
    return `<div class="stack"><div class="card empty" style="margin-top:12px">${p.premium && p.plano !== 'teste' ? `<div class="ic" style="background:var(--ok-2);color:var(--ok)">${ic('check', 26)}</div><h2>Premium ativado! 🎉</h2><p class="mu" style="margin:6px 0 16px">Válido até ${fmtData(p.premium_ate)}. Obrigado por apoiar o Meu Semestre.</p><a class="btn pr" href="#/inicio">Ir para o início</a>` : `<div class="spin"></div><h2 style="margin-top:16px">${sub === 'pendente' ? 'Aguardando o pagamento' : 'Confirmando seu pagamento'}…</h2><p class="mu" style="margin:6px 0 16px">${sub === 'pendente' ? 'Pagamentos por Pix costumam cair em segundos. Assim que confirmar, o Premium libera sozinho.' : 'Só um instante, estamos liberando o Premium.'}</p><a class="btn" href="#/inicio">Voltar ao app</a>`}</div></div>`;
  }
  if (sub === 'erro') setTimeout(() => toast('O pagamento não foi concluído. Tente novamente.'), 300);
  if (!user) return `<div class="stack"><div class="card prem-hero"><h1 style="color:#fff;margin:0 0 6px">Ganhe 30 dias de Premium grátis</h1><p style="opacity:.85;margin:0 0 16px">Crie sua conta (Google ou e-mail) e use tudo liberado por 30 dias. Seus dados deste aparelho vão junto.</p><button class="btn" onclick="sair()">Criar conta grátis</button></div><div class="card"><h3 style="margin-bottom:10px">O que vem no Premium</h3>${listaBeneficios()}</div></div>`;
  const ativo = p.premium && p.plano !== 'teste';
  return `<div class="stack"><div class="card prem-hero"><span class="tag" style="background:rgba(255,255,255,.18);color:#fff">${ic('spark', 14)} Meu Semestre Premium</span>
      <h1 style="color:#fff;margin:12px 0 6px">${ativo ? 'Você é Premium 💜' : 'Tudo do seu semestre, sem limites'}</h1>
      <p style="opacity:.85;margin:0">${ativo ? (p.plano === 'cortesia' ? 'Sua conta tem Premium de cortesia.' : `Válido até ${fmtData(p.premium_ate)}${p.status === 'cancelada' ? ' · renovação cancelada' : ''}.`) : p.premium ? `Seu teste grátis termina em ${diasRestam(p.premium_ate)} dia(s). Assine para não perder nada.` : 'Seu teste grátis terminou. Assine e continue com tudo liberado.'}</p></div>
    ${ativo ? '' : `<div class="planos">
      <div class="card plano destaque"><span class="selo">Mais escolhido · economize 40%</span><h3>Semestral</h3><div class="preco">R$ 24,90<small>/semestre</small></div><p class="mu">Equivale a R$ 4,15 por mês. Pague com <b>Pix</b> ou cartão, sem renovação automática.</p><button class="btn pr block" onclick="assinar('semestral',this)">Assinar semestral</button></div>
      <div class="card plano"><h3>Mensal</h3><div class="preco">R$ 6,90<small>/mês</small></div><p class="mu">Cobrança automática no cartão. Cancele quando quiser, direto pelo app.</p><button class="btn block" onclick="assinar('mensal',this)">Assinar mensal</button></div></div>`}
    <div class="card"><h3 style="margin-bottom:10px">O que vem no Premium</h3>${listaBeneficios()}</div>
    ${p.mensal ? `<button class="btn danger block" onclick="cancelarAssinatura()">Cancelar renovação mensal</button>` : ''}
    <button class="btn ghost block" onclick="verificarPagamento(true)">${ic('hist', 18)} Já paguei, verificar agora</button>
    <p class="mu" style="text-align:center">Pagamento processado pelo Mercado Pago. Arrependimento em até 7 dias: devolvemos o valor. <a href="termos.html">Termos</a></p></div>`;
};
async function assinar(plano, btn) {
  if (!user) return exigirPremium('Crie uma conta para assinar.');
  if (!PLANO.pagamentos) return toast('Pagamentos em breve! Por enquanto aproveite o teste grátis.');
  btn.disabled = true; btn.textContent = 'Abrindo o Mercado Pago…';
  try {
    const r = await fetch('/api/assinar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await tokenAtual() }, body: JSON.stringify({ plano }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    location.href = d.url;
  } catch (e) { toast(e.message || 'Erro ao abrir o pagamento.'); btn.disabled = false; btn.textContent = 'Tentar de novo'; }
}
let tentativasPg = 0;
async function aguardarPagamento() {
  if (R.v !== 'premium' || !['ok', 'pendente'].includes(R.id) || tentativasPg++ > 40) return;
  if (tentativasPg % 3 === 1) await verificarPagamento(); // a cada ~7s consulta o Mercado Pago direto
  await carregarPlano();
}
async function verificarPagamento(avisar) {
  try {
    const r = await fetch('/api/verificar', { method: 'POST', headers: { Authorization: 'Bearer ' + await tokenAtual() } });
    const d = await r.json();
    if (avisar) { await carregarPlano(); toast(premium() && !['teste', 'gratis'].includes(PLANO.plano) ? 'Assinatura encontrada e ativada!' : d.erro ? 'Mercado Pago: ' + d.erro : 'Nenhum pagamento aprovado encontrado ainda.'); }
  } catch { if (avisar) toast('Sem conexão.'); }
}
function cancelarAssinatura() {
  sheet(`<h2>Cancelar a renovação?</h2><p class="mu" style="margin:8px 0">Você não será mais cobrado. O Premium continua até ${fmtData(PLANO.premium_ate)}.</p>
    <div class="actions"><button class="btn" onclick="closeSheet()">Manter</button><button class="btn pr sp" style="background:var(--bad);border-color:var(--bad)" id="cc">Cancelar renovação</button></div>`);
  $('#cc').onclick = async () => {
    const r = await fetch('/api/cancelar', { method: 'POST', headers: { Authorization: 'Bearer ' + await tokenAtual() } });
    const d = await r.json(); closeSheet(); toast(r.ok ? 'Renovação cancelada.' : d.error); carregarPlano();
  };
}

// ================= Admin =================
let ADM = null, admBusca = '', admFiltro = 'todos';
V.admin = () => {
  if (!PLANO.admin) { setTimeout(() => go('inicio')); return ''; }
  if (!ADM) { carregarAdmin(); return `<div class="card empty" style="margin-top:24px"><div class="spin"></div><p class="mu" style="margin-top:12px">Carregando contas…</p></div>`; }
  const r = ADM.resumo, b = norm(admBusca);
  const lista = ADM.contas.filter(c => (!b || norm(c.email + ' ' + c.nome).includes(b)) && (admFiltro === 'todos' || (admFiltro === 'premium' ? c.premium : admFiltro === 'gratis' ? !c.premium : admFiltro === 'indicados' ? !!c.indicadoPor : c.plano === admFiltro)));
  const pl = c => ({ teste: ['Teste', 'neu'], mensal: ['Mensal', 'ok'], semestral: ['Semestral', 'ok'], cortesia: ['Cortesia', 'ok'], manual: ['Manual', 'ok'], gratis: ['Grátis', 'neu'] }[c.plano] || [c.plano, 'neu']);
  return `<div class="stack"><div class="pg-h"><div><p class="mu">Somente você vê esta tela</p><h1>Admin</h1></div><div class="row"><button class="btn" onclick="admZerar()">${ic('trash', 18)} Zerar pagamentos de teste</button><button class="btn" onclick="ADM=null;render()">${ic('hist', 18)} Atualizar</button></div></div>
    <div class="kpis">
      <div class="kpi card"><div class="mu">Contas</div><div class="kpi-v">${r.total}</div><div class="mu sm">${r.premium} com Premium ativo</div></div>
      <div class="kpi card"><div class="mu">Pagantes</div><div class="kpi-v">${r.pagantes}</div><div class="mu sm">mensal ou semestral</div></div>
      <div class="kpi card"><div class="mu">Cortesias · Indicações</div><div class="kpi-v">${r.cortesias} · ${r.indicacoes || 0}</div><div class="mu sm">${r.indicacoesAssinaram || 0} indicação(ões) viraram assinatura</div></div>
      <div class="kpi card"><div class="mu">Receita (Pix/avulso)</div><div class="kpi-v">R$ ${r.receita.toFixed(2).replace('.', ',')}</div><div class="mu sm">pagamentos aprovados</div></div></div>
    ${rankingIndicacoes()}
    <div class="row wrap"><input style="flex:1;min-width:200px" placeholder="Buscar por nome ou e-mail" value="${esc(admBusca)}" oninput="admBusca=this.value;clearTimeout(window._ab);window._ab=setTimeout(render,250)">
      <div class="chips">${[['todos', 'Todos'], ['premium', 'Premium'], ['gratis', 'Sem Premium'], ['teste', 'Em teste'], ['cortesia', 'Cortesia'], ['indicados', 'Vieram por indicação']].map(([k, l]) => `<button class="chip ${admFiltro === k ? 'on' : ''}" onclick="admFiltro='${k}';render()">${l}</button>`).join('')}</div></div>
    <div class="card" style="padding:0"><div class="adm-lista">${lista.map(c => `<div class="adm-row">
      ${c.foto ? `<img class="avatar" src="${esc(c.foto)}" referrerpolicy="no-referrer" alt="" style="width:38px;height:38px;object-fit:cover">` : `<div class="avatar" style="width:38px;height:38px;font-size:14px">${esc((c.nome || c.email || '?')[0].toUpperCase())}</div>`}
      <div class="sp" style="min-width:0"><b class="sm">${esc(c.nome || '(sem nome)')}</b><div class="mu" style="overflow:hidden;text-overflow:ellipsis">${esc(c.email)} · ${c.provedor === 'google' ? 'Google' : 'e-mail'}</div>
        <div class="mu">Criada ${new Date(c.criado).toLocaleDateString('pt-BR')} · ${c.disciplinas} disciplina(s)${c.ultimo_acesso ? ' · último acesso ' + new Date(c.ultimo_acesso).toLocaleDateString('pt-BR') : ''}</div>
        ${c.indicacoes?.total || c.indicadoPor ? `<div class="mu">🎁 ${c.indicacoes.total ? `${c.indicacoes.total} indicação(ões), ${c.indicacoes.assinaram} assinou(aram)` : ''}${c.indicacoes.total && c.indicadoPor ? ' · ' : ''}${c.indicadoPor ? 'indicado por ' + esc(c.indicadoPor) : ''}</div>` : ''}</div>
      <div class="adm-pl">${tag(pl(c)[0], c.premium ? pl(c)[1] : 'bad')}<div class="mu">${c.plano === 'cortesia' ? 'sem vencimento' : (c.premium ? 'até ' : 'venceu ') + new Date(c.premium_ate).toLocaleDateString('pt-BR')}</div></div>
      <button class="ib" aria-label="Gerenciar conta" onclick="admConta('${c.id}')">${ic('pen', 18)}</button></div>`).join('') || '<p class="mu" style="padding:16px">Nenhuma conta encontrada.</p>'}</div></div></div>`;
};
async function carregarAdmin() {
  let r = await fetch('/api/admin', { headers: { Authorization: 'Bearer ' + await tokenAtual() } });
  if (r.status === 401 || r.status === 403) r = await fetch('/api/admin', { headers: { Authorization: 'Bearer ' + await tokenAtual(true) } }); // sessão vencida: renova e tenta de novo
  const d = await r.json();
  if (!r.ok) { toast((d.error || 'Erro ao carregar.') + (user ? ` (conta: ${user.email})` : '')); PLANO.admin = false; return go('inicio'); }
  ADM = d; render();
}
function admConta(id) {
  const c = ADM.contas.find(x => x.id === id);
  sheet(`<h2>${esc(c.nome || c.email)}</h2><p class="mu" style="margin:4px 0 14px">${esc(c.email)} · plano atual: <b>${esc(c.plano)}</b>, ${c.plano === 'cortesia' ? 'sem vencimento' : (c.premium ? 'até ' : 'venceu em ') + fmtData(c.premium_ate)}</p>
    <div class="grp"><div class="card">
      <button class="li" onclick="admAcao('${id}','cortesia')"><span class="ico" style="background:var(--ok)">${ic('spark')}</span><span class="tx">Dar Premium de cortesia<small>Não paga, sem data de vencimento</small></span></button>
      <div class="li"><span class="ico" style="background:#1c7ed6">${ic('cal')}</span><span class="tx">Adicionar dias de Premium<small>Soma ao período atual</small></span><select id="adm-d" style="width:auto;min-height:36px">${[7, 30, 90, 183, 365].map(n => `<option value="${n}">${n} dias</option>`).join('')}</select><button class="btn sm pr" onclick="admAcao('${id}','dias',$('#adm-d').value)">Dar</button></div>
      <button class="li danger" onclick="admAcao('${id}','remover')"><span class="ico" style="background:var(--bad)">${ic('x')}</span><span class="tx">Remover Premium<small>Volta para o plano grátis agora</small></span></button>
    </div></div>
    <p class="mu" style="margin-top:12px">Assinaturas mensais pagas são canceladas pelo próprio aluno ou no painel do Mercado Pago.</p>
    ${c.id === user?.id ? '' : `<div class="grp" style="margin-top:14px"><div class="card"><button class="li danger" onclick="admApagar('${id}')"><span class="ico" style="background:var(--bad)">${ic('trash')}</span><span class="tx">Apagar conta<small>Remove a conta e todos os dados. Não pode ser desfeito.</small></span></button></div></div>`}
    <div class="actions"><button class="btn block" onclick="closeSheet()">Fechar</button></div>`);
}
async function admAcao(userId, acao, dias) {
  const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await tokenAtual() }, body: JSON.stringify({ userId, acao, dias }) });
  const d = await r.json(); closeSheet();
  toast(r.ok ? (d.apagada ? 'Conta apagada.' : d.apagados != null ? `${d.apagados} pagamento(s) de teste apagado(s).` : 'Plano atualizado.') : d.error); ADM = null; render();
  if (userId === user?.id) carregarPlano();
}

function admApagar(id) {
  const c = ADM.contas.find(x => x.id === id);
  sheet(`<div class="pw-top" style="background:var(--bad)">${ic('trash', 28)}</div><h2 style="text-align:center">Apagar esta conta?</h2>
    <p class="mu" style="text-align:center;margin:6px 0 14px">A conta <b>${esc(c.email)}</b> e tudo dela (disciplinas, notas, faltas, agenda, histórico, plano e lembretes) serão apagados para sempre. Se houver assinatura mensal ativa, ela é cancelada no Mercado Pago.</p>
    <label class="f">Para confirmar, digite o e-mail da conta<input id="adm-conf" autocomplete="off" placeholder="${esc(c.email)}"></label>
    <div class="actions"><button class="btn" onclick="admConta('${id}')">Voltar</button><button class="btn pr sp" style="background:var(--bad);border-color:var(--bad)" onclick="confirmarApagar('${id}')">Apagar definitivamente</button></div>`);
}

function admZerar() {
  sheet(`<h2>Zerar pagamentos de teste?</h2><p class="mu" style="margin:8px 0">Apaga os registros de pagamento usados para calcular a receita no Admin. Use só para limpar os testes antes de começar a vender. Não mexe nos planos das contas nem no Mercado Pago.</p>
    <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" style="background:var(--bad);border-color:var(--bad)" onclick="admAcao(null,'zerar_pagamentos')">Zerar receita</button></div>`);
}


// ================= Indicação =================
let IND = null;
async function aplicarConvite() {
  const c = convitePendente();
  if (!c || !user) return;
  try {
    const r = await fetch('/api/indicacao', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await tokenAtual() }, body: JSON.stringify({ codigo: c }) });
    const d = await r.json();
    if (r.ok) { localStorage.removeItem(KEY + ':convite'); if (d.ok) { toast(`🎁 Convite aplicado: +${d.bonus} dias de Premium grátis!`); carregarPlano(); } }
  } catch { }
}
const linkConvite = () => `${location.origin}/?c=${IND.codigo}`; // LP guarda o código e leva para o app
const textoConvite = () => `Tô usando o Meu Semestre pra controlar faltas, notas e provas da facul 🎓 Você manda o plano de ensino e ele monta tudo. Entra pelo meu link e ganha 45 dias de Premium grátis: ${linkConvite()}`;
V.indicar = () => {
  if (!user) { setTimeout(() => go('inicio')); return ''; }
  if (!IND) { carregarIndicacao(); return `<div class="card empty" style="margin-top:24px"><div class="spin"></div></div>`; }
  return `<div class="stack">
    <div class="card prem-hero" style="background:linear-gradient(135deg,#7048e8,var(--pr))"><span style="font-size:34px">🎁</span>
      <h1 style="color:#fff;margin:8px 0 6px">Indique e ganhe</h1>
      <p style="opacity:.9;margin:0">Cada amigo que <b>assinar</b> pelo seu link te dá <b>1 mês de Premium</b>. E ele ganha <b>${IND.bonusIndicado} dias extras</b> de teste grátis.</p></div>
    <div class="card"><div class="mu" style="margin-bottom:8px">Seu link de convite</div>
      <div class="link-box"><span>${esc(linkConvite().replace(/^https?:\/\//, ''))}</span><button class="btn sm" onclick="copiarConvite()">${ic('clip', 16)} Copiar</button></div>
      <div class="row wrap" style="margin-top:12px">
        <a class="btn pr" style="background:#25d366;border-color:#25d366;color:#fff" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(textoConvite())}">Enviar no WhatsApp</a>
        ${navigator.share ? `<button class="btn" onclick="navigator.share({title:'Meu Semestre',text:textoConvite()}).catch(()=>{})">${ic('share', 18)} Compartilhar</button>` : ''}</div>
      <div class="row" style="margin-top:10px"><span class="mu sp">Seu código: <b style="color:var(--tx)">${esc(IND.codigo)}</b></span><button class="btn ghost sm" onclick="editarCodigo()">${ic('pen', 16)} Personalizar</button></div></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi card"><div class="mu">Amigos cadastrados</div><div class="kpi-v">${IND.cadastros}</div></div>
      <div class="kpi card"><div class="mu">Assinaram</div><div class="kpi-v">${IND.assinaram}</div></div>
      <div class="kpi card"><div class="mu">Dias ganhos</div><div class="kpi-v">${IND.diasGanhos}</div></div></div>
    <div class="card"><h3 style="margin-bottom:10px">Como funciona</h3><div class="benef">
      <div class="row"><span class="num-c">1</span><div class="sp"><b class="sm">Envie seu link</b><div class="mu">Para colegas de turma, grupo do curso ou centro acadêmico.</div></div></div>
      <div class="row"><span class="num-c">2</span><div class="sp"><b class="sm">Seu amigo cria a conta</b><div class="mu">Ele ganha ${30 + IND.bonusIndicado} dias de Premium grátis em vez de 30.</div></div></div>
      <div class="row"><span class="num-c">3</span><div class="sp"><b class="sm">Ele assina, você ganha</b><div class="mu">+${IND.bonusIndicador} dias de Premium na hora, sem limite de amigos.</div></div></div></div></div>
    <p class="mu" style="text-align:center">O convite vale para contas novas, criadas a partir do seu link.</p></div>`;
};
async function carregarIndicacao() {
  try {
    const r = await fetch('/api/indicacao', { headers: { Authorization: 'Bearer ' + await tokenAtual() } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    IND = d; if (R.v === 'indicar') render();
  } catch (e) { toast(e.message || 'Erro ao carregar.'); }
}
async function copiarConvite() {
  try { await navigator.clipboard.writeText(textoConvite()); toast('Convite copiado! Cole no WhatsApp ou onde quiser.'); }
  catch { prompt('Copie o convite:', textoConvite()); }
}

// Ranking de quem mais indica (Admin)
let rankPor = 'total';
function rankingIndicacoes() {
  const top = ADM.contas.filter(c => c.indicacoes?.total).sort((a, b) => (b.indicacoes[rankPor] - a.indicacoes[rankPor]) || (b.indicacoes.total - a.indicacoes.total)).slice(0, 10);
  const conv = ADM.resumo.indicacoes ? Math.round(ADM.resumo.indicacoesAssinaram / ADM.resumo.indicacoes * 100) : 0;
  const med = ['🥇', '🥈', '🥉'];
  return `<div class="card"><div class="card-h"><h3 class="sp">🏆 Quem mais indica</h3>
      <div class="seg" style="width:auto"><button class="${rankPor === 'total' ? 'on' : ''}" onclick="rankPor='total';render()">Cadastros</button><button class="${rankPor === 'assinaram' ? 'on' : ''}" onclick="rankPor='assinaram';render()">Assinaturas</button></div></div>
    <p class="mu" style="margin:-4px 0 10px">${ADM.resumo.indicacoes || 0} cadastros por indicação · ${ADM.resumo.indicacoesAssinaram || 0} viraram assinatura (${conv}% de conversão)</p>
    ${top.length ? `<div class="list">${top.map((c, i) => `<div class="row"><span class="rank">${med[i] || (i + 1) + 'º'}</span>
      <div class="avatar" style="width:34px;height:34px;font-size:13px">${esc((c.nome || c.email || '?')[0].toUpperCase())}</div>
      <div class="sp" style="min-width:0"><b class="sm">${esc(c.nome || '(sem nome)')}</b><div class="mu" style="overflow:hidden;text-overflow:ellipsis">${esc(c.email)}</div></div>
      <div class="mini"><span class="mu">Cadastros</span><b>${c.indicacoes.total}</b></div>
      <div class="mini"><span class="mu">Assinaram</span><b style="color:var(--ok)">${c.indicacoes.assinaram}</b></div>
      <div class="mini so-desktop"><span class="mu">Ganhou</span><b>${c.indicacoes.assinaram * 30}d</b></div></div>`).join('')}</div>` : '<p class="mu">Ninguém indicou ainda. Assim que os alunos compartilharem o link, o ranking aparece aqui.</p>'}</div>`;
}

// ================= Aviso de fim do teste grátis =================
function avisoTeste() {
  if (!user || PLANO.plano !== 'teste' || !PLANO.premium_ate) return '';
  const d = diasRestam(PLANO.premium_ate);
  if (PLANO.premium && d > 3) return '';
  const acabou = !PLANO.premium;
  setTimeout(popupFimTeste, 600);
  return `<a class="card aviso-teste ${acabou ? 'fim' : ''}" href="#/premium"><span style="font-size:26px">${acabou ? '⌛' : '⏳'}</span>
    <div class="sp"><b>${acabou ? 'Seu Premium grátis terminou' : d <= 1 ? 'Seu Premium grátis termina amanhã' : `Faltam ${d} dias do seu Premium grátis`}</b>
    <div class="mu">${acabou ? 'Assine para voltar a ter lembretes, IA e disciplinas ilimitadas.' : 'Assine o semestral por R$ 24,90 e não perca nada.'}</div></div><span class="btn sm pr">Assinar</span></a>`;
}
function popupFimTeste() {
  const hojeK = KEY + ':aviso-teste:' + hoje();
  try { if (localStorage.getItem(hojeK) || $('.scrim')) return; localStorage.setItem(hojeK, 1); } catch { return; }
  const acabou = !PLANO.premium, d = diasRestam(PLANO.premium_ate);
  sheet(`<div class="pw-top">${ic('spark', 28)}</div><h2 style="text-align:center">${acabou ? 'Seu teste grátis terminou' : d <= 1 ? 'Último dia de Premium grátis' : `Faltam ${d} dias de Premium grátis`}</h2>
    <p class="mu" style="text-align:center;margin:6px 0 16px">${acabou ? 'Sua conta voltou para o plano grátis. Seus dados continuam salvos.' : 'Depois disso a conta volta para o plano grátis. Assine para continuar com tudo:'}</p>${listaBeneficios()}
    <div class="actions"><button class="btn" onclick="closeSheet()">Depois</button><button class="btn pr sp" onclick="closeSheet();go('premium')">Ver planos</button></div>`);
}

// ================= Foto de perfil =================
const fotoPerfil = () => S.perfil.foto === 'none' ? '' : (S.perfil.foto || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '');
function avatarHTML(tam = 40) {
  const f = fotoPerfil(), ini = ((S.perfil.nome || user?.email || '?').trim()[0] || '?').toUpperCase();
  return f ? `<img class="avatar" src="${esc(f)}" alt="" data-i="${esc(ini)}" referrerpolicy="no-referrer" style="width:${tam}px;height:${tam}px;object-fit:cover" onerror="avatarFalhou(this)">`
    : `<span class="avatar" style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam * .4)}px">${esc(ini)}</span>`;
}
async function trocarFoto(inp) {
  const f = inp.files[0]; inp.value = '';
  if (!f) return;
  if (!sb || !user) return toast('Entre com uma conta para usar foto de perfil.');
  sheet(`<h2>Foto de perfil</h2><div style="display:flex;justify-content:center;margin:16px 0"><div class="spin"></div></div><p class="mu" style="text-align:center">Enviando…</p>`);
  try {
    const img = await createImageBitmap(f), lado = Math.min(img.width, img.height), T = 320;
    const c = Object.assign(document.createElement('canvas'), { width: T, height: T });
    c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, T, T); // recorte quadrado central
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
    const caminho = `${user.id}/avatar.jpg`;
    const { error } = await sb.storage.from('avatares').upload(caminho, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (error) throw error;
    S.perfil.foto = sb.storage.from('avatares').getPublicUrl(caminho).data.publicUrl + '?v=' + Date.now();
    save(); closeSheet(); render(); toast('Foto atualizada!');
  } catch (e) { closeSheet(); toast('Não foi possível enviar a foto: ' + (e.message || e)); }
}
function removerFoto() { S.perfil.foto = 'none'; save(); render(); toast('Foto removida.'); }

function editarCodigo() {
  sheet(`<h2>Personalizar código</h2><p class="mu" style="margin:6px 0 14px">Seu link fica <b>${location.host}/?c=<span id="prev-cod">${esc(IND.codigo)}</span></b>. Use de 4 a 16 letras ou números.</p>
    <label class="f">Novo código<input id="novo-cod" value="${esc(IND.codigo)}" maxlength="16" autocapitalize="characters" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'');$('#prev-cod').textContent=this.value"></label>
    <p class="mu" style="margin-top:10px">⚠️ Links que você já enviou com o código antigo deixam de valer.</p>
    <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" id="salvar-cod">Salvar</button></div>`);
  $('#salvar-cod').onclick = async () => {
    const r = await fetch('/api/indicacao', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await tokenAtual() }, body: JSON.stringify({ novoCodigo: $('#novo-cod').value }) });
    const d = await r.json();
    if (!r.ok) return toast(d.error);
    IND.codigo = d.codigo; closeSheet(); render(); toast('Código atualizado!');
  };
}

function regrasSheet() {
  const r = S.perfil.regras || {};
  sheet(`<h2>Regras de aprovação</h2><p class="mu" style="margin:6px 0 14px">Cada faculdade tem a sua. Confira no regimento ou no plano de ensino.</p>
    <div class="fields"><div class="fields c2"><label class="f">Média para aprovar<input id="rg-m" inputmode="decimal" value="${esc(r.media ?? '6')}"></label><label class="f">Presença mínima (%)<input id="rg-p" inputmode="numeric" value="${esc(r.presenca ?? '75')}"></label></div>
    <label class="f">Recuperação a partir da média<input id="rg-r" inputmode="decimal" value="${esc(r.rec ?? '3')}"></label></div>
    <div class="chips" style="margin-top:12px">${[['6', '75', '3', 'Média 6 (padrão)'], ['7', '75', '4', 'Média 7'], ['5', '75', '3', 'Média 5'], ['6', '70', '3', 'Presença 70%']].map(([m, p, rc, l]) => `<button class="chip" onclick="$('#rg-m').value='${m}';$('#rg-p').value='${p}';$('#rg-r').value='${rc}'">${l}</button>`).join('')}</div>
    <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" onclick="salvarRegras()">Salvar</button></div>`);
}
function salvarRegras() {
  const m = num(val('rg-m')), p = num(val('rg-p')), r = num(val('rg-r'));
  if (m == null || m < 0 || m > 10 || p == null || p < 0 || p > 100 || r == null || r < 0 || r > m) return toast('Confira os valores (média 0–10, presença 0–100%).');
  S.perfil.regras = { media: String(m), presenca: String(p), rec: String(r) };
  closeSheet(); save(); render(); toast('Regras atualizadas.');
}

// ================= Curso e universidade =================
function linhaCurso(compacto) {
  const p = S.perfil, partes = [p.curso, p.universidade, p.fase ? p.fase + 'ª fase' : ''].filter(Boolean);
  if (!partes.length) return `<button class="curso-chip vazio" onclick="cursoSheet()">${ic('plus', 15)} Adicionar curso e universidade</button>`;
  return `<button class="curso-chip" onclick="cursoSheet()" aria-label="Editar curso e universidade">🎓 ${esc(partes.join(' · '))} <span class="mu">${ic('pen', 13)}</span></button>`;
}
function cursoSheet() {
  const p = S.perfil;
  sheet(`<h2>Seu curso</h2><p class="mu" style="margin:6px 0 14px">Aparece no início do app e ajuda a IA a entender seus documentos.</p>
    <div class="fields"><label class="f">Curso<input id="cs-c" value="${esc(p.curso || '')}" placeholder="Ex.: Engenharia Civil" autocomplete="off"></label>
    <label class="f">Universidade / faculdade<input id="cs-u" value="${esc(p.universidade || '')}" placeholder="Ex.: UFSC, USP, PUC-SP" autocomplete="off"></label>
    <label class="f">Fase / semestre atual<input id="cs-f" inputmode="numeric" value="${esc(p.fase || '')}" placeholder="Ex.: 5"></label></div>
    <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" onclick="salvarCurso()">Salvar</button></div>`);
}
function salvarCurso() {
  S.perfil.curso = val('cs-c'); S.perfil.universidade = val('cs-u'); S.perfil.fase = val('cs-f').replace(/\D/g, '').slice(0, 2);
  closeSheet(); save(); render(); toast('Curso salvo.');
}


// ================= Horas complementares =================
function resumoHoras() {
  const H = S.horas, porCat = {};
  for (const a of H.atividades) { const k = a.categoria || 'Outras'; porCat[k] = (porCat[k] || 0) + (num(a.horas) || 0); }
  const cats = [...H.categorias.map(c => c.nome), ...Object.keys(porCat).filter(k => !H.categorias.some(c => c.nome === k))];
  const linhas = cats.map(nome => { const c = H.categorias.find(x => x.nome === nome), lim = num(c?.limite), feitas = porCat[nome] || 0; return { nome, feitas, lim, contam: lim != null ? Math.min(feitas, lim) : feitas }; });
  const total = linhas.reduce((a, l) => a + l.contam, 0), meta = num(H.exigidas);
  return { linhas, total, meta, pct: meta ? Math.min(100, Math.round(total / meta * 100)) : 0, faltam: meta ? Math.max(0, meta - total) : null };
}
const fmtH = n => (Math.round(n * 10) / 10).toString().replace('.', ',') + 'h';
function cardHoras() {
  const r = resumoHoras();
  if (!r.meta && !S.horas.atividades.length) return `<a class="card tap row" href="#/horas" style="color:inherit;text-decoration:none"><span style="font-size:26px">🎓</span><div class="sp"><b>Horas complementares</b><div class="mu">Comece a contar seus certificados</div></div>${ic('right')}</a>`;
  return `<a class="card tap row" href="#/horas" style="color:inherit;text-decoration:none">${ring(r.pct, 'var(--menta)', r.meta ? r.pct + '%' : fmtH(r.total))}<div class="sp"><b>Horas complementares</b><div class="mu">${r.meta ? `${fmtH(r.total)} de ${fmtH(r.meta)} · faltam ${fmtH(r.faltam)}` : `${fmtH(r.total)} acumuladas`}</div></div>${ic('right')}</a>`;
}
V.horas = () => {
  const H = S.horas, r = resumoHoras();
  let html = `<div class="stack"><div class="pg-h"><div><p class="mu">Atividades extracurriculares do curso</p><h1>Horas complementares</h1></div>
    <div class="row wrap"><button class="btn" onclick="regrasHorasSheet()">${ic('gear', 18)} Regras do curso</button><label class="btn">${ic('up', 18)} Vários certificados<input type="file" accept="image/*,application/pdf" multiple hidden onchange="enviarVarios(this)"></label><button class="btn pr" onclick="atividadeSheet()">${ic('plus', 18)} Adicionar certificado</button></div></div>`;
  if (!r.meta) html += `<div class="card"><div class="row" style="align-items:flex-start"><span style="font-size:30px">📋</span><div class="sp"><b>Quantas horas o seu curso exige?</b><div class="mu" style="margin:4px 0 12px">Digite o total ou envie o currículo / regulamento de atividades complementares que a IA lê as categorias e os limites.</div>
      <div class="row wrap"><input id="hx" inputmode="numeric" placeholder="Ex.: 200" style="width:130px"><button class="btn" onclick="const v=num($('#hx').value);if(!v)return toast('Digite o total de horas.');S.horas.exigidas=String(v);save();render()">Salvar</button><label class="btn ghost">${ic('file', 18)} Enviar regulamento<input type="file" accept="image/*,application/pdf" hidden onchange="lerRegulamento(this)"></label></div></div></div></div>`;
  html += `<div class="grid two"><div class="card"><div class="row">${ring(r.pct, 'var(--menta)', r.meta ? r.pct + '%' : '—')}<div class="sp"><div class="mu">Horas que contam</div><div class="big">${fmtH(r.total)}${r.meta ? `<span class="mu" style="font-size:16px;font-weight:500"> / ${fmtH(r.meta)}</span>` : ''}</div>
      ${r.meta ? (r.faltam ? tag(`Faltam ${fmtH(r.faltam)}`, 'warn') : tag('Meta concluída 🎉', 'ok')) : '<span class="mu">Defina a meta do curso</span>'}</div></div></div>
    <div class="card"><h3 style="margin-bottom:10px">Por categoria</h3>${r.linhas.length ? `<div class="list">${r.linhas.map(l => `<div><div class="between"><b class="sm">${esc(l.nome)}</b><span class="sm">${fmtH(l.feitas)}${l.lim != null ? ` / máx. ${fmtH(l.lim)}` : ''}</span></div>
      ${l.lim != null ? `<div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, l.feitas / (l.lim || 1) * 100)}%;background:${l.feitas > l.lim ? 'var(--warn)' : 'var(--menta)'}"></i></div>${l.feitas > l.lim ? `<div class="mu" style="font-size:12px;margin-top:2px">${fmtH(l.feitas - l.lim)} acima do limite não contam</div>` : ''}` : ''}</div>`).join('')}</div>` : '<p class="mu">Nenhuma categoria ainda. Elas aparecem conforme você adiciona certificados ou configura as regras.</p>'}</div></div>`;
  const lista = [...H.atividades].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  html += `<div class="card"><div class="card-h"><h3 class="sp">Certificados e atividades (${lista.length})</h3><button class="btn ghost sm" onclick="atividadeSheet()">${ic('plus', 16)} Adicionar</button></div>
    ${lista.length ? `<div class="list">${lista.map(a => `<div class="row"><span class="kpi-ic" style="margin:0;color:var(--menta);background:color-mix(in srgb,var(--menta) 14%,transparent)">${ic(a.arquivo ? 'file' : 'clip', 18)}</span>
      <div class="sp" style="min-width:0"><b class="sm">${esc(a.titulo || 'Atividade')}</b><div class="mu">${[a.categoria, a.data ? brD(a.data) + '/' + a.data.slice(0, 4) : '', a.instituicao].filter(Boolean).map(esc).join(' · ')}</div></div>
      <b>${fmtH(num(a.horas) || 0)}</b>${a.arquivo ? `<button class="ib" aria-label="Ver certificado" onclick="verCertificado('${a.id}')">${ic('right', 18)}</button>` : ''}${pen(`atividadeSheet('${a.id}')`)}</div>`).join('')}</div>`
      : `<div class="empty" style="padding:16px"><p class="mu">Tire foto ou envie o PDF de um certificado. A IA preenche horas, data e instituição para você conferir.</p><div class="row wrap" style="justify-content:center"><button class="btn pr" onclick="atividadeSheet()">${ic('cam', 18)} Adicionar um certificado</button><label class="btn">${ic('up', 18)} Enviar vários de uma vez<input type="file" accept="image/*,application/pdf" multiple hidden onchange="enviarVarios(this)"></label></div></div>`}</div>
    ${H.obs ? `<p class="mu">📌 ${esc(H.obs)}</p>` : ''}</div>`;
  return html;
};
function regrasHorasSheet() {
  const H = S.horas;
  window._cats = structuredClone(H.categorias);
  sheet(`<h2>Regras do curso</h2><p class="mu" style="margin:6px 0 14px">Total exigido para se formar e o máximo que cada tipo de atividade pode contar.</p>
    <label class="f">Total de horas complementares exigidas<input id="rh-t" inputmode="numeric" value="${esc(H.exigidas)}" placeholder="Ex.: 200"></label>
    <div class="between" style="margin-top:14px"><b>Categorias</b><button class="btn ghost sm" onclick="_cats.push({id:uid(),nome:'',limite:''});catsRender()">${ic('plus', 16)} Categoria</button></div><div id="cats"></div>
    <label class="btn block" style="margin-top:14px">${ic('file', 18)} Preencher a partir do regulamento (IA)<input type="file" accept="image/*,application/pdf" hidden onchange="lerRegulamento(this)"></label>
    <div class="actions"><button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" onclick="salvarRegrasHoras()">Salvar</button></div>`);
  catsRender();
}
function catsRender() {
  $('#cats').innerHTML = _cats.map((c, i) => `<div class="row" style="margin-top:8px"><input placeholder="Ex.: Eventos" value="${esc(c.nome)}" oninput="_cats[${i}].nome=this.value"><input style="width:110px" inputmode="numeric" placeholder="máx. h" value="${esc(c.limite)}" oninput="_cats[${i}].limite=this.value"><button class="ib" aria-label="Remover" onclick="_cats.splice(${i},1);catsRender()">${ic('x', 18)}</button></div>`).join('') || '<p class="mu">Sem categorias: todas as horas contam no total.</p>';
}
function salvarRegrasHoras() {
  S.horas.exigidas = String(num(val('rh-t')) || '');
  S.horas.categorias = _cats.filter(c => c.nome.trim()).map(c => ({ id: c.id || uid(), nome: c.nome.trim(), limite: String(num(c.limite) ?? '') }));
  closeSheet(); save(); render(); toast('Regras salvas.');
}
async function arquivoParaEnvio(f) {
  if (f.type.startsWith('image/')) { const { data } = await comprimir(f); return { mediaType: 'image/jpeg', data, blob: await (await fetch('data:image/jpeg;base64,' + data)).blob(), ext: 'jpg' }; }
  if (f.type === 'application/pdf') { if (f.size > 3.3e6) throw new Error('PDF grande demais (máx. ~3 MB).'); return { mediaType: f.type, data: await b64(f), blob: f, ext: 'pdf' }; }
  throw new Error('Use uma foto ou um PDF.');
}
async function lerComIA(tipo, arq, semPopup) {
  if (!user) throw new Error('Entre com sua conta para usar a leitura com IA.');
  const r = await fetch('/api/horas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await tokenAtual() }, body: JSON.stringify({ tipo, arquivo: { mediaType: arq.mediaType, data: arq.data }, categorias: S.horas.categorias.map(c => c.nome) }) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 402 || r.status === 429) { if (semPopup) throw Object.assign(new Error(d.error || 'Limite de leituras atingido.'), { limite: true }); closeSheet(); exigirPremium(d.error); throw Object.assign(new Error(''), { silencioso: true }); }
  if (!r.ok) throw new Error(d.error || 'Não foi possível ler.');
  return d;
}
async function lerRegulamento(inp) {
  const f = inp.files[0]; inp.value = ''; if (!f) return;
  sheet(`<h2>Lendo o regulamento…</h2><div style="display:flex;justify-content:center;margin:20px 0"><div class="spin"></div></div><p class="mu" style="text-align:center">Isso leva alguns segundos.</p>`);
  try {
    const d = await lerComIA('regulamento', await arquivoParaEnvio(f));
    const cats = (d.categorias || []).filter(c => c.nome).map(c => ({ id: uid(), nome: c.nome, limite: c.limiteHoras ? String(num(c.limiteHoras) ?? '') : '' }));
    sheet(`<h2>Confira as regras encontradas</h2>
      ${d.curso || d.universidade ? `<p style="margin:10px 0 0"><b>Curso:</b> ${esc([d.curso, d.universidade].filter(Boolean).join(' · '))}</p>` : ''}
      <p style="margin:10px 0"><b>Total exigido:</b> ${d.horasExigidas ? esc(d.horasExigidas) + 'h' : 'não encontrado'}</p>
      ${cats.length ? `<div class="list">${cats.map(c => `<div class="between"><span>${esc(c.nome)}</span><span class="mu">${c.limite ? 'máx. ' + esc(c.limite) + 'h' : 'sem limite'}</span></div>`).join('')}</div>` : '<p class="mu">Nenhuma categoria encontrada.</p>'}
      ${d.observacoes ? `<p class="mu" style="margin-top:12px">📌 ${esc(d.observacoes)}</p>` : ''}
      <div class="actions"><button class="btn" onclick="closeSheet()">Descartar</button><button class="btn pr sp" id="ok-reg">Usar estas regras</button></div>`);
    $('#ok-reg').onclick = () => { if (d.curso && !S.perfil.curso) S.perfil.curso = d.curso; if (d.universidade && !S.perfil.universidade) S.perfil.universidade = d.universidade; if (d.horasExigidas) S.horas.exigidas = String(num(d.horasExigidas)); if (cats.length) S.horas.categorias = cats; S.horas.obs = d.observacoes || ''; closeSheet(); save(); render(); toast('Regras aplicadas. Você pode editar em "Regras do curso".'); };
  } catch (e) { if (!e.silencioso) { closeSheet(); toast(e.message); } }
}
let novoArq = null;
function atividadeSheet(id) {
  const a = id ? S.horas.atividades.find(x => x.id === id) : { titulo: '', categoria: '', horas: '', data: '', instituicao: '', arquivo: null };
  novoArq = null;
  const cats = [...new Set([...S.horas.categorias.map(c => c.nome), ...S.horas.atividades.map(x => x.categoria).filter(Boolean)])];
  sheet(`<h2>${id ? 'Editar atividade' : 'Adicionar certificado'}</h2>
    <label class="drop" style="display:block;padding:16px;margin:12px 0;cursor:pointer" id="cert-drop">${ic('cam', 22)}<div><b>${a.arquivo ? '📎 ' + esc(a.arquivo.nome) : 'Foto ou PDF do certificado'}</b></div><div class="mu" id="cert-st">${user ? 'A IA preenche os campos para você conferir' : 'Entre com uma conta para anexar e ler com IA'}</div>
      <input type="file" accept="image/*,application/pdf" hidden onchange="anexarCertificado(this)"></label>
    <div class="fields"><label class="f">Atividade<input id="at-t" value="${esc(a.titulo)}" placeholder="Ex.: Semana Acadêmica de Engenharia"></label>
      <div class="fields c2"><label class="f">Horas<input id="at-h" inputmode="decimal" value="${esc(a.horas)}" placeholder="Ex.: 20"></label><label class="f">Data<input id="at-d" type="date" value="${esc(a.data)}"></label></div>
      <label class="f">Categoria<input id="at-c" list="cats-l" value="${esc(a.categoria)}" placeholder="Ex.: Eventos"><datalist id="cats-l">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
      <label class="f">Instituição<input id="at-i" value="${esc(a.instituicao)}" placeholder="Quem emitiu o certificado"></label></div>
    <div class="actions">${id ? `<button class="btn danger" aria-label="Excluir" onclick="excluirAtividade('${id}')">${ic('trash', 18)}</button>` : ''}<button class="btn" onclick="closeSheet()">Cancelar</button><button class="btn pr sp" id="at-salvar" onclick="salvarAtividade('${id || ''}')">Salvar</button></div>`);
}
async function anexarCertificado(inp) {
  const f = inp.files[0]; inp.value = ''; if (!f) return;
  try {
    novoArq = { ...(await arquivoParaEnvio(f)), nome: f.name };
    $('#cert-drop b').textContent = '📎 ' + f.name;
    if (!user) return;
    $('#cert-st').innerHTML = '<span class="spin" style="width:18px;height:18px;display:inline-block;vertical-align:middle;border-width:2px"></span> Lendo o certificado…';
    const d = await lerComIA('certificado', novoArq);
    const set = (id, v) => { const el = $('#' + id); if (el && v && !el.value) el.value = v; };
    set('at-t', d.titulo); set('at-h', d.horas && String(num(d.horas) ?? '')); set('at-d', /^\d{4}-\d{2}-\d{2}$/.test(d.data) ? d.data : ''); set('at-c', d.categoria); set('at-i', d.instituicao);
    $('#cert-st').textContent = '✓ Campos preenchidos pela IA. Confira antes de salvar.';
  } catch (e) { if (!e.silencioso && $('#cert-st')) $('#cert-st').textContent = e.message; }
}
async function salvarAtividade(id) {
  const dados = { titulo: val('at-t'), horas: String(num(val('at-h')) ?? ''), data: val('at-d'), categoria: val('at-c'), instituicao: val('at-i') };
  if (!dados.titulo || !num(dados.horas)) return toast('Preencha a atividade e as horas.');
  const btn = $('#at-salvar'); btn.disabled = true; btn.textContent = 'Salvando…';
  const a = id ? S.horas.atividades.find(x => x.id === id) : { id: uid(), arquivo: null };
  try {
    if (novoArq && sb && user) {
      const path = `${user.id}/${a.id}.${novoArq.ext}`;
      const { error } = await sb.storage.from('certificados').upload(path, novoArq.blob, { upsert: true, contentType: novoArq.ext === 'pdf' ? 'application/pdf' : 'image/jpeg' });
      if (error) throw error;
      a.arquivo = { path, nome: novoArq.nome, tipo: novoArq.ext };
    }
  } catch (e) { btn.disabled = false; btn.textContent = 'Salvar'; return toast('Não foi possível enviar o certificado: ' + (e.message || e)); }
  Object.assign(a, dados);
  if (!id) S.horas.atividades.push(a);
  novoArq = null; closeSheet(); save(); render(); toast('Atividade salva.');
}
async function verCertificado(id) {
  const a = S.horas.atividades.find(x => x.id === id);
  if (!a?.arquivo || !sb) return;
  const w = window.open('', '_blank');
  const { data, error } = await sb.storage.from('certificados').createSignedUrl(a.arquivo.path, 600);
  if (error) { w?.close(); return toast('Não foi possível abrir o certificado.'); }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}
function excluirAtividade(id) {
  const a = S.horas.atividades.find(x => x.id === id);
  sheet(`<h2>Excluir atividade?</h2><p class="mu" style="margin:8px 0">"${esc(a.titulo)}"${a.arquivo ? ' e o certificado anexado serão apagados.' : ' será removida.'}</p>
    <div class="actions"><button class="btn" onclick="atividadeSheet('${id}')">Voltar</button><button class="btn pr sp" style="background:var(--bad);border-color:var(--bad)" id="ex-at">Excluir</button></div>`);
  $('#ex-at').onclick = async () => {
    if (a.arquivo && sb) await sb.storage.from('certificados').remove([a.arquivo.path]);
    S.horas.atividades = S.horas.atividades.filter(x => x.id !== id); closeSheet(); save(); render(); toast('Atividade excluída.');
  };
}

function confirmarApagar(id) {
  const c = ADM?.contas.find(x => x.id === id);
  if (!c || $('#adm-conf').value.trim().toLowerCase() !== String(c.email || '').toLowerCase()) return toast('O e-mail não confere.');
  admAcao(id, 'apagar');
}

function avatarFalhou(img) { const sp = document.createElement('span'); sp.className = 'avatar'; sp.style.cssText = `width:${img.style.width};height:${img.style.height}`; sp.textContent = img.dataset.i || '?'; img.replaceWith(sp); }


// ================= Vários certificados de uma vez =================
const MAX_LOTE = 10;
let LOTE = [], LOTE_AVISO = '';
async function enviarVarios(inp) {
  const files = [...inp.files]; inp.value = '';
  if (!files.length) return;
  if (files.length > MAX_LOTE) toast(`Enviando os primeiros ${MAX_LOTE} arquivos. Depois envie o restante.`);
  LOTE = [];
  let semIA = !user, avisoIA = '';
  const lista = files.slice(0, MAX_LOTE);
  sheet(`<h2>Lendo certificados…</h2><div style="display:flex;justify-content:center;margin:18px 0"><div class="spin"></div></div><p class="mu" style="text-align:center" id="lote-st">Preparando ${lista.length} arquivo(s)…</p>`);
  for (const [i, f] of lista.entries()) {
    const st = $('#lote-st'); if (st) st.textContent = `Lendo ${i + 1} de ${lista.length}: ${f.name}`;
    const item = { id: uid(), titulo: '', horas: '', data: '', categoria: '', instituicao: '', arq: null, nomeArq: f.name, erro: '', on: true };
    try { item.arq = { ...(await arquivoParaEnvio(f)), nome: f.name }; } catch (e) { item.erro = e.message; item.on = false; LOTE.push(item); continue; }
    if (!semIA) {
      try {
        const d = await lerComIA('certificado', item.arq, true);
        Object.assign(item, { titulo: d.titulo || '', horas: d.horas ? String(num(d.horas) ?? '') : '', data: /^\d{4}-\d{2}-\d{2}$/.test(d.data) ? d.data : '', categoria: d.categoria || '', instituicao: d.instituicao || '' });
      } catch (e) { if (e.limite) { semIA = true; avisoIA = e.message; } else item.erro = 'Não deu para ler: preencha à mão.'; }
    }
    if (!item.titulo) item.titulo = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    LOTE.push(item);
  }
  LOTE_AVISO = avisoIA || (!user ? 'Entre com uma conta para a IA preencher e para guardar os certificados.' : '');
  revisarLote();
}
function revisarLote() {
  const aviso = LOTE_AVISO;
  const cats = [...new Set([...S.horas.categorias.map(c => c.nome), ...S.horas.atividades.map(x => x.categoria).filter(Boolean)])];
  const sel = LOTE.filter(x => x.on).length, tot = LOTE.filter(x => x.on).reduce((a, x) => a + (num(x.horas) || 0), 0);
  sheet(`<h2>Conferir ${LOTE.length} certificado(s)</h2><p class="mu" style="margin:6px 0 12px">Ajuste o que precisar e desmarque o que não quiser salvar.</p>
    ${aviso ? `<div class="card flat" style="margin-bottom:12px;border-color:var(--warn)"><span class="sm">⚠️ ${esc(aviso)}</span></div>` : ''}
    <datalist id="cats-l">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <div class="lote">${LOTE.map((x, i) => `<div class="lote-item ${x.on ? '' : 'off'}">
      <label class="row" style="gap:10px"><input type="checkbox" ${x.on ? 'checked' : ''} ${x.arq ? '' : 'disabled'} onchange="LOTE[${i}].on=this.checked;revisarLote()"><span class="sm mu" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📎 ${esc(x.nomeArq)}</span></label>
      ${x.erro ? `<div class="mu" style="color:var(--bad);font-size:12px">${esc(x.erro)}</div>` : ''}
      <div class="fields" style="margin-top:8px"><input aria-label="Atividade" placeholder="Atividade" value="${esc(x.titulo)}" oninput="LOTE[${i}].titulo=this.value">
        <div class="fields c2"><input aria-label="Horas" inputmode="decimal" placeholder="Horas" value="${esc(x.horas)}" oninput="LOTE[${i}].horas=this.value;totLote()"><input aria-label="Data" type="date" value="${esc(x.data)}" oninput="LOTE[${i}].data=this.value"></div>
        <div class="fields c2"><input aria-label="Categoria" list="cats-l" placeholder="Categoria" value="${esc(x.categoria)}" oninput="LOTE[${i}].categoria=this.value"><input aria-label="Instituição" placeholder="Instituição" value="${esc(x.instituicao)}" oninput="LOTE[${i}].instituicao=this.value"></div></div></div>`).join('')}</div>
    <div class="actions"><button class="btn" onclick="LOTE=[];closeSheet()">Cancelar</button><button class="btn pr sp" id="lote-salvar" onclick="salvarLote()" ${sel ? '' : 'disabled'}>Salvar <span id="lote-tot">${sel} · ${fmtH(tot)}</span></button></div>`);
}
function totLote() { const sel = LOTE.filter(x => x.on), t = sel.reduce((a, x) => a + (num(x.horas) || 0), 0); const el = $('#lote-tot'); if (el) el.textContent = `${sel.length} · ${fmtH(t)}`; }
async function salvarLote() {
  const sel = LOTE.filter(x => x.on);
  const faltando = sel.filter(x => !x.titulo.trim() || !num(x.horas));
  if (faltando.length) return toast(`Preencha atividade e horas em ${faltando.length} certificado(s).`);
  const btn = $('#lote-salvar'); btn.disabled = true;
  let ok = 0, falhas = 0;
  for (const [i, x] of sel.entries()) {
    btn.textContent = `Salvando ${i + 1} de ${sel.length}…`;
    const at = { id: x.id, titulo: x.titulo.trim(), horas: String(num(x.horas)), data: x.data, categoria: x.categoria.trim(), instituicao: x.instituicao.trim(), arquivo: null };
    try {
      if (x.arq && sb && user) {
        const path = `${user.id}/${at.id}.${x.arq.ext}`;
        const { error } = await sb.storage.from('certificados').upload(path, x.arq.blob, { upsert: true, contentType: x.arq.ext === 'pdf' ? 'application/pdf' : 'image/jpeg' });
        if (error) throw error;
        at.arquivo = { path, nome: x.nomeArq, tipo: x.arq.ext };
      }
      S.horas.atividades.push(at); ok++;
    } catch { falhas++; }
  }
  LOTE = []; closeSheet(); save(); render();
  toast(falhas ? `${ok} salvo(s), ${falhas} com erro no envio do arquivo. Tente esses de novo.` : `${ok} certificado(s) salvo(s)! 🎉`);
}
