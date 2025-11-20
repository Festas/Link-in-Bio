const CACHE_NAME = 'linkbio-admin-v4'; // Version erhöht
const ASSETS_TO_CACHE = [
    '/admin',
    '/login',
    '/static/css/admin.css',
    '/static/vendor/tailwindcss.js',
    '/static/vendor/lucide.js',
    '/static/vendor/sortable.min.js',
    '/static/vendor/chart.js',
    '/static/js/utils.js',
    '/static/js/admin.js',
    '/static/js/admin_api.js',
    '/static/js/admin_ui.js',
    '/static/js/media.js',
    '/static/js/login.js',
    '/static/js/analytics.js',
    '/static/js/subscribers.js',
    '/static/js/inbox.js',
    '/static/js/consent.js'
];

self.addEventListener('install', (event) => {
    // Skip Waiting sorgt dafür, dass der neue SW sofort aktiv wird
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Sofortige Kontrolle über alle Tabs übernehmen
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Lösche alten Cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API-Aufrufe immer direkt durchlassen
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // STRATEGIE: Network First (Netzwerk zuerst, Fallback auf Cache)
    // Das ist besser für Entwicklung und Admin-Panels, da man immer die aktuelle Version will.
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Erfolgreiche Antwort -> Cache aktualisieren
                if (url.pathname.startsWith('/static/')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Netzwerkfehler -> Versuche Cache
                return caches.match(event.request);
            })
    );
});