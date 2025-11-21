import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { organizeItems, getSortableConfig, isGroup } from './groups.js';
import { requireAuth, logout } from './utils.js';

// Helper für Fallback-Script-Loading (z.B. Lucide)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// Authentifizierungs-Check beim Laden
if (requireAuth()) {
    document.addEventListener('DOMContentLoaded', initAdmin);
}

async function initAdmin() {
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

    // 2. Globale DOM Elemente
    const formStatus = document.getElementById('form-status');
    const listContainer = document.getElementById('manage-items-list');
    const listLoadingSpinner = document.getElementById('manage-list-loading');
    const saveOrderButton = document.getElementById('save-order-button');
    let sortableInstances = []; // Speichert alle aktiven Sortable-Instanzen

    // 3. Event Listener: Logout
    document.getElementById('logout-button')?.addEventListener('click', logout);

    // 4. Tab-Navigation
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

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

    // 5. QR-Code Modal
    const qrButton = document.getElementById('qrcode-button');
    const qrModal = document.getElementById('qrcode-modal');
    const qrImage = document.getElementById('qrcode-image');
    const qrDownload = document.getElementById('qrcode-download');

    if (qrButton) {
        qrButton.addEventListener('click', () => {
            const qrUrl = `/api/qrcode?t=${new Date().getTime()}`;
            qrImage.src = qrUrl;
            qrDownload.href = qrUrl;
            qrModal.style.display = 'flex';
        });
    }
    if (qrModal) {
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) qrModal.style.display = 'none';
        });
    }

    // 6. Social Media Felder rendern
    const socialInputsContainer = document.getElementById('social-inputs-container');
    const socialFields = [
        { id: 'youtube', label: 'YouTube', icon: 'youtube', placeholder: 'https://youtube.com/...' },
        { id: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/...' },
        { id: 'tiktok', label: 'TikTok', icon: 'music-4', placeholder: 'https://tiktok.com/@...' },
        { id: 'twitch', label: 'Twitch', icon: 'twitch', placeholder: 'https://twitch.tv/...' },
        { id: 'x', label: 'X (Twitter)', icon: 'twitter', placeholder: 'https://x.com/...' },
        { id: 'discord', label: 'Discord', icon: 'discord', placeholder: 'https://discord.gg/...' },
        { id: 'email', label: 'E-Mail', icon: 'mail', placeholder: 'mailto:deine@email.com' }
    ];
    UI.renderSocialFields(socialInputsContainer, socialFields);

    // 7. Generische Formular-Handler (Items erstellen)
    const forms = [
        {id: 'add-link-form', api: '/api/links', data: (e) => ({url: e.target.querySelector('input').value})},
        {id: 'add-video-form', api: '/api/videos', data: (e) => ({url: e.target.querySelector('input').value})},
        {id: 'add-header-form', api: '/api/headers', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-slider-group-form', api: '/api/slider_groups', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-grid-form', api: '/api/grids', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-faq-form', api: '/api/faqs', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-divider-form', api: '/api/dividers', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-contact-form', api: '/api/contact_form', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-email-form', api: '/api/email_form', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-testimonial-form', api: '/api/testimonials', data: (e) => ({name: e.target.querySelector('#testimonial-name').value, text: prompt("Bitte gib den Text der Rezension ein:")})},
        {id: 'add-product-form', api: '/api/products', data: (e) => ({
            title: e.target.querySelector('#product-title').value, 
            price: e.target.querySelector('#product-price').value, 
            url: e.target.querySelector('#product-url').value
        })},
        {id: 'add-countdown-form', api: '/api/countdowns', data: (e) => ({
            title: e.target.querySelector('#countdown-title').value, 
            target_datetime: new Date(e.target.querySelector('#countdown-datetime').value).toISOString()
        })}
    ];

    forms.forEach(f => {
        const form = document.getElementById(f.id);
        if (form) {
            // Styling anwenden
            form.querySelectorAll('input').forEach(i => i.className = UI.STYLES.input);
            form.querySelectorAll('button').forEach(b => b.className = UI.STYLES.btnPrimary);
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const payload = f.data(e);
                    // Abbrechen, wenn Prompt (z.B. bei Testimonial) abgebrochen wurde
                    if(!payload || (payload.text === null)) return; 

                    await API.createItem(f.api, payload);
                    UI.setFormStatus(formStatus, 'Hinzugefügt!', 'text-green-400', 2000);
                    loadItems();
                    e.target.reset();
                } catch(err) {
                    UI.setFormStatus(formStatus, err.message, 'text-red-400', 5000);
                }
            });
        }
    });

    // 8. Items laden und rendern (Verwendet groups.js Logic)
    async function loadItems() {
        listLoadingSpinner.style.display = 'flex';
        listContainer.innerHTML = '';
        
        try {
            const items = await API.fetchItems();
            listLoadingSpinner.style.display = 'none';
            
            if (items.length === 0) {
                listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Noch keine Items erstellt.</p>';
                return;
            }
            
            // Gruppen für Dropdowns filtern
            const groupItems = items.filter(i => isGroup(i));
            
            // Datenstruktur sicher organisieren (Waisen retten!)
            const { roots, childrenMap } = organizeItems(items);

            // Rendern
            roots.forEach(rootItem => {
                const rendered = UI.renderAdminItem(rootItem, groupItems);
                listContainer.appendChild(rendered.itemEl);
                setupItemEvents(rootItem, rendered);

                // Wenn es eine Gruppe ist, Kinder einfügen
                if (isGroup(rootItem)) {
                    const childContainer = rendered.childrenContainer;
                    const childList = childrenMap[String(rootItem.id)]; // Sicherer String-Key

                    if (childList && childList.length > 0) {
                        // Placeholder ausblenden
                        const ph = childContainer.querySelector('.empty-placeholder');
                        if(ph) ph.style.display = 'none';

                        // Kinder rendern
                        childList.forEach(childItem => {
                            const childRendered = UI.renderAdminItem(childItem, groupItems);
                            childContainer.appendChild(childRendered.itemEl);
                            setupItemEvents(childItem, childRendered);
                        });
                    }
                }
            });
            
            initSortable();
            lucide.createIcons();
            
        } catch(e) {
            console.error(e);
            listLoadingSpinner.style.display = 'none';
            listContainer.innerHTML = `<p class="text-red-400 text-center">Fehler beim Laden: ${e.message}</p>`;
        }
    }
    
    function setupItemEvents(item, { viewContainer, editContainer, childrenContainer }) {
        // Toggle für Gruppen (Akkordeon)
        const groupToggle = viewContainer.querySelector('.group-toggle');
        if (groupToggle && childrenContainer) {
            groupToggle.onclick = (e) => {
                e.stopPropagation();
                const icon = groupToggle.querySelector('svg');
                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    if(icon) icon.style.transform = 'rotate(0deg)'; // Pfeil unten
                } else {
                    childrenContainer.style.display = 'none';
                    if(icon) icon.style.transform = 'rotate(-90deg)'; // Pfeil rechts
                }
            };
        }

        const editBtn = viewContainer.querySelector('.btn-edit');
        const delBtn = viewContainer.querySelector('.btn-delete');
        const toggleVisBtn = viewContainer.querySelector('.btn-toggle');
        
        if(editBtn) editBtn.onclick = () => { 
            viewContainer.style.display='none'; editContainer.style.display='block'; lucide.createIcons(); 
        };
        if(delBtn) delBtn.onclick = async () => { 
            if(confirm('Löschen?')) { await API.deleteItem(item.id); loadItems(); } 
        };
        if(toggleVisBtn) toggleVisBtn.onclick = async () => { 
            await API.toggleItemVisibility(item.id); loadItems(); 
        };
        
        const saveBtn = editContainer.querySelector('.btn-save-edit');
        const cancelBtn = editContainer.querySelector('.btn-cancel-edit');
        const uploadBtn = editContainer.querySelector('.btn-upload-image');

        if(cancelBtn) cancelBtn.onclick = () => { 
            editContainer.style.display='none'; viewContainer.style.display='flex'; 
        };
        
        if(saveBtn) saveBtn.onclick = async () => {
            const getVal = (sel) => editContainer.querySelector(sel)?.value;
            const getChk = (sel) => editContainer.querySelector(sel)?.checked;

            const payload = { 
                title: getVal('.edit-title'),
                url: getVal('.edit-url'),
                image_url: getVal('.edit-image-url'),
                price: getVal('.edit-price'),
                is_featured: getChk('.edit-is_featured'),
                is_affiliate: getChk('.edit-is_affiliate'),
            };
            
            const pId = parseInt(getVal('.edit-parent-id'));
            if (!isNaN(pId)) payload.parent_id = pId === 0 ? null : pId;
            
            const cols = parseInt(getVal('.edit-grid-columns'));
            if (!isNaN(cols)) payload.grid_columns = cols;
            
            // Datum sicher formatieren
            const dateIn = editContainer.querySelector('.edit-publish-on');
            if(dateIn) payload.publish_on = dateIn.value ? new Date(dateIn.value).toISOString() : '';
            
            const expIn = editContainer.querySelector('.edit-expires-on');
            if(expIn) payload.expires_on = expIn.value ? new Date(expIn.value).toISOString() : '';

            try {
                await API.updateItem(item.id, payload);
                UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 1000);
                loadItems();
            } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
        };
        
        if(uploadBtn) {
            uploadBtn.onclick = async () => {
                const fileInput = editContainer.querySelector('.upload-image-file');
                const status = editContainer.querySelector('.upload-status');
                const file = fileInput.files[0];
                if(!file) return;
                status.textContent = '...';
                const formData = new FormData(); formData.append('file', file);
                try {
                    const res = await API.uploadImage(formData);
                    editContainer.querySelector('.edit-image-url').value = res.url;
                    status.textContent = 'OK';
                    status.className = 'upload-status text-xs text-green-400';
                } catch(e) { 
                    status.textContent = 'Fehler'; 
                    status.className = 'upload-status text-xs text-red-400';
                    alert("Upload Fehler: " + e.message); 
                }
            };
        }
    }

    // --- DRAG & DROP (Mit Config aus groups.js) ---
    function initSortable() {
        sortableInstances.forEach(s => s.destroy());
        sortableInstances = [];

        const rootContainer = document.getElementById('manage-items-list');
        
        // Hole Konfiguration aus groups.js
        // onMove Callback: Aktualisiert die Parent ID sofort in der Datenbank
        // onReorder Callback: Zeigt den "Reihenfolge Speichern" Button
        const config = UI.getSortableConfig(
            async (itemId, newParentId) => {
                await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null });
            },
            () => {
                document.getElementById('save-order-button').style.display = 'block';
            },
            'manage-items-list' // ID des Root-Containers für Checks
        );

        if(rootContainer) sortableInstances.push(new Sortable(rootContainer, config));
        
        document.querySelectorAll('.child-container').forEach(el => {
            sortableInstances.push(new Sortable(el, config));
        });
    }

    // Reihenfolge speichern
    document.getElementById('save-order-button').onclick = async () => {
        // Deep Scan: Alle IDs in visueller Reihenfolge sammeln
        const allIds = Array.from(document.querySelectorAll('.admin-item-card'))
                           .map(el => el.dataset.id);
        
        try {
            await API.reorderItems(allIds);
            saveOrderButton.style.display = 'none';
            UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };

    // --- Profil-Einstellungen ---
    const profileForm = document.getElementById('profile-form');
    const pTitle = document.getElementById('profile-title');
    const pBio = document.getElementById('profile-bio');
    const pImg = document.getElementById('profile-image-url');
    const pBg = document.getElementById('profile-bg-url'); 
    const pTheme = document.getElementById('profile-theme');
    const pStyle = document.getElementById('profile-button-style');
    const cBg = document.getElementById('custom-bg-color');
    const cText = document.getElementById('custom-text-color');
    const cBtn = document.getElementById('custom-button-color');
    const cBtnTxt = document.getElementById('custom-button-text-color');
    const cHead = document.getElementById('custom-html-head');
    const cBody = document.getElementById('custom-html-body');

    async function loadProfileSettings() {
        try {
            const s = await API.fetchSettings();
            pTitle.value = s.title || ''; pBio.value = s.bio || ''; pImg.value = s.image_url || '';
            if(pBg) pBg.value = s.bg_image_url || ''; 
            pTheme.value = s.theme || 'theme-dark'; pStyle.value = s.button_style || 'style-rounded';
            if(cHead) cHead.value = s.custom_html_head || ''; if(cBody) cBody.value = s.custom_html_body || '';
            socialFields.forEach(f => { const i = document.getElementById(`social-${f.id}`); if(i) i.value = s[`social_${f.id}`] || ''; });
            cBg.value = s.custom_bg_color || '#111827'; cText.value = s.custom_text_color || '#F9FAFB'; cBtn.value = s.custom_button_color || '#1F2937'; cBtnTxt.value = s.custom_button_text_color || '#FFFFFF';
            toggleCustomThemeSettings(s.theme);
        } catch(e) { UI.setFormStatus(formStatus, 'Fehler Settings', 'text-red-400'); }
    }

    function toggleCustomThemeSettings(theme) {
        const el = document.getElementById('custom-theme-settings');
        if(el) el.style.display = (theme === 'theme-custom') ? 'block' : 'none';
    }
    pTheme.addEventListener('change', () => toggleCustomThemeSettings(pTheme.value));

    function setupImageUpload(btnId, fileId, textId) {
        const btn = document.getElementById(btnId); const file = document.getElementById(fileId); const text = document.getElementById(textId);
        if(!btn || !file || !text) return;
        btn.onclick = () => file.click();
        file.onchange = async () => {
            if(!file.files[0]) return;
            const fd = new FormData(); fd.append('file', file.files[0]); btn.textContent = '...';
            try { const res = await API.uploadImage(fd); text.value = res.url; btn.textContent = 'OK'; } catch(e) { btn.textContent = 'Err'; alert(e.message); }
        };
    }
    setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
    setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.setFormStatus(formStatus, 'Speichere...', 'text-blue-400');
        const socialData = {}; socialFields.forEach(f => { socialData[`social_${f.id}`] = document.getElementById(`social-${f.id}`).value; });
        const payload = {
            title: pTitle.value, bio: pBio.value, image_url: pImg.value, bg_image_url: pBg ? pBg.value : '', 
            theme: pTheme.value, button_style: pStyle.value, ...socialData,
            custom_bg_color: cBg.value, custom_text_color: cText.value, custom_button_color: cBtn.value, custom_button_text_color: cBtnTxt.value,
            custom_html_head: cHead ? cHead.value : '', custom_html_body: cBody ? cBody.value : '',
        };
        try { await API.updateSettings(payload); UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000); } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400', 5000); }
    });

    // INITIAL START
    loadItems();
    loadProfileSettings();
}
