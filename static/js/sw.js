const CACHE_NAME = 'linkbio-admin-v5'; // Version erhöht für enhanced offline support
const OFFLINE_URL = '/offline.html';
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
    '/static/js/consent.js',
    '/static/js/logger.js'
];

// Queue for failed requests to retry when online
let failedRequestsQueue = [];

// Serialize request for storage
function serializeRequest(request) {
    return {
        url: request.url,
        method: request.method,
        headers: [...request.headers.entries()],
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer
    };
}

// Notify all clients about offline status
function notifyClients(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}

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

    // API-Aufrufe: Network first with offline queue for mutations
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event.request));
        return;
    }

    // STRATEGIE: Network First (Netzwerk zuerst, Fallback auf Cache)
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
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // Notify client about offline status
                    notifyClients({ type: 'OFFLINE', url: event.request.url });
                    
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL).then(offlinePage => {
                            if (offlinePage) {
                                return offlinePage;
                            }
                            // Generate a basic offline response
                            return new Response(
                                generateOfflineHtml(),
                                { headers: { 'Content-Type': 'text/html' } }
                            );
                        });
                    }
                    
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Handle API requests with offline support
async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        // Successful - notify clients we're back online
        notifyClients({ type: 'ONLINE' });
        return response;
    } catch (error) {
        // Notify client about offline status
        notifyClients({ type: 'OFFLINE', url: request.url });
        
        // For GET requests, try to return cached data
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // For mutation requests (POST, PUT, DELETE), queue for retry
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
            const serialized = serializeRequest(request);
            failedRequestsQueue.push({
                request: serialized,
                timestamp: Date.now()
            });
            
            // Notify client that request was queued
            notifyClients({
                type: 'REQUEST_QUEUED',
                url: request.url,
                method: request.method,
                queueLength: failedRequestsQueue.length
            });
            
            // Return a response indicating the request was queued
            return new Response(
                JSON.stringify({
                    queued: true,
                    message: 'Request queued for retry when online'
                }),
                {
                    status: 202,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        return new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Listen for online event to retry queued requests
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RETRY_QUEUED') {
        retryQueuedRequests();
    }
    
    if (event.data && event.data.type === 'GET_QUEUE_STATUS') {
        event.ports[0].postMessage({
            queueLength: failedRequestsQueue.length,
            requests: failedRequestsQueue.map(r => ({
                url: r.request.url,
                method: r.request.method,
                timestamp: r.timestamp
            }))
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_QUEUE') {
        failedRequestsQueue = [];
        notifyClients({ type: 'QUEUE_CLEARED' });
    }
});

// Retry all queued requests
async function retryQueuedRequests() {
    if (failedRequestsQueue.length === 0) return;
    
    const queue = [...failedRequestsQueue];
    failedRequestsQueue = [];
    
    for (const item of queue) {
        try {
            const request = new Request(item.request.url, {
                method: item.request.method,
                headers: item.request.headers,
                mode: item.request.mode,
                credentials: item.request.credentials
            });
            
            await fetch(request);
            notifyClients({
                type: 'REQUEST_RETRIED',
                url: item.request.url,
                success: true
            });
        } catch (error) {
            // Re-queue the failed request
            failedRequestsQueue.push(item);
            notifyClients({
                type: 'REQUEST_RETRIED',
                url: item.request.url,
                success: false
            });
        }
    }
    
    notifyClients({
        type: 'RETRY_COMPLETE',
        remaining: failedRequestsQueue.length
    });
}

// Generate offline HTML page
function generateOfflineHtml() {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Link-in-Bio</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 400px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 24px;
            opacity: 0.8;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #00d9ff;
        }
        p {
            color: #9ca3af;
            margin-bottom: 24px;
            line-height: 1.6;
        }
        .retry-btn {
            background: linear-gradient(135deg, #00d9ff 0%, #7c3aed 100%);
            border: none;
            padding: 12px 32px;
            color: #fff;
            font-size: 16px;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .retry-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 20px rgba(0, 217, 255, 0.4);
        }
        .status {
            margin-top: 24px;
            font-size: 14px;
            color: #6b7280;
        }
        .queue-info {
            margin-top: 16px;
            padding: 12px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>Keine Internetverbindung</h1>
        <p>Sie sind derzeit offline. Einige Funktionen sind möglicherweise nicht verfügbar.</p>
        <button class="retry-btn" onclick="retryConnection()">
            Erneut versuchen
        </button>
        <div class="status" id="status">
            Warten auf Verbindung...
        </div>
        <div class="queue-info" id="queue-info" style="display:none;">
            <span id="queue-count">0</span> Anfrage(n) warten auf Synchronisation
        </div>
    </div>
    <script>
        function retryConnection() {
            document.getElementById('status').textContent = 'Verbindung wird geprüft...';
            fetch('/health')
                .then(() => window.location.reload())
                .catch(() => {
                    document.getElementById('status').textContent = 'Noch offline. Bitte versuchen Sie es später.';
                });
        }
        
        // Listen for online event
        window.addEventListener('online', () => {
            document.getElementById('status').textContent = 'Verbindung wiederhergestellt!';
            setTimeout(() => window.location.reload(), 1000);
        });
        
        // Check queue status
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                if (event.data.queueLength > 0) {
                    document.getElementById('queue-info').style.display = 'block';
                    document.getElementById('queue-count').textContent = event.data.queueLength;
                }
            };
            navigator.serviceWorker.controller.postMessage(
                { type: 'GET_QUEUE_STATUS' },
                [channel.port2]
            );
        }
    </script>
</body>
</html>`;
}