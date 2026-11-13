const C='jaliyat-v249';
/* الصفحة تُفتح فوراً من نسخة الإصدار المحفوظة، وتُحدَّث بالخلفية؛ رفع رقم C عند كل نشر يُحمّل الإصدار الجديد ويعيد تحميل النوافذ المفتوحة (add17). */
const PRE=['./','manifest.webmanifest','icon-v2-192.png','favicon-32.png','brand/brand.js','brand/ui.css'];
/* مكتبات خارجية بإصدار ثابت وخطوط: لا تتغير، فتُقرأ من الكاش مباشرة */
const FIXED=/^https:\/\/(cdn\.jsdelivr\.net\/npm\/[^/]+@\d|cdnjs\.cloudflare\.com\/ajax\/libs\/[^/]+\/\d|fonts\.gstatic\.com\/)/;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(PRE.map(u=>fetch(new Request(u,{cache:'reload'})).then(r=>r.ok&&c.put(u,r)).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const q=e.request,u=new URL(q.url);if(q.method!=='GET')return;
  const put=(k,r)=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(C).then(c=>c.put(k,cp))}return r};
  if(u.origin!==location.origin){
    if(FIXED.test(q.url))e.respondWith(caches.match(q).then(h=>h||fetch(q).then(r=>put(q,r))));
    else if(u.hostname==='fonts.googleapis.com')e.respondWith(caches.match(q).then(h=>{const n=fetch(q).then(r=>put(q,r)).catch(()=>h);return h||n}));
    return}
  if(/\/(index\.html)?$/.test(u.pathname)){
    const net=fetch(q,{cache:'no-store'}).then(r=>put('./',r));
    e.respondWith(caches.match('./').then(h=>h?(e.waitUntil(net.catch(()=>{})),h):net.catch(()=>caches.match('./'))));return}
  /* البوابة وصفحات التحقق والخطيب: الشبكة أولاً (يستعملها أشخاص من خارج النظام)، والكاش عند انقطاعها */
  if(q.mode==='navigate'){e.respondWith(fetch(q,{cache:'no-store'}).then(r=>put(q,r)).catch(()=>caches.match(q,{ignoreSearch:true})));return}
  e.respondWith(caches.match(q).then(hit=>{const n=fetch(q).then(r=>put(q,r)).catch(()=>hit);return hit||n}))});
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={title:'إنجاز',body:e.data&&e.data.text()}}e.waitUntil(self.registration.showNotification(d.title||'إنجاز',{body:d.body||'',icon:'icon-v2-192.png',badge:'icon-v2-192.png',dir:'rtl',lang:'ar',tag:d.tag||undefined,renotify:true,data:{link:d.link||''}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const link=(e.notification.data&&e.notification.data.link)||'';const pg=/^[a-z]+\.html/.test(link);const url=new URL('./'+(link&&(link[0]==='#'||pg)?link:''),self.registration.scope).href;e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if(pg?c.url.includes(link):c.url.startsWith(self.registration.scope)&&!/^(portal|verify|sermon)\.html/.test(c.url.slice(self.registration.scope.length))){c.focus();if(!pg)c.postMessage({type:'open',link});return}}return self.clients.openWindow(url)}))});
