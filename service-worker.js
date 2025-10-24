const CACHE_NAME = 'kart-finance-cache-v3'; // Incrementamos a versão para forçar a atualização
// Lista de arquivos para cachear na instalação
const urlsToCache = [
    '.', // Significa 'o diretório atual' (substitui '/')
    'index.html',
    'style.css',
    'manifest.json',
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
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Fetch: Tenta a rede primeiro, depois o cache (para apps que usam API)
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
    const cacheWhitelist = [CACHE_NAME]; // Agora v3
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Deleta caches v1 e v2
                    }
                })
            );
        })
    );
});