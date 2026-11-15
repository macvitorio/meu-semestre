// Service worker: app shell offline (rede primeiro, cache como reserva) + notificações push
const C = 'semestre-v6';
const SHELL = ['/', '/index.html', '/limpeza.js', '/app.js', '/parser.js', '/styles.css', '/manifest.json', '/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))); });
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return;
  const mesmoSite = url.origin === self.location.origin;
  if (!mesmoSite && !/cdn|fonts|cloudflare/.test(url.hostname)) return;
  // Arquivos do app: rede primeiro (sempre a versão mais nova), cache se offline. CDNs: cache primeiro.
  e.respondWith(mesmoSite
    ? fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
        .catch(async () => (await caches.match(e.request)) || (e.request.mode === 'navigate' ? caches.match('/index.html') : Response.error()))
    : caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return res; })));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'Meu Semestre', body: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Meu Semestre', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: d.tag || 'semestre', data: { url: d.url || '/#/inicio' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = abertos.find(w => new URL(w.url).origin === self.location.origin);
    if (c) { await c.focus(); return c.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
