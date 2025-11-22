// PWA Install Prompt Handler
let deferredPrompt;

export function initPWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registriert:', reg.scope))
                .catch(err => console.error('Service Worker Fehler:', err));
        });
    }

    // Handle PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show install button
        const installButton = document.getElementById('install-app-button');
        if (installButton) {
            installButton.style.display = 'flex';
        }
    });

    // Handle install button click
    const installButton = document.getElementById('install-app-button');
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) {
                // Check if already installed
                if (window.matchMedia('(display-mode: standalone)').matches) {
                    showInfoMessage('Die App ist bereits installiert!');
                } else {
                    showInfoMessage('Die App kann auf diesem Gerät oder Browser nicht installiert werden. Bitte verwenden Sie Chrome, Edge oder Safari auf iOS.');
                }
                return;
            }
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, can't use it again
            deferredPrompt = null;
            // Hide the install button
            installButton.style.display = 'none';
        });
    }

    // Detect if running as installed app
    window.addEventListener('appinstalled', () => {
        console.log('PWA wurde installiert');
        const installButton = document.getElementById('install-app-button');
        if (installButton) {
            installButton.style.display = 'none';
        }
    });

    // For iOS Safari: Show helpful message since beforeinstallprompt doesn't work
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
        // Show the install button with iOS-specific instructions
        const installButton = document.getElementById('install-app-button');
        if (installButton && !deferredPrompt) {
            installButton.style.display = 'flex';
            installButton.addEventListener('click', () => {
                showIOSInstallInstructions();
            });
        }
    }
}

function showIOSInstallInstructions() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="text-lg font-semibold">App auf iOS installieren</h3>
                <button class="text-gray-400 hover:text-white close-modal">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="padding: 1.5rem;">
                <p class="mb-4 text-gray-300">Um diese App auf Ihrem iPhone zu installieren:</p>
                <ol class="space-y-3 text-gray-300">
                    <li class="flex items-start">
                        <span class="inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-bold text-white bg-blue-600 rounded-full">1</span>
                        <span>Tippen Sie auf das <strong>Teilen-Symbol</strong> 
                        <svg class="inline w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .9 2 2z"/>
                        </svg> unten in Safari</span>
                    </li>
                    <li class="flex items-start">
                        <span class="inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-bold text-white bg-blue-600 rounded-full">2</span>
                        <span>Scrollen Sie runter und wählen Sie <strong>"Zum Home-Bildschirm"</strong></span>
                    </li>
                    <li class="flex items-start">
                        <span class="inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-bold text-white bg-blue-600 rounded-full">3</span>
                        <span>Tippen Sie auf <strong>"Hinzufügen"</strong></span>
                    </li>
                </ol>
                <p class="mt-4 text-sm text-gray-400">Die App wird dann wie eine native App auf Ihrem Home-Bildschirm erscheinen!</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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

function showInfoMessage(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-entry';
    infoDiv.textContent = message;
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        infoDiv.style.opacity = '0';
        infoDiv.style.transition = 'opacity 0.3s ease';
        setTimeout(() => infoDiv.remove(), 300);
    }, 3000);
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