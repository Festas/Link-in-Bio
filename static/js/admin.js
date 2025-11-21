import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { requireAuth, logout } from './utils.js';

// Helper für Fallback-Script-Loading
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
        document.querySelectorAll('.tab-button').forEach(b => {
             b.classList.toggle('border-blue-400', b.dataset.tab === tabName);
             b.classList.toggle('text-blue-400', b.dataset.tab === tabName);
             b.classList.toggle('border-transparent', b.dataset.tab !== tabName);
             b.classList.toggle('text-gray-400', b.dataset.tab !== tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.toggle('active', el.id === `tab-content-${tabName}`);
        });

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
    
    // Styling für das Profil-Formular
    document.querySelectorAll('#profile-form input[type="text"], #profile-form textarea, #profile-form select').forEach(el => el.className = UI.STYLES.input);
    const profileSubmitBtn = document.querySelector('#profile-form button[type="submit"]');
    if(profileSubmitBtn) profileSubmitBtn.className = UI.STYLES.btnPrimary;
    
    const backupBtn = document.getElementById('backup-button');
    if(backupBtn) backupBtn.className = UI.STYLES.btnSecondary;
    
    if(saveOrderButton) saveOrderButton.className = `${UI.STYLES.btnPrimary} w-auto`;

    // 8. Items laden und rendern
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
            
            // Gruppen für Dropdowns (Parent-Auswahl) filtern
            const groupItems = items.filter(i => ['slider_group', 'grid'].includes(i.item_type));
            
            // 1. IDs sammeln für Waisen-Check
            const allIds = new Set(items.map(i => i.id));
            
            // 2. Datenstruktur aufbereiten (Root vs. Kinder)
            const roots = []; 
            const childrenMap = {};
            
            items.forEach(i => {
                // Prüfen: Hat es einen Parent UND existiert dieser Parent noch?
                if(i.parent_id && allIds.has(i.parent_id)) { 
                    if(!childrenMap[i.parent_id]) childrenMap[i.parent_id] = [];
                    childrenMap[i.parent_id].push(i);
                } else { 
                    // Wenn Parent gelöscht wurde, wird das Item wieder Root (Waisen-Rettung)
                    roots.push(i); 
                }
            });

            // Sortieren
            roots.sort((a,b) => a.display_order - b.display_order);

            // 3. Rendern
            roots.forEach(item => {
                const rendered = UI.renderAdminItem(item, groupItems);
                listContainer.appendChild(rendered.itemEl);
                setupItemEvents(item, rendered);

                // Wenn es eine Gruppe ist, Kinder einfügen
                if (['slider_group', 'grid'].includes(item.item_type)) {
                    const childContainer = rendered.itemEl.querySelector('.child-container');
                    
                    if (childrenMap[item.id] && childrenMap[item.id].length > 0) {
                        childrenMap[item.id].sort((a,b) => a.display_order - b.display_order);
                        
                        // Placeholder ausblenden
                        const ph = childContainer.querySelector('.empty-placeholder');
                        if(ph) ph.style.display = 'none';

                        childrenMap[item.id].forEach(child => {
                            const childRendered = UI.renderAdminItem(child, groupItems);
                            childContainer.appendChild(childRendered.itemEl);
                            setupItemEvents(child, childRendered);
                        });
                    }
                }
            });
            
            // Drag & Drop initialisieren
            initSortable();
            
            // Icons rendern
            lucide.createIcons();
            
        } catch(e) {
            console.error(e);
            listLoadingSpinner.style.display = 'none';
            listContainer.innerHTML = `<p class="text-red-400 text-center">Fehler beim Laden: ${e.message}</p>`;
        }
    }

    // 9. Events für einzelne Items (Edit, Delete, Save, Upload, ToggleGroup)
    function setupItemEvents(item, { viewContainer, editContainer, itemEl }) {
        // Toggle für Gruppen (Akkordeon)
        const groupToggle = viewContainer.querySelector('.group-toggle');
        if (groupToggle) {
            groupToggle.onclick = (e) => {
                e.stopPropagation();
                const childContainer = itemEl.querySelector('.child-container');
                const icon = groupToggle.querySelector('svg');
                
                if (childContainer.style.display === 'none') {
                    childContainer.style.display = 'block';
                    if(icon) icon.style.transform = 'rotate(0deg)'; // Offen (Pfeil unten)
                } else {
                    childContainer.style.display = 'none';
                    if(icon) icon.style.transform = 'rotate(-90deg)'; // Zu (Pfeil rechts)
                }
            };
        }

        const btns = viewContainer.querySelectorAll('button');
        const toggleBtn = viewContainer.querySelector('.btn-toggle');
        const editBtn = viewContainer.querySelector('.btn-edit');
        const delBtn = viewContainer.querySelector('.btn-delete');
        
        if(editBtn) editBtn.onclick = () => { 
            viewContainer.style.display='none'; 
            editContainer.style.display='block'; 
            lucide.createIcons(); 
        };
        
        if(delBtn) delBtn.onclick = async () => { 
            if(confirm(`Löschen?`)) { 
                await API.deleteItem(item.id); 
                loadItems(); 
            } 
        };
        
        if(toggleBtn) toggleBtn.onclick = async () => { 
            await API.toggleItemVisibility(item.id); 
            loadItems(); 
        };
        
        const saveBtn = editContainer.querySelector('.btn-save-edit');
        const cancelBtn = editContainer.querySelector('.btn-cancel-edit');
        const uploadBtn = editContainer.querySelector('.btn-upload-image');

        if(cancelBtn) cancelBtn.onclick = () => { 
            editContainer.style.display='none'; 
            viewContainer.style.display='flex'; 
        };
        
        if(saveBtn) saveBtn.onclick = async () => {
            const payload = {};
            
            // Werte auslesen (sicherstellen, dass Elemente existieren)
            const titleIn = editContainer.querySelector('.edit-title'); if(titleIn) payload.title = titleIn.value;
            const urlIn = editContainer.querySelector('.edit-url'); if(urlIn) payload.url = urlIn.value;
            const imgIn = editContainer.querySelector('.edit-image-url'); if(imgIn) payload.image_url = imgIn.value;
            const priceIn = editContainer.querySelector('.edit-price'); if(priceIn) payload.price = priceIn.value;
            const parentIn = editContainer.querySelector('.edit-parent-id'); if(parentIn) payload.parent_id = parseInt(parentIn.value) || null;
            const featIn = editContainer.querySelector('.edit-is_featured'); if(featIn) payload.is_featured = featIn.checked;
            const affIn = editContainer.querySelector('.edit-is_affiliate'); if(affIn) payload.is_affiliate = affIn.checked;
            const dateIn = editContainer.querySelector('.edit-publish-on'); if(dateIn) payload.publish_on = dateIn.value ? new Date(dateIn.value).toISOString() : '';
            const expIn = editContainer.querySelector('.edit-expires-on'); if(expIn) payload.expires_on = expIn.value ? new Date(expIn.value).toISOString() : '';
            // NEU: Spaltenanzahl für Grids
            const gridIn = editContainer.querySelector('.edit-grid-columns'); if(gridIn) payload.grid_columns = parseInt(gridIn.value) || 2;
            
            try {
                await API.updateItem(item.id, payload);
                UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
                loadItems();
            } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400', 3000); }
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
                } catch(e) { status.textContent = 'Err'; alert(e.message); }
            };
        }
    }

    // 10. Drag & Drop (SortableJS) mit Deep Scan
    function initSortable() {
        sortableInstances.forEach(s => s.destroy());
        sortableInstances = [];

        const rootContainer = document.getElementById('manage-items-list');
        
        const config = {
            group: {
                name: 'nested',
                pull: true,
                put: (to, from, dragEl) => {
                    // Gruppen dürfen nicht in andere Gruppen gezogen werden
                    const type = dragEl.dataset.type;
                    const isGroup = ['slider_group', 'grid'].includes(type);
                    const isRootList = to.el.id === 'manage-items-list';
                    
                    if (isGroup && !isRootList) return false; // Gruppen nur im Root
                    return true;
                }
            },
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const itemEl = evt.item;
                const itemId = itemEl.dataset.id;
                
                // Wo liegt das Item jetzt?
                const newContainer = itemEl.closest('.child-container');
                let newParentId = null;

                if (newContainer) {
                    // Es liegt in einer Gruppe
                    newParentId = newContainer.dataset.parentId;
                    // Placeholder ausblenden
                    const ph = newContainer.querySelector('.empty-placeholder');
                    if(ph) ph.style.display = 'none';
                    
                    // AUTO-OPEN: Gruppe aufklappen
                    newContainer.style.display = 'block';
                    const groupCard = newContainer.closest('.admin-item-card');
                    const icon = groupCard?.querySelector('.group-toggle svg');
                    if(icon) icon.style.transform = 'rotate(0deg)';
                }

                // Parent Update sofort senden
                await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null });
                document.getElementById('save-order-button').style.display = 'block';
            }
        };

        if(rootContainer) sortableInstances.push(new Sortable(rootContainer, config));
        
        document.querySelectorAll('.child-container').forEach(el => {
            sortableInstances.push(new Sortable(el, config));
        });
    }

    // 11. Reihenfolge speichern (Deep Scan)
    document.getElementById('save-order-button').onclick = async () => {
        // Wir scannen ALLE Karten im DOM, egal wo sie sind (auch in Gruppen)
        const allCards = Array.from(document.querySelectorAll('.admin-item-card'));
        const ids = allCards.map(el => el.dataset.id);
        
        try {
            await API.reorderItems(ids);
            saveOrderButton.style.display = 'none';
            UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };

    // 12. Profil-Einstellungen
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
            
            pTitle.value = s.title || '';
            pBio.value = s.bio || '';
            pImg.value = s.image_url || '';
            if(pBg) pBg.value = s.bg_image_url || ''; 
            pTheme.value = s.theme || 'theme-dark';
            pStyle.value = s.button_style || 'style-rounded';
            
            if(cHead) cHead.value = s.custom_html_head || '';
            if(cBody) cBody.value = s.custom_html_body || '';
            
            socialFields.forEach(f => {
                const i = document.getElementById(`social-${f.id}`);
                if(i) i.value = s[`social_${f.id}`] || '';
            });
            
            cBg.value = s.custom_bg_color || '#111827';
            cText.value = s.custom_text_color || '#F9FAFB';
            cBtn.value = s.custom_button_color || '#1F2937';
            cBtnTxt.value = s.custom_button_text_color || '#FFFFFF';
            
            toggleCustomThemeSettings(s.theme);

        } catch(e) { UI.setFormStatus(formStatus, 'Fehler Settings', 'text-red-400'); }
    }

    function toggleCustomThemeSettings(theme) {
        const el = document.getElementById('custom-theme-settings');
        if(el) el.style.display = (theme === 'theme-custom') ? 'block' : 'none';
    }
    pTheme.addEventListener('change', () => toggleCustomThemeSettings(pTheme.value));

    function setupImageUpload(btnId, fileId, textId) {
        const btn = document.getElementById(btnId);
        const file = document.getElementById(fileId);
        const text = document.getElementById(textId);
        if(!btn || !file || !text) return;
        
        btn.onclick = () => file.click();
        file.onchange = async () => {
            if(!file.files[0]) return;
            const fd = new FormData(); fd.append('file', file.files[0]);
            btn.textContent = '...';
            try {
                const res = await API.uploadImage(fd);
                text.value = res.url;
                btn.textContent = 'OK';
            } catch(e) { btn.textContent = 'Err'; alert(e.message); }
        };
    }
    setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
    setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.setFormStatus(formStatus, 'Speichere...', 'text-blue-400');
        
        const socialData = {};
        socialFields.forEach(f => { 
            socialData[`social_${f.id}`] = document.getElementById(`social-${f.id}`).value; 
        });

        const payload = {
            title: pTitle.value,
            bio: pBio.value,
            image_url: pImg.value,
            bg_image_url: pBg ? pBg.value : '', 
            theme: pTheme.value,
            button_style: pStyle.value,
            ...socialData,
            custom_bg_color: cBg.value,
            custom_text_color: cText.value,
            custom_button_color: cBtn.value,
            custom_button_text_color: cBtnTxt.value,
            custom_html_head: cHead ? cHead.value : '',
            custom_html_body: cBody ? cBody.value : '',
        };

        try {
            await API.updateSettings(payload);
            UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400', 5000); }
    });
    
    const backupButton = document.getElementById('backup-button');
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

    // 13. Preview Modal
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

    // INITIAL START
    loadItems();
    loadProfileSettings();
}
