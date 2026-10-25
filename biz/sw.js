const C = 'biz-v8';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'logo-192.png', 'logo-180.png', 'catalog.js', 'modules.js', 'design.js'])).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('biz-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(q).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(q, cp)); } return r; }).catch(() => caches.match(q).then(r => r || caches.match('./'))));
});
