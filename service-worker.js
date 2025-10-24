// ATUALIZADO: v9-dev-fix
const CACHE_NAME = 'kart-finance-cache-v9-dev-fix'; 
const urlsToCache = [
    // Caminhos relativos
    '.',
    'index.html',
    'style.css',
    // 'site.webmanifest', // COMENTADO POR ENQUANTO
    'js/app.js',
    'js/auth.js',
    'js/db.js',
    'js/ui.js',
    'js/pdf.js',
    'js/supabaseClient.js',
    // 'icons/icon-192x192.png',   // COMENTADO POR ENQUANTO
    // 'icons/apple-touch-icon.png', // COMENTADO POR ENQUANTO
    
    // CDNs
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 1. Instalação
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache (dev-fix) aberto e instalando...');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Falha ao adicionar URLs ao cache:', err);
                // Mesmo se falhar, não impede a instalação (para dev)
                // Em produção, você pode querer que a falha impeça a instalação.
            })
    );
});

// 2. Fetch: Cache-First
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (response) => {
                        if(!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }
                        var responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
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
                        console.log('Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName); 
                    }
                })
            );
        })
    );
});