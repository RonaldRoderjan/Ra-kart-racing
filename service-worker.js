// v10-dev-fix3
const CACHE_NAME = 'kart-finance-cache-v10-dev-fix'; // Updated version
const urlsToCache = [
    // Caminhos relativos
    '.',
    'index.html',
    'style.css',
    // 'site.webmanifest', // Comentado para evitar erro
    'js/app.js',
    'js/auth.js',
    'js/db.js',
    'js/ui.js',
    'js/pdf.js',
    'js/supabaseClient.js',
    // 'icons/icon-192x192.png',   // Comentado para evitar erro
    // 'icons/apple-touch-icon.png', // Comentado para evitar erro
    
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
                console.log('Cache (dev-fix3) aberto e instalando...');
                // Try to cache all, but don't block install if one fails (for dev)
                return cache.addAll(urlsToCache).catch(err => {
                   console.warn('Alguns assets não puderam ser cacheados:', err);
                });
            })
    );
});

// 2. Fetch: Estratégia Cache-First, MAS IGNORA POST/PUT/DELETE etc.
self.addEventListener('fetch', event => {
    // IGNORA requisições que não são GET (como POST para login, API calls, etc.)
    if (event.request.method !== 'GET') {
        // Simplesmente busca da rede e não tenta cachear
        event.respondWith(fetch(event.request));
        return; 
    }

    // Para requisições GET, usa Cache-First
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se tiver no cache, retorna
                if (response) {
                    return response;
                }
                
                // Se não, busca na rede E salva no cache
                return fetch(event.request).then(
                    (response) => {
                        // Verifica se a resposta é válida antes de cachear
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