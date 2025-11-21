import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import * as UI from './admin_ui.js';
import { logout } from './utils.js';

// Helper für Fallback-Script-Loading
async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

export async function initCore() {
    // 1. Lucide Check & Fallback
    if (typeof lucide === 'undefined') {
        console.warn("Lucide lokal fehlt. Versuche CDN...");
        try {
            await loadScript('https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js');
        } catch(e) {
            console.error("Kritischer Fehler: Lucide konnte nicht geladen werden.");
            return;
        }
    }

    // 2. Logout Listener
    document.getElementById('logout-button')?.addEventListener('click', logout);

    // 3. Tab-Navigation
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 4. QR-Code Modal
    setupQRModal();

    // 5. Preview Modal
    setupPreviewModal();
    
    // 6. Social Media Felder rendern (gehört zum Core-Layout)
    const socialContainer = document.getElementById('social-inputs-container');
    const socialFields = [
        { id: 'youtube', label: 'YouTube', icon: 'youtube', placeholder: 'https://youtube.com/...' },
        { id: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/...' },
        { id: 'tiktok', label: 'TikTok', icon: 'tiktok', placeholder: 'https://tiktok.com/@...' },
        { id: 'twitch', label: 'Twitch', icon: 'twitch', placeholder: 'https://twitch.tv/...' },
        { id: 'x', label: 'X (Twitter)', icon: 'twitter', placeholder: 'https://x.com/...' },
        { id: 'discord', label: 'Discord', icon: 'discord', placeholder: 'https://discord.gg/...' },
        { id: 'email', label: 'E-Mail', icon: 'mail', placeholder: 'mailto:deine@email.com' }
    ];
    UI.renderSocialFields(socialContainer, socialFields);
}

function switchTab(tabName) {
    // Buttons stylen
    document.querySelectorAll('.tab-button').forEach(b => {
            const isActive = b.dataset.tab === tabName;
            b.classList.toggle('border-blue-400', isActive);
            b.classList.toggle('text-blue-400', isActive);
            b.classList.toggle('border-transparent', !isActive);
            b.classList.toggle('text-gray-400', !isActive);
    });
    
    // Content umschalten
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `tab-content-${tabName}`);
    });

    // Module initialisieren (Lazy Load)
    if (tabName === 'media') initializeMediaManager();
    if (tabName === 'community') {
        initializeSubscribers();
        initializeInbox();
    }
}

function setupQRModal() {
    const qrButton = document.getElementById('qrcode-button');
    const qrModal = document.getElementById('qrcode-modal');
    const qrImage = document.getElementById('qrcode-image');

    if (qrButton) {
        qrButton.addEventListener('click', () => {
            const qrUrl = `/api/qrcode?t=${new Date().getTime()}`;
            qrImage.src = qrUrl;
            qrModal.style.display = 'flex';
        });
    }
    if (qrModal) {
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) qrModal.style.display = 'none';
        });
    }
}

function setupPreviewModal() {
    const previewModal = document.getElementById('preview-modal');
    const previewBtn = document.getElementById('preview-button');
    const refreshBtn = document.getElementById('preview-refresh-button');
    const closeBtn = document.getElementById('preview-close-button');
    const iframe = document.getElementById('preview-iframe');

    function showPreview() {
        iframe.src = `/?t=${Date.now()}`;
        previewModal.classList.add('active');
    }
    if(previewBtn) previewBtn.onclick = showPreview;
    if(closeBtn) closeBtn.onclick = () => { previewModal.classList.remove('active'); iframe.src = 'about:blank'; };
    if(refreshBtn) refreshBtn.onclick = () => { iframe.src = `/?t=${Date.now()}`; };
    if(previewModal) previewModal.onclick = (e) => { if(e.target === previewModal) closeBtn.click(); };
}
