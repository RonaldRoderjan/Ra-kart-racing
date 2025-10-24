const CACHE_NAME = 'kart-finance-cache-v4'; // ATUALIZADO: Versão 4
// Lista de arquivos para cachear na instalação
const urlsToCache = [
    '.', 
    'index.html',
    'style.css',
    'site.webmanifest', // ATUALIZADO: Novo nome do manifest
    'js/app.js',
    'js/auth.js',
    'js/db.js',
    'js/ui.js',
    'js/pdf.js',
    'js/supabaseClient.js',
    'icons/icon-192x192.png',
    'icons/apple-touch-icon.png',
    // CDNs não mudam
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 1. Instalação: Abre o cache e armazena os assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache v4 aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Fetch: Tenta a rede primeiro, depois o cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

// 3. Ativação: Limpa caches antigos (v1, v2, v3)
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Agora v4
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Deleta caches antigos
                    }
                })
            );
        })
    );
});