const CACHE='mfl-s7-v7';
const CORE=['./','./index.html','./schedule.html','./points.html','./results.html','./teams.html','./about.html','./rules.html','./register.html','./status.html','./lottery.html','./share-result.html','./registration-dashboard.html','./volunteer.html','./poll.html','./manifest.webmanifest','./style.css','./script.js','./i18n.js','./config.js','./mfl-data.js','./assets/mfl-logo.webp','./assets/favicon-mfl.png','./assets/favicon-mfl-only.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;               // Google Apps Script, fonts etc. always go straight to the network
  const isImage=/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
  if(isImage){                                          // images: cache first, fast
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));
    return;
  }
  e.respondWith(fetch(req).then(res=>{                  // pages, scripts, styles, data: network first, so every update shows up; cache only used when offline
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
    return res;
  }).catch(()=>caches.match(req).then(hit=>hit||(req.mode==='navigate'?caches.match('./index.html'):undefined))));
});
