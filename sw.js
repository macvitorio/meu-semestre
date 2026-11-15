const C = 'semestre-v2';
const FILES = ['./', 'index.html', 'app.js', 'parser.js', 'styles.css', 'manifest.json', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.startsWith('/api/') || !e.request.url.startsWith(self.location.origin) && !/cdn|fonts/.test(e.request.url)) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (e.request.method === 'GET' && res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return res;
  })));
});
