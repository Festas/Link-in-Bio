export function initPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registriert:', reg.scope))
                .catch(err => console.error('Service Worker Fehler:', err));
        });
    }
}

export function initCookieConsent() {
    const CONSENT_KEY = 'linkbio_consent';
    
    if (localStorage.getItem(CONSENT_KEY)) {
        if (localStorage.getItem(CONSENT_KEY) === 'granted') {
            activateTrackingScripts();
        }
        return;
    }

    const banner = document.createElement('div');
    banner.className = 'fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 md:p-6 z-50 animate-entry glass-card';
    banner.innerHTML = `
        <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-sm text-gray-300">
                <p class="font-bold text-white mb-1">Wir nutzen Cookies 🍪</p>
                <p>Wir verwenden optionale Skripte für Analysen und externe Inhalte. Dürfen wir diese aktivieren?</p>
            </div>
            <div class="flex gap-3 w-full md:w-auto">
                <button id="btn-decline" class="flex-1 md:flex-none px-4 py-2 border border-gray-600 rounded-md text-sm text-gray-300 hover:bg-gray-800 transition-colors">Ablehnen</button>
                <button id="btn-accept" class="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg">Akzeptieren</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(banner);

    const btnAccept = document.getElementById('btn-accept');
    const btnDecline = document.getElementById('btn-decline');

    if (btnAccept) {
        btnAccept.addEventListener('click', () => {
            localStorage.setItem(CONSENT_KEY, 'granted');
            activateTrackingScripts();
            banner.remove();
        });
    }

    if (btnDecline) {
        btnDecline.addEventListener('click', () => {
            localStorage.setItem(CONSENT_KEY, 'denied');
            banner.remove();
        });
    }
}

function activateTrackingScripts() {
    const scripts = document.querySelectorAll('script[type="text/plain"][data-consent="tracking"]');
    
    scripts.forEach(script => {
        const newScript = document.createElement('script');
        Array.from(script.attributes).forEach(attr => {
            if (attr.name !== 'type' && attr.name !== 'data-consent') {
                newScript.setAttribute(attr.name, attr.value);
            }
        });
        newScript.innerHTML = script.innerHTML;
        script.parentNode.replaceChild(newScript, script);
    });
}