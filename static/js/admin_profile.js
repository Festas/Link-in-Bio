import * as API from './admin_api.js';
import * as UI from './admin_ui.js';

export function initProfile() {
    const profileForm = document.getElementById('profile-form');
    const formStatus = document.getElementById('form-status');
    const backupButton = document.getElementById('backup-button');

    if(!profileForm) return;

    // Felder laden
    loadProfileSettings();

    // Backup Logik
    if (backupButton) {
        backupButton.addEventListener('click', async () => {
            const status = document.getElementById('backup-status');
            status.textContent = 'Erstelle Backup...';
            status.className = 'text-sm text-blue-400';
            try {
                const response = await API.downloadBackup();
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
                const cd = response.headers.get('content-disposition');
                let fn = `backup_${Date.now()}.zip`;
                if (cd && cd.includes('filename=')) fn = cd.split('filename=')[1];
                a.download = fn; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
                status.textContent = 'Download gestartet!'; status.className = 'text-sm text-green-400';
            } catch (error) { status.textContent = 'Fehler!'; status.className = 'text-sm text-red-400'; }
        });
    }

    // Upload Helper
    setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
    setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');

    // Save Logic
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.setFormStatus(formStatus, 'Speichere...', 'text-blue-400');
        
        const socialData = {}; 
        document.getElementById('social-inputs-container').querySelectorAll('input').forEach(i => {
             socialData[i.name] = i.value;
        });

        const payload = {
            title: document.getElementById('profile-title').value,
            bio: document.getElementById('profile-bio').value,
            image_url: document.getElementById('profile-image-url').value,
            bg_image_url: document.getElementById('profile-bg-url').value,
            theme: document.getElementById('profile-theme').value,
            button_style: document.getElementById('profile-button-style').value,
            ...socialData,
            custom_bg_color: document.getElementById('custom-bg-color').value,
            custom_text_color: document.getElementById('custom-text-color').value,
            custom_button_color: document.getElementById('custom-button-color').value,
            custom_button_text_color: document.getElementById('custom-button-text-color').value,
            custom_html_head: document.getElementById('custom-html-head').value,
            custom_html_body: document.getElementById('custom-html-body').value,
        };

        try {
            await API.updateSettings(payload);
            UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400', 5000); }
    });
}

async function loadProfileSettings() {
    const formStatus = document.getElementById('form-status');
    try {
        const s = await API.fetchSettings();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        
        setVal('profile-title', s.title);
        setVal('profile-bio', s.bio);
        setVal('profile-image-url', s.image_url);
        setVal('profile-bg-url', s.bg_image_url);
        setVal('profile-theme', s.theme || 'theme-dark');
        setVal('profile-button-style', s.button_style || 'style-rounded');
        setVal('custom-html-head', s.custom_html_head);
        setVal('custom-html-body', s.custom_html_body);
        setVal('custom-bg-color', s.custom_bg_color || '#111827');
        setVal('custom-text-color', s.custom_text_color || '#F9FAFB');
        setVal('custom-button-color', s.custom_button_color || '#1F2937');
        setVal('custom-button-text-color', s.custom_button_text_color || '#FFFFFF');

        // Socials
        const socialContainer = document.getElementById('social-inputs-container');
        if (socialContainer) {
            socialContainer.querySelectorAll('input').forEach(i => {
                 const key = i.name; // social_youtube etc
                 if(s[key]) i.value = s[key];
            });
        }

        toggleCustomThemeSettings(s.theme);
    } catch(e) { UI.setFormStatus(formStatus, 'Fehler beim Laden der Settings', 'text-red-400'); }
}

function toggleCustomThemeSettings(theme) {
    const el = document.getElementById('custom-theme-settings');
    if(el) el.style.display = (theme === 'theme-custom') ? 'block' : 'none';
}

// Event Listener für Theme Change
const pTheme = document.getElementById('profile-theme');
if(pTheme) pTheme.addEventListener('change', () => toggleCustomThemeSettings(pTheme.value));

function setupImageUpload(btnId, fileId, textId) {
    const btn = document.getElementById(btnId); const file = document.getElementById(fileId); const text = document.getElementById(textId);
    if(!btn || !file || !text) return;
    btn.onclick = () => file.click();
    file.onchange = async () => {
        if(!file.files[0]) return;
        const fd = new FormData(); fd.append('file', file.files[0]); btn.textContent = '...';
        try { const res = await API.uploadImage(fd); text.value = res.url; btn.textContent = 'OK'; } 
        catch(e) { btn.textContent = 'Err'; alert(e.message); }
    };
}
