import * as API from './admin_api.js';
import * as UI from './admin_ui.js';

export function initProfile() {
    const profileForm = document.getElementById('profile-form');
    const formStatus = document.getElementById('form-status');
    const backupButton = document.getElementById('backup-button');
    const pTheme = document.getElementById('profile-theme');

    // 1. Felder laden beim Start
    loadProfileSettings();

    // 2. Event Listener für Theme-Wechsel (Custom Settings anzeigen)
    if(pTheme) {
        pTheme.addEventListener('change', () => toggleCustomThemeSettings(pTheme.value));
    }

    // 3. Backup Logik
    if (backupButton) {
        backupButton.addEventListener('click', async () => {
            const status = document.getElementById('backup-status');
            if(status) {
                status.textContent = 'Erstelle Backup...';
                status.className = 'text-sm text-blue-400';
            }
            
            try {
                const response = await API.downloadBackup();
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.style.display = 'none'; 
                a.href = url;
                
                const cd = response.headers.get('content-disposition');
                let fn = `backup_${Date.now()}.zip`;
                if (cd && cd.includes('filename=')) fn = cd.split('filename=')[1].replace(/"/g, '');
                
                a.download = fn; 
                document.body.appendChild(a); 
                a.click(); 
                window.URL.revokeObjectURL(url); 
                document.body.removeChild(a);
                
                if(status) {
                    status.textContent = 'Download gestartet!'; 
                    status.className = 'text-sm text-green-400';
                }
            } catch (error) { 
                if(status) {
                    status.textContent = 'Fehler beim Backup!'; 
                    status.className = 'text-sm text-red-400';
                }
                console.error(error);
            }
        });
    }

    // 4. Upload Helper für Profilbilder
    setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
    setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');

    // 5. Speichern Logik
    if(profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            UI.setFormStatus(formStatus, 'Speichere...', 'text-blue-400');
            
            // Social Inputs einsammeln (liegen im social-inputs-container)
            const socialData = {}; 
            const socialContainer = document.getElementById('social-inputs-container');
            if (socialContainer) {
                socialContainer.querySelectorAll('input').forEach(i => {
                    socialData[i.name] = i.value;
                });
            }

            // Helper zum sicheren Lesen von Werten
            const val = (id) => document.getElementById(id)?.value;

            const payload = {
                title: val('profile-title'),
                bio: val('profile-bio'),
                image_url: val('profile-image-url'),
                bg_image_url: val('profile-bg-url'),
                theme: val('profile-theme'),
                button_style: val('profile-button-style'),
                
                // Socials mergen
                ...socialData,
                
                // Custom Theme Colors
                custom_bg_color: val('custom-bg-color'),
                custom_text_color: val('custom-text-color'),
                custom_button_color: val('custom-button-color'),
                custom_button_text_color: val('custom-button-text-color'),
                
                // Pro Code Injection
                custom_html_head: val('custom-html-head'),
                custom_html_body: val('custom-html-body'),
            };

            try {
                await API.updateSettings(payload);
                UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
            } catch(e) { 
                UI.setFormStatus(formStatus, e.message, 'text-red-400', 5000); 
            }
        });
    }
}

async function loadProfileSettings() {
    const formStatus = document.getElementById('form-status');
    try {
        const s = await API.fetchSettings();
        
        // Helper zum Setzen von Werten
        const setVal = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.value = val || ''; 
        };
        
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

        // Socials befüllen
        const socialContainer = document.getElementById('social-inputs-container');
        if (socialContainer) {
            socialContainer.querySelectorAll('input').forEach(i => {
                 const key = i.name; // z.B. social_youtube
                 if(s[key]) i.value = s[key];
            });
        }

        // Custom Theme Einstellungen anzeigen/verstecken
        toggleCustomThemeSettings(s.theme);

    } catch(e) { 
        if(formStatus) UI.setFormStatus(formStatus, 'Fehler beim Laden der Settings', 'text-red-400'); 
    }
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
        
        const fd = new FormData(); 
        fd.append('file', file.files[0]); 
        const originalText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;
        
        try { 
            const res = await API.uploadImage(fd); 
            text.value = res.url; 
            btn.textContent = 'OK'; 
        } catch(e) { 
            btn.textContent = 'Err'; 
            alert(e.message); 
        } finally {
            btn.disabled = false;
            setTimeout(() => btn.textContent = originalText, 2000);
        }
    };
}
