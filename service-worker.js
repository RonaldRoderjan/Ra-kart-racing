const CACHE_NAME = 'kart-finance-cache-v2'; // Versão do cache atualizada
// Lista de arquivos para cachear na instalação
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/js/app.js',
    '/js/auth.js',
    '/js/db.js',
    '/js/ui.js',
    '/js/pdf.js',
    '/js/supabaseClient.js', // ADICIONADO
    '/icons/icon-192x192.png',
    '/icons/apple-touch-icon.png',
    // CDNs
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' // ADICIONADO
];

// 1. Instalação: Abre o cache e armazena os assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Fetch: Intercepta requisições e serve do cache primeiro (Network falling back to cache)
// Estratégia atualizada para PWA que fala com API: Tenta a rede primeiro.
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            // Se a rede falhar (offline), tenta pegar do cache
            return caches.match(event.request);
        })
    );
});

// 3. Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});