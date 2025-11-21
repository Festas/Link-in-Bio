import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
// NEU: Importiere Gruppen-Logik
import { organizeItems, getSortableConfig, isGroup } from './groups.js';
import { requireAuth, logout } from './utils.js';

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script'); s.src = src;
        s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
}

if (requireAuth()) { document.addEventListener('DOMContentLoaded', initAdmin); }

async function initAdmin() {
    // Lucide Check
    if (typeof lucide === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js'); } 
        catch(e) { console.error("Lucide Fail"); return; }
    }

    const formStatus = document.getElementById('form-status');
    const listContainer = document.getElementById('manage-items-list');
    const listLoadingSpinner = document.getElementById('manage-list-loading');
    const saveOrderButton = document.getElementById('save-order-button');
    let sortableInstances = []; 

    document.getElementById('logout-button')?.addEventListener('click', logout);

    // --- Tabs ---
    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    function switchTab(tabName) {
        document.querySelectorAll('.tab-button').forEach(b => {
             b.classList.toggle('border-blue-400', b.dataset.tab === tabName);
             b.classList.toggle('text-blue-400', b.dataset.tab === tabName);
             b.classList.toggle('border-transparent', b.dataset.tab !== tabName);
        });
        document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-content-${tabName}`));
        if (tabName === 'media') initializeMediaManager();
        if (tabName === 'community') { initializeSubscribers(); initializeInbox(); }
    }

    // --- Forms ---
    const socialContainer = document.getElementById('social-inputs-container');
    const socialFields = [ { id: 'youtube', label: 'YouTube', icon: 'youtube', placeholder: '...' }, { id: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: '...' }, { id: 'tiktok', label: 'TikTok', icon: 'music-4', placeholder: '...' }, { id: 'twitch', label: 'Twitch', icon: 'twitch', placeholder: '...' }, { id: 'x', label: 'X', icon: 'twitter', placeholder: '...' }, { id: 'discord', label: 'Discord', icon: 'discord', placeholder: '...' }, { id: 'email', label: 'E-Mail', icon: 'mail', placeholder: '...' } ];
    UI.renderSocialFields(socialContainer, socialFields);

    const forms = ['add-link-form', 'add-header-form', 'add-slider-group-form', 'add-video-form', 'add-email-form', 'add-countdown-form', 'add-grid-form', 'add-faq-form', 'add-divider-form', 'add-testimonial-form', 'add-contact-form', 'add-product-form'];
    forms.forEach(id => {
        const f = document.getElementById(id);
        if (f) {
            f.querySelectorAll('input').forEach(i => i.className = UI.STYLES.input);
            f.querySelectorAll('button').forEach(b => b.className = UI.STYLES.btnPrimary);
            f.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    let payload = null;
                    // Simple Payload Extraction
                    if (id === 'add-product-form') {
                        payload = { title: f.querySelector('#product-title').value, price: f.querySelector('#product-price').value, url: f.querySelector('#product-url').value };
                    } else if (id === 'add-testimonial-form') {
                        const text = prompt("Text:");
                        if(text) payload = { name: f.querySelector('#testimonial-name').value, text };
                    } else if (id === 'add-contact-form') {
                        payload = { title: f.querySelector('#contact-title').value };
                    } else if (id === 'add-countdown-form') {
                         payload = {
                            title: f.querySelector('#countdown-title').value,
                            target_datetime: new Date(f.querySelector('#countdown-datetime').value).toISOString()
                         };
                    } else {
                        const t = f.querySelector('input[id$="-title"]');
                        const u = f.querySelector('input[id$="-url"]');
                        if (t) payload = { title: t.value };
                        else if (u) payload = { url: u.value };
                    }

                    if(!payload) return; 
                    
                    const apiMap = {
                        'add-link-form': '/api/links', 'add-video-form': '/api/videos', 'add-header-form': '/api/headers',
                        'add-slider-group-form': '/api/slider_groups', 'add-grid-form': '/api/grids', 'add-faq-form': '/api/faqs',
                        'add-divider-form': '/api/dividers', 'add-contact-form': '/api/contact_form', 'add-email-form': '/api/email_form',
                        'add-testimonial-form': '/api/testimonials', 'add-product-form': '/api/products', 'add-countdown-form': '/api/countdowns'
                    };

                    await API.createItem(apiMap[id], payload);
                    UI.setFormStatus(formStatus, 'Hinzugefügt!', 'text-green-400', 2000);
                    loadItems();
                    e.target.reset();
                } catch(err) { UI.setFormStatus(formStatus, err.message, 'text-red-400'); }
            });
        }
    });

    // --- LOAD ITEMS (Modular) ---
    async function loadItems() {
        listLoadingSpinner.style.display = 'flex';
        listContainer.innerHTML = '';
        
        try {
            const items = await API.fetchItems();
            listLoadingSpinner.style.display = 'none';
            
            if (items.length === 0) {
                listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Noch keine Items.</p>';
                return;
            }
            
            // MODULAR: Daten organisieren
            const { roots, childrenMap } = organizeItems(items);
            
            // Liste der Gruppen für Dropdowns
            const groupItems = items.filter(i => isGroup(i));

            // Rendern
            roots.forEach(item => {
                const rendered = UI.renderAdminItem(item, groupItems);
                listContainer.appendChild(rendered.itemEl);
                setupItemEvents(item, rendered);

                // Kinder einfügen
                if (isGroup(item)) {
                    const childContainer = rendered.childrenContainer;
                    
                    if (childrenMap[item.id] && childrenMap[item.id].length > 0) {
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
            
            initSortable();
            lucide.createIcons();
        } catch(e) {
            console.error(e);
            listLoadingSpinner.style.display = 'none';
            listContainer.innerHTML = `<p class="text-red-400 text-center">Fehler: ${e.message}</p>`;
        }
    }
    
    function setupItemEvents(item, { viewContainer, editContainer, childrenContainer }) {
        // Toggle Logic
        const groupToggle = viewContainer.querySelector('.group-toggle');
        if (groupToggle && childrenContainer) {
            groupToggle.onclick = (e) => {
                e.stopPropagation();
                const icon = groupToggle.querySelector('svg');
                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    if(icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    childrenContainer.style.display = 'none';
                    if(icon) icon.style.transform = 'rotate(-90deg)';
                }
            };
        }

        // Actions
        const editBtn = viewContainer.querySelector('.btn-edit');
        const delBtn = viewContainer.querySelector('.btn-delete');
        const toggleVisBtn = viewContainer.querySelector('.btn-toggle');
        
        if(editBtn) editBtn.onclick = () => { 
            viewContainer.style.display='none'; editContainer.style.display='block'; lucide.createIcons(); 
        };
        if(delBtn) delBtn.onclick = async () => { 
            if(confirm(`Löschen?`)) { await API.deleteItem(item.id); loadItems(); } 
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
            const val = (sel) => editContainer.querySelector(sel)?.value;
            const chk = (sel) => editContainer.querySelector(sel)?.checked;
            
            const payload = { title: val('.edit-title') };
            payload.url = val('.edit-url');
            payload.image_url = val('.edit-image-url');
            payload.price = val('.edit-price');
            payload.parent_id = parseInt(val('.edit-parent-id')) || null;
            payload.is_featured = chk('.edit-is_featured');
            payload.is_affiliate = chk('.edit-is_affiliate');
            const dateIn = editContainer.querySelector('.edit-publish-on'); if(dateIn) payload.publish_on = dateIn.value ? new Date(dateIn.value).toISOString() : '';
            const expIn = editContainer.querySelector('.edit-expires-on'); if(expIn) payload.expires_on = expIn.value ? new Date(expIn.value).toISOString() : '';
            const gridIn = editContainer.querySelector('.edit-grid-columns'); if(gridIn) payload.grid_columns = parseInt(gridIn.value) || 2;
            
            try {
                await API.updateItem(item.id, payload);
                UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
                loadItems();
            } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400', 3000); }
        };
        
        if(uploadBtn) {
            uploadBtn.onclick = async () => {
                const file = editContainer.querySelector('.upload-image-file').files[0];
                if(!file) return;
                const formData = new FormData(); formData.append('file', file);
                try {
                    const res = await API.uploadImage(formData);
                    editContainer.querySelector('.edit-image-url').value = res.url;
                } catch(e) { alert("Upload Error: " + e.message); }
            };
        }
    }

    // --- MODULAR SORTABLE ---
    function initSortable() {
        sortableInstances.forEach(s => s.destroy());
        sortableInstances = [];

        const rootContainer = document.getElementById('manage-items-list');
        
        // Konfiguration aus groups.js holen
        const config = UI.getSortableConfig(
            // onMove: Parent ID Update
            async (itemId, newParentId) => {
                await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null });
            },
            // onReorder: UI Update
            () => {
                document.getElementById('save-order-button').style.display = 'block';
            }
        );

        if(rootContainer) sortableInstances.push(new Sortable(rootContainer, config));
        document.querySelectorAll('.child-container').forEach(el => {
            sortableInstances.push(new Sortable(el, config));
        });
    }

    // Save Order
    document.getElementById('save-order-button').onclick = async () => {
        const allCards = Array.from(document.querySelectorAll('.admin-item-card'));
        const ids = allCards.map(el => el.dataset.id);
        try {
            await API.reorderItems(ids);
            saveOrderButton.style.display = 'none';
            UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };

    // Profile (Rest bleibt gleich)
    const profileForm = document.getElementById('profile-form');
    if(profileForm) {
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
        
        // Helper
        const setupImageUpload = (btnId, fileId, textId) => {
            const btn = document.getElementById(btnId), file = document.getElementById(fileId), text = document.getElementById(textId);
            if(!btn || !file || !text) return;
            btn.onclick = () => file.click();
            file.onchange = async () => {
                if(!file.files[0]) return;
                const fd = new FormData(); fd.append('file', file.files[0]); btn.textContent = '...';
                try { const res = await API.uploadImage(fd); text.value = res.url; btn.textContent = 'OK'; } catch(e) { btn.textContent = 'Err'; alert(e.message); }
            }
        };
        setupImageUpload('upload-profile-btn', 'upload-profile-file', 'profile-image-url');
        setupImageUpload('upload-bg-btn', 'upload-bg-file', 'profile-bg-url');
        
        // Load
        (async () => {
            try {
                const s = await API.fetchSettings();
                pTitle.value = s.title || ''; pBio.value = s.bio || ''; pImg.value = s.image_url || '';
                if(pBg) pBg.value = s.bg_image_url || ''; pTheme.value = s.theme || 'theme-dark'; pStyle.value = s.button_style || 'style-rounded';
                if(cHead) cHead.value = s.custom_html_head || ''; if(cBody) cBody.value = s.custom_html_body || '';
                socialFields.forEach(f => { const i = document.getElementById(`social-${f.id}`); if(i) i.value = s[`social_${f.id}`] || ''; });
                cBg.value = s.custom_bg_color || '#111827'; cText.value = s.custom_text_color || '#F9FAFB'; cBtn.value = s.custom_button_color || '#1F2937'; cBtnTxt.value = s.custom_button_text_color || '#FFFFFF';
                
                const toggleCustom = () => { const el = document.getElementById('custom-theme-settings'); if(el) el.style.display = (pTheme.value === 'theme-custom') ? 'block' : 'none'; };
                pTheme.addEventListener('change', toggleCustom);
                toggleCustom();
            } catch(e) {}
        })();
        
        // Save
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
    }

    loadItems();
}
