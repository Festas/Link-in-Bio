import * as API from './admin_api.js';
import * as UI from './admin_ui.js';

export function initProfile() {
    const form = document.getElementById('profile-form');
    const socialContainer = document.getElementById('social-inputs-container');

    // 1. Social Media Felder definieren und rendern
    // Jetzt mit klaren Placeholdern ("Benutzername" statt URL)
    const socialFields = [
        { id: 'youtube', label: 'YouTube', icon: 'youtube', placeholder: 'Benutzername' },
        { id: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'Benutzername' },
        { id: 'tiktok', label: 'TikTok', icon: 'music', placeholder: 'Benutzername' },
        { id: 'twitch', label: 'Twitch', icon: 'twitch', placeholder: 'Kanalname' },
        { id: 'x', label: 'X (Twitter)', icon: 'twitter', placeholder: 'Nutzername' },
        { id: 'discord', label: 'Discord', icon: 'discord', placeholder: 'Invite-Code' },
        { id: 'email', label: 'E-Mail', icon: 'mail', placeholder: 'deine@email.com' }
    ];
    UI.renderSocialFields(socialContainer, socialFields);

    // 2. Daten laden
    loadProfileSettings();

    // 3. Event Listener
    const pTheme = document.getElementById('profile-theme');
    if(pTheme) pTheme.addEventListener('change', () => toggleCustomThemeSettings(pTheme.value));

    setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
    setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');
    setupBackup();

    // 4. Save Handler
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('form-status');
            UI.setFormStatus(status, 'Speichere...', 'text-blue-400');
            
            const socialData = {}; 
            socialContainer.querySelectorAll('input').forEach(i => socialData[i.name] = i.value);

            const val = (id) => document.getElementById(id)?.value;
            const payload = {
                title: val('profile-title'), bio: val('profile-bio'),
                image_url: val('profile-image-url'), bg_image_url: val('profile-bg-url'),
                theme: val('profile-theme'), button_style: val('profile-button-style'),
                ...socialData,
                custom_bg_color: val('custom-bg-color'), custom_text_color: val('custom-text-color'),
                custom_button_color: val('custom-button-color'), custom_button_text_color: val('custom-button-text-color'),
                custom_html_head: val('custom-html-head'), custom_html_body: val('custom-html-body'),
            };

            try {
                await API.updateSettings(payload);
                UI.setFormStatus(status, 'Gespeichert!', 'text-green-400', 2000);
            } catch(e) { UI.setFormStatus(status, e.message, 'text-red-400', 5000); }
        });
    }
}

async function loadProfileSettings() {
    try {
        const s = await API.fetchSettings();
        
        // Helper
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        
        setVal('profile-title', s.title);
        setVal('profile-bio', s.bio);
        setVal('profile-image-url', s.image_url);
        setVal('profile-bg-url', s.bg_image_url);
        setVal('profile-theme', s.theme || 'theme-dark');
        setVal('profile-button-style', s.button_style || 'style-rounded');
        setVal('custom-html-head', s.custom_html_head);
        setVal('custom-html-body', s.custom_html_body);
        
        // Colors
        setVal('custom-bg-color', s.custom_bg_color || '#111827');
        setVal('custom-text-color', s.custom_text_color || '#F9FAFB');
        setVal('custom-button-color', s.custom_button_color || '#1F2937');
        setVal('custom-button-text-color', s.custom_button_text_color || '#FFFFFF');

        // Socials
        const container = document.getElementById('social-inputs-container');
        if (container) {
            container.querySelectorAll('input').forEach(i => {
                 if(s[i.name]) i.value = s[i.name];
            });
        }

        toggleCustomThemeSettings(s.theme);
        
        // WICHTIG: Styling anwenden, NACHDEM alles gerendert ist
        applyStyles();

    } catch(e) { console.error("Settings Load Error", e); }
}

function applyStyles() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Alle Inputs, Selects und Textareas im Formular selektieren
    // Auch input[type="color"], input[type="url"], etc.
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(el => {
        // Wir setzen die Klasse nur, wenn sie nicht schon da ist
        // UI.STYLES.input enthält die graue Hintergrundfarbe etc.
        if (!el.className.includes('bg-gray-700')) {
             el.className = UI.STYLES.input;
        }
        // Spezialfall für Color-Picker: Etwas anpassen
        if (el.type === 'color') {
            el.className = "h-10 w-full bg-transparent border border-gray-600 rounded cursor-pointer";
        }
    });

    // Button stylen
    const btn = form.querySelector('button[type="submit"]');
    if(btn) btn.className = UI.STYLES.btnPrimary + " mt-6 w-full";
}

function toggleCustomThemeSettings(theme) {
    const el = document.getElementById('custom-theme-settings');
    if(el) el.style.display = (theme === 'theme-custom') ? 'block' : 'none';
}

function setupImageUpload(btnId, fileId, textId) {
    const btn = document.getElementById(btnId); 
    const file = document.getElementById(fileId); 
    const text = document.getElementById(textId);
    if(!btn || !file || !text) return;
    
    btn.onclick = () => file.click();
    file.onchange = async () => {
        if(!file.files[0]) return;
        const fd = new FormData(); fd.append('file', file.files[0]); 
        const oldText = btn.textContent;
        btn.textContent = '...'; btn.disabled = true;
        try { 
            const res = await API.uploadImage(fd); 
            text.value = res.url; 
            btn.textContent = 'OK'; 
        } catch(e) { alert(e.message); }
        finally { btn.disabled = false; setTimeout(()=>btn.textContent=oldText, 1000); }
    };
}

function setupBackup() {
    const btn = document.getElementById('backup-button');
    if(!btn) return;
    btn.onclick = async () => {
        const st = document.getElementById('backup-status');
        if(st) st.textContent = 'Lade...';
        try {
            const r = await API.downloadBackup();
            const b = await r.blob();
            const u = window.URL.createObjectURL(b);
            const a = document.createElement('a'); a.style.display='none'; a.href=u; a.download=`backup_${Date.now()}.zip`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(u); a.remove();
            if(st) st.textContent = 'Fertig!';
        } catch(e) { if(st) st.textContent = 'Fehler'; }
    }
}
