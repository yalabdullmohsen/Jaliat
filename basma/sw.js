const C = 'basma-v25';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'logo-192.png', 'logo-180.png', 'logo-64.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).catch(() => {}));
});

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('basma-') && k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(q).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(q, cp)); }
    return r;
  }).catch(() => caches.match(q).then(r => r || caches.match('./'))));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'بصمة إنجاز', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'بصمة إنجاز', {
    body: d.body || '',
    tag: d.tag || 'basma',
    icon: 'logo-192.png',
    badge: 'logo-192.png',
    requireInteraction: true,
    renotify: true,
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url.includes('/basma/')) return c.focus();
    return self.clients.openWindow('./');
  }));
});
