// v13-local-nocdn-cache - Network First para API, SEM CACHE para CDNs
const CACHE_NAME = 'kart-finance-cache-v13-local-nocdn'; 

const SUPABASE_API_HOST = 'xzjdtrqyscdieroflrhu.supabase.co'; 

// REMOVIDOS os CDNs desta lista!
const urlsToCache = [ '.', 'index.html', 'style.css', /*'site.webmanifest',*/ 'js/app.js', 'js/auth.js', 'js/db.js', 'js/ui.js', 'js/pdf.js', 'js/supabaseClient.js', /*'icons/...'*/ ];
const NEVER_CACHE_URLS = [ 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net' ];

self.addEventListener('install', event => {
    event.waitUntil( caches.open(CACHE_NAME).then(cache => { console.log(`Cache ${CACHE_NAME} instalando (sem CDNs)...`); return cache.addAll(urlsToCache).catch(err => { console.warn('Cache local falhou:', err); }); }) );
    self.skipWaiting(); 
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    // Ignora CDNs
    if (NEVER_CACHE_URLS.some(domain => requestUrl.hostname.includes(domain))) { event.respondWith(fetch(event.request)); return; }
    // Network-First para API
    if (requestUrl.hostname === SUPABASE_API_HOST) { 
        event.respondWith( fetch(event.request).then(netRes => { if(event.request.method === 'GET' && netRes.ok){ const resClone = netRes.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));} return netRes; }).catch(() => caches.match(event.request).then(cacheRes => cacheRes || Promise.reject('Offline'))) ); 
    } 
    // Cache-First para local
    else { 
         event.respondWith( caches.match(event.request).then(res => res || fetch(event.request).then(netRes => { if(netRes && netRes.ok && netRes.type !== 'opaque'){ const resClone = netRes.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));} return netRes; })) ); 
    }
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; 
    event.waitUntil( caches.keys().then(names => Promise.all( names.map(name => { if (cacheWhitelist.indexOf(name) === -1) { console.log(`[SW] Deletando cache antigo: ${name}`); return caches.delete(name); } }) )).then(() => { console.log(`[SW] Cache ${CACHE_NAME} ativado.`); return self.clients.claim(); }) );
});