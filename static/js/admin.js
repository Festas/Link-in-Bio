import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { requireAuth, logout } from './utils.js';

// Helper zum Nachladen von Skripten (Fallback)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

if (requireAuth()) {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
}

async function initializeAdminPanel() {
    
    // --- ROBUSTER LUCIDE CHECK & FALLBACK ---
    if (typeof lucide === 'undefined') {
        console.warn("Lucide nicht gefunden (lokale Datei evtl. defekt). Versuche CDN-Notfall-Ladung...");
        const listLoadingSpinner = document.getElementById('manage-list-loading');
        
        try {
            // Wir versuchen, die UMD-Version direkt vom CDN zu laden
            await loadScript('https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js');
            console.log("Lucide erfolgreich via CDN nachgeladen!");
        } catch (e) {
            console.error("SCHWERWIEGENDER FEHLER: Lucide konnte auch per CDN nicht geladen werden.");
            if (listLoadingSpinner) {
                listLoadingSpinner.innerHTML = '<p class="text-red-400 text-center">Kritischer Fehler: Icons konnten nicht geladen werden.<br>Bitte lösche die Datei static/vendor/lucide.js manuell.</p>';
            }
            return; // Abbruch
        }
    }
    // ----------------------------------------
    
    const formStatus = document.getElementById('form-status');
    const listContainer = document.getElementById('manage-items-list');
    const listLoadingSpinner = document.getElementById('manage-list-loading');
    const saveOrderButton = document.getElementById('save-order-button');

    let sortableInstance = null;
    let sliderGroups = [];

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

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
    
    const forms = ['add-link-form', 'add-header-form', 'add-slider-group-form', 'add-video-form', 'add-email-form', 'add-countdown-form', 'add-grid-form', 'add-faq-form', 'add-divider-form', 'add-testimonial-form', 'add-contact-form', 'add-product-form'];
    forms.forEach(id => {
        const form = document.getElementById(id);
        if (form) {
            form.querySelectorAll(`input`).forEach(el => el.className = UI.STYLES.input);
            form.querySelectorAll(`button`).forEach(el => el.className = UI.STYLES.btnPrimary);
        }
    });
    document.querySelectorAll('#profile-form input[type="text"], #profile-form textarea, #profile-form select').forEach(el => el.className = UI.STYLES.input);
    const profileSubmitBtn = document.querySelector('#profile-form button[type="submit"]');
    if(profileSubmitBtn) profileSubmitBtn.className = UI.STYLES.btnPrimary;
    
    const backupBtn = document.getElementById('backup-button');
    if(backupBtn) backupBtn.className = UI.STYLES.btnSecondary;
    
    if(saveOrderButton) saveOrderButton.className = `${UI.STYLES.btnPrimary} w-auto`;


    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    function switchTab(tabName) {
        tabButtons.forEach(button => {
            const isTarget = button.dataset.tab === tabName;
            button.classList.toggle('active', isTarget);
            button.classList.toggle('border-blue-400', isTarget);
            button.classList.toggle('text-blue-400', isTarget);
            button.classList.toggle('border-transparent', !isTarget);
            button.classList.toggle('text-gray-400', !isTarget);
            button.classList.toggle('hover:text-gray-200', !isTarget);
            button.classList.toggle('hover:border-gray-500', !isTarget);
        });
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-content-${tabName}`);
        });

        if (tabName === 'media') {
            initializeMediaManager();
        }
        if (tabName === 'community') {
            initializeSubscribers();
            initializeInbox();
        }
    }
    tabButtons.forEach(button => {
        if(button.dataset.tab) {
            button.addEventListener('click', () => switchTab(button.dataset.tab));
        }
    });
    
    const previewModal = document.getElementById('preview-modal');
    const previewButton = document.getElementById('preview-button');
    const previewCloseButton = document.getElementById('preview-close-button');
    const previewRefreshButton = document.getElementById('preview-refresh-button');
    const previewIframe = document.getElementById('preview-iframe');

    function showPreview() {
        previewIframe.src = `/?cache_bust=${new Date().getTime()}`;
        previewModal.classList.add('active');
    }
    function closePreview() {
        previewModal.classList.remove('active');
        previewIframe.src = 'about:blank';
    }
    function refreshPreview() {
        previewIframe.src = `/?cache_bust=${new Date().getTime()}`;
    }

    if(previewButton) previewButton.addEventListener('click', showPreview);
    if(previewCloseButton) previewCloseButton.addEventListener('click', closePreview);
    if(previewRefreshButton) previewRefreshButton.addEventListener('click', refreshPreview);
    if(previewModal) previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            closePreview();
        }
    });

    const profileForm = document.getElementById('profile-form');
    const profileTitle = document.getElementById('profile-title');
    const profileBio = document.getElementById('profile-bio');
    const profileImageUrl = document.getElementById('profile-image-url');
    const profileBgUrl = document.getElementById('profile-bg-url');
    const profileTheme = document.getElementById('profile-theme');
    const profileButtonStyle = document.getElementById('profile-button-style');
    
    const customThemeSettings = document.getElementById('custom-theme-settings');
    const customBgColor = document.getElementById('custom-bg-color');
    const customTextColor = document.getElementById('custom-text-color');
    const customButtonColor = document.getElementById('custom-button-color');
    const customButtonTextColor = document.getElementById('custom-button-text-color');
    
    const customHeadInput = document.getElementById('custom-html-head');
    const customBodyInput = document.getElementById('custom-html-body');

    async function loadProfileSettings() {
        try {
            const settings = await API.fetchSettings();
            
            profileTitle.value = settings.title || '';
            profileBio.value = settings.bio || '';
            profileImageUrl.value = settings.image_url || '';
            if(profileBgUrl) profileBgUrl.value = settings.bg_image_url || '';
            profileTheme.value = settings.theme || 'theme-dark';
            profileButtonStyle.value = settings.button_style || 'style-rounded';
            
            if(customHeadInput) customHeadInput.value = settings.custom_html_head || '';
            if(customBodyInput) customBodyInput.value = settings.custom_html_body || '';
            
            socialFields.forEach(field => {
                const input = document.getElementById(`social-${field.id}`);
                if(input) input.value = settings[`social_${field.id}`] || '';
            });
            
            customBgColor.value = settings.custom_bg_color || '#111827';
            customTextColor.value = settings.custom_text_color || '#F9FAFB';
            customButtonColor.value = settings.custom_button_color || '#1F2937';
            customButtonTextColor.value = settings.custom_button_text_color || '#FFFFFF';
            
            toggleCustomThemeSettings(settings.theme);

        } catch (error) {
            UI.setFormStatus(formStatus, `Fehler beim Laden: ${error.message}`, 'text-red-400');
        }
    }
    
    function toggleCustomThemeSettings(selectedTheme) {
        if (selectedTheme === 'theme-custom') {
            customThemeSettings.style.display = 'block';
        } else {
            customThemeSettings.style.display = 'none';
        }
    }
    profileTheme.addEventListener('change', () => toggleCustomThemeSettings(profileTheme.value));
    
    function setupImageUpload(btnId, fileInputId, textInputId) {
        const btn = document.getElementById(btnId);
        const fileInput = document.getElementById(fileInputId);
        const textInput = document.getElementById(textInputId);
        
        if(!btn || !fileInput || !textInput) return;
        
        btn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async () => {
            if (!fileInput.files[0]) return;
            
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            btn.textContent = '...';
            btn.disabled = true;
            
            try {
                const result = await API.uploadImage(formData);
                textInput.value = result.url;
                btn.textContent = 'OK';
            } catch (error) {
                btn.textContent = 'Fehler';
                alert("Upload fehlgeschlagen: " + error.message);
            } finally {
                btn.disabled = false;
                fileInput.value = ''; 
                setTimeout(() => btn.textContent = 'Upload', 2000);
            }
        });
    }
    
    setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
    setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.setFormStatus(formStatus, 'Speichere Profil...', 'text-blue-400');
        
        const socialData = {};
        socialFields.forEach(field => {
            socialData[`social_${field.id}`] = document.getElementById(`social-${field.id}`).value;
        });
        
        const payload = {
            title: profileTitle.value,
            bio: profileBio.value,
            image_url: profileImageUrl.value,
            bg_image_url: profileBgUrl ? profileBgUrl.value : '',
            theme: profileTheme.value,
            button_style: profileButtonStyle.value,
            ...socialData,
            custom_bg_color: customBgColor.value,
            custom_text_color: customTextColor.value,
            custom_button_color: customButtonColor.value,
            custom_button_text_color: customButtonTextColor.value,
            custom_html_head: customHeadInput ? customHeadInput.value : '',
            custom_html_body: customBodyInput ? customBodyInput.value : '',
        };

        try {
            await API.updateSettings(payload);
            UI.setFormStatus(formStatus, 'Profil gespeichert!', 'text-green-400', 3000);
        } catch (error) {
            UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
        }
    });
    
    const backupButton = document.getElementById('backup-button');
    const backupStatus = document.getElementById('backup-status');
    if (backupButton) {
        backupButton.addEventListener('click', async () => {
            backupStatus.textContent = 'Backup wird erstellt...';
            backupStatus.className = 'text-sm text-blue-400';
            try {
                const response = await API.downloadBackup();
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                const contentDisposition = response.headers.get('content-disposition');
                let filename = `linktree_backup_${new Date().toISOString()}.zip`;
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1];
                    }
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                backupStatus.textContent = 'Backup heruntergeladen!';
                backupStatus.className = 'text-sm text-green-400';
            } catch (error) {
                backupStatus.textContent = `Fehler: ${error.message}`;
                backupStatus.className = 'text-sm text-red-400';
            }
        });
    }

    async function handleFormSubmit(endpoint, payloadFactory, successMessage) {
        try {
            const payload = payloadFactory();
            if (payload === null) return;
            await API.createItem(endpoint, payload);
            UI.setFormStatus(formStatus, successMessage, 'text-green-400', 3000);
            fetchAndRenderAdminList();
        } catch (error) {
            UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
        }
    }

    document.getElementById('add-link-form').addEventListener('submit', (e) => { e.preventDefault(); const el = document.getElementById('link-url'); handleFormSubmit('/api/links', () => ({ url: el.value }), 'Link hinzugefügt!').then(() => el.value = ''); });
    document.getElementById('add-header-form').addEventListener('submit', (e) => { e.preventDefault(); const el = document.getElementById('header-title'); handleFormSubmit('/api/headers', () => ({ title: el.value }), 'Überschrift hinzugefügt!').then(() => el.value = ''); });
    document.getElementById('add-slider-group-form').addEventListener('submit', (e) => { e.preventDefault(); const el = document.getElementById('slider-group-title'); handleFormSubmit('/api/slider_groups', () => ({ title: el.value }), 'Slider hinzugefügt!').then(() => el.value = ''); });
    document.getElementById('add-video-form').addEventListener('submit', (e) => { e.preventDefault(); const el = document.getElementById('video-url'); handleFormSubmit('/api/videos', () => ({ url: el.value }), 'Video hinzugefügt!').then(() => el.value = ''); });
    document.getElementById('add-email-form').addEventListener('submit', (e) => { e.preventDefault(); const el = document.getElementById('email-form-title'); handleFormSubmit('/api/email_form', () => ({ title: el.value }), 'Formular hinzugefügt!').then(() => el.value = ''); });
    
    document.getElementById('add-countdown-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const t = document.getElementById('countdown-title');
        const d = document.getElementById('countdown-datetime');
        handleFormSubmit('/api/countdowns', () => ({ title: t.value, target_datetime: new Date(d.value).toISOString() }), 'Countdown hinzugefügt!').then(() => { t.value = ''; d.value = ''; });
    });

    document.getElementById('add-grid-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const el = document.getElementById('grid-title');
        handleFormSubmit('/api/grids', () => ({ title: el.value }), 'Grid hinzugefügt!').then(() => el.value = '');
    });

    document.getElementById('add-faq-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const el = document.getElementById('faq-title');
        handleFormSubmit('/api/faqs', () => ({ title: el.value }), 'Frage hinzugefügt!').then(() => el.value = '');
    });

    document.getElementById('add-divider-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const el = document.getElementById('divider-title');
        handleFormSubmit('/api/dividers', () => ({ title: el.value || '---' }), 'Trennlinie hinzugefügt!').then(() => el.value = '');
    });
    
    document.getElementById('add-testimonial-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('testimonial-name');
        const reviewText = prompt("Bitte gib den Text der Rezension ein:");
        if (reviewText) {
            handleFormSubmit('/api/testimonials', () => ({ name: name.value, text: reviewText }), 'Rezension hinzugefügt!').then(() => name.value = '');
        }
    });

    document.getElementById('add-contact-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const el = document.getElementById('contact-title');
        handleFormSubmit('/api/contact_form', () => ({ title: el.value }), 'Kontaktformular hinzugefügt!').then(() => el.value = '');
    });
    
    document.getElementById('add-product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('product-title');
        const price = document.getElementById('product-price');
        const url = document.getElementById('product-url');
        
        handleFormSubmit('/api/products', () => ({ 
            title: title.value, 
            price: price.value,
            url: url.value 
        }), 'Produkt hinzugefügt!').then(() => { 
            title.value = ''; 
            price.value = ''; 
            url.value = ''; 
        });
    });

    async function fetchAndRenderAdminList() {
        listLoadingSpinner.style.display = 'flex';
        listContainer.innerHTML = '';
        try {
            const items = await API.fetchItems();
            
            listLoadingSpinner.style.display = 'none';
            if (items.length === 0) {
                listContainer.innerHTML = '<p class="text-gray-400 text-center">Noch keine Items erstellt.</p>';
                return;
            }
            
            sliderGroups = items.filter(i => i.item_type === 'slider_group' || i.item_type === 'grid');
            
            const itemGroups = { root: [], children: {} };
            items.forEach(item => {
                if (item.parent_id) {
                    if (!itemGroups.children[item.parent_id]) {
                        itemGroups.children[item.parent_id] = [];
                    }
                    itemGroups.children[item.parent_id].push(item);
                    itemGroups.children[item.parent_id].sort((a, b) => a.display_order - b.display_order);
                } else {
                    itemGroups.root.push(item);
                }
            });
            
            itemGroups.root.forEach(item => {
                const rendered = UI.renderAdminItem(item, sliderGroups); 
                const itemEl = rendered.itemEl;
                listContainer.appendChild(itemEl);
                
                setupItemEvents(item, rendered);

                if ((item.item_type === 'slider_group' || item.item_type === 'grid') && itemGroups.children[item.id]) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'ml-6 border-l-2 border-gray-600 pl-4 space-y-2';
                    childrenContainer.dataset.parentId = item.id;
                    itemGroups.children[item.id].forEach(childItem => {
                        const childRendered = UI.renderAdminItem(childItem, sliderGroups);
                        childrenContainer.appendChild(childRendered.itemEl);
                        setupItemEvents(childItem, childRendered);
                    });
                    itemEl.appendChild(childrenContainer);
                }
            });
            
            initSortable();
            lucide.createIcons();
            
        } catch (error) {
            listLoadingSpinner.style.display = 'none';
            listContainer.innerHTML = `<p class="text-red-400 text-center">Fehler: ${error.message}</p>`;
        }
    }
    
    function setupItemEvents(item, { viewContainer, editContainer }) {
        const editButton = viewContainer.querySelector('.btn-edit');
        const cancelButton = editContainer.querySelector('.btn-cancel-edit');
        const saveButton = editContainer.querySelector('.btn-save-edit');
        const deleteButton = viewContainer.querySelector('.btn-delete');
        const toggleButton = viewContainer.querySelector('.btn-toggle');
        
        editButton.addEventListener('click', () => {
            viewContainer.style.display = 'none';
            editContainer.style.display = 'block';
            lucide.createIcons();
        });
        
        cancelButton.addEventListener('click', () => {
            editContainer.style.display = 'none';
            viewContainer.style.display = 'flex';
        });
        
        saveButton.addEventListener('click', async () => {
            const payload = {};
            const titleInput = editContainer.querySelector('.edit-title'); if(titleInput) payload.title = titleInput.value;
            const urlInput = editContainer.querySelector('.edit-url'); if(urlInput) payload.url = urlInput.value;
            const imgInput = editContainer.querySelector('.edit-image-url'); if(imgInput) payload.image_url = imgInput.value;
            const pInput = editContainer.querySelector('.edit-parent-id'); if(pInput) payload.parent_id = parseInt(pInput.value, 10) || null;
            const fInput = editContainer.querySelector('.edit-is_featured'); if(fInput) payload.is_featured = fInput.checked;
            const aInput = editContainer.querySelector('.edit-is_affiliate'); if(aInput) payload.is_affiliate = aInput.checked;
            const pubInput = editContainer.querySelector('.edit-publish-on'); if(pubInput) payload.publish_on = pubInput.value ? new Date(pubInput.value).toISOString() : '';
            const expInput = editContainer.querySelector('.edit-expires-on'); if(expInput) payload.expires_on = expInput.value ? new Date(expInput.value).toISOString() : '';
            const priceInput = editContainer.querySelector('.edit-price'); if(priceInput) payload.price = priceInput.value;

            try {
                await API.updateItem(item.id, payload);
                fetchAndRenderAdminList();
                UI.setFormStatus(formStatus, 'Item gespeichert!', 'text-green-400', 3000);
            } catch (error) {
                UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
            }
        });
        
        deleteButton.addEventListener('click', async () => {
            if (!confirm(`Soll "${item.title}" wirklich gelöscht werden?`)) return;
            try {
                await API.deleteItem(item.id);
                fetchAndRenderAdminList();
                UI.setFormStatus(formStatus, 'Item gelöscht!', 'text-green-400', 3000);
            } catch (error) {
                UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
            }
        });
        
        toggleButton.addEventListener('click', async () => {
            try {
                await API.toggleItemVisibility(item.id);
                fetchAndRenderAdminList();
                UI.setFormStatus(formStatus, 'Sichtbarkeit umgeschaltet!', 'text-green-400', 2000);
            } catch (error) {
                UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
            }
        });
        
        const uploadButton = editContainer.querySelector('.btn-upload-image');
        if (uploadButton) {
            uploadButton.addEventListener('click', async () => {
                const fileInput = editContainer.querySelector('.upload-image-file');
                const uploadStatus = editContainer.querySelector('.upload-status');
                if (!fileInput.files[0]) return;
                
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                uploadStatus.textContent = 'Lade hoch...';
                
                try {
                    const result = await API.uploadImage(formData);
                    const imgInput = editContainer.querySelector('.edit-image-url');
                    if (imgInput) imgInput.value = result.url;
                    uploadStatus.textContent = 'OK!';
                    fileInput.value = '';
                } catch (error) {
                    uploadStatus.textContent = 'Fehler!';
                }
            });
        }
    }
    
    function initSortable() {
        if (sortableInstance) sortableInstance.destroy();
        
        sortableInstance = new Sortable(listContainer, {
            group: 'root-items',
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            onStart: () => saveOrderButton.style.display = 'block',
            onEnd: (evt) => {
                 saveOrderButton.style.display = 'block';
                 if (evt.from !== evt.to && evt.to === listContainer) {
                     const itemId = evt.item.dataset.id;
                     updateItemParent(itemId, null);
                 }
            }
        });
        
        document.querySelectorAll('[data-parent-id]').forEach(container => {
            new Sortable(container, {
                group: {
                    name: 'child-items',
                    put: ['child-items', 'root-items']
                },
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                onStart: () => saveOrderButton.style.display = 'block',
                onEnd: (evt) => {
                    saveOrderButton.style.display = 'block';
                    
                    const newParentEl = evt.to.closest('[data-parent-id]');
                    const newParentId = newParentEl ? newParentEl.dataset.parentId : null;
                    const itemId = evt.item.dataset.id;

                    updateItemParent(itemId, newParentId);
                }
            });
        });
    }
    
    saveOrderButton.addEventListener('click', async () => {
        const ids = Array.from(listContainer.children).map(el => el.dataset.id).filter(id => id); 
        try {
            await API.reorderItems(ids);
            saveOrderButton.style.display = 'none';
            UI.setFormStatus(formStatus, 'Reihenfolge gespeichert!', 'text-green-400', 2000);
            fetchAndRenderAdminList();
        } catch (error) {
            UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
        }
    });
    
    async function updateItemParent(itemId, parentId) {
        try {
            await API.updateItem(itemId, { parent_id: parentId ? parseInt(parentId, 10) : null });
            UI.setFormStatus(formStatus, 'Gruppe aktualisiert!', 'text-green-400', 1000);
            fetchAndRenderAdminList(); 
        } catch (error) {
            UI.setFormStatus(formStatus, `Fehler: ${error.message}`, 'text-red-400', 5000);
            fetchAndRenderAdminList();
        }
    }

    fetchAndRenderAdminList();
    loadProfileSettings();
    lucide.createIcons();
}