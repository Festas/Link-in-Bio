import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { requireAuth, logout } from './utils.js';

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script'); s.src = src;
        s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
}

if (requireAuth()) { document.addEventListener('DOMContentLoaded', initAdmin); }

async function initAdmin() {
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
                    // Dynamische Datenextraktion
                    let payload = null;
                    if (id === 'add-testimonial-form') {
                        const name = f.querySelector('#testimonial-name').value;
                        const text = prompt("Bitte gib den Text der Rezension ein:");
                        if (text) payload = { name, text };
                    } else if (id === 'add-product-form') {
                         payload = {
                            title: f.querySelector('#product-title').value,
                            price: f.querySelector('#product-price').value,
                            url: f.querySelector('#product-url').value
                         };
                    } else if (id === 'add-contact-form') {
                        payload = { title: f.querySelector('#contact-title').value };
                    } else if (id === 'add-countdown-form') {
                         payload = {
                            title: f.querySelector('#countdown-title').value,
                            target_datetime: new Date(f.querySelector('#countdown-datetime').value).toISOString()
                         };
                    } else {
                        const titleInput = f.querySelector('input[id$="-title"]');
                        const urlInput = f.querySelector('input[id$="-url"]');
                        if (titleInput) payload = { title: titleInput.value };
                        else if (urlInput) payload = { url: urlInput.value };
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

    // --- LOAD ITEMS ---
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
            
            const groupItems = items.filter(i => ['slider_group', 'grid'].includes(i.item_type));
            
            // IDs sammeln
            const allIds = new Set(items.map(i => i.id));
            const roots = []; 
            const childrenMap = {};
            
            items.forEach(i => {
                if(i.parent_id && allIds.has(i.parent_id)) { 
                    if(!childrenMap[i.parent_id]) childrenMap[i.parent_id] = [];
                    childrenMap[i.parent_id].push(i);
                } else { 
                    roots.push(i); 
                }
            });

            roots.sort((a,b) => a.display_order - b.display_order);

            roots.forEach(item => {
                const rendered = UI.renderAdminItem(item, groupItems);
                listContainer.appendChild(rendered.itemEl);
                setupItemEvents(item, rendered);

                if (['slider_group', 'grid'].includes(item.item_type)) {
                    const childContainer = rendered.itemEl.querySelector('.child-container');
                    
                    if (childrenMap[item.id] && childrenMap[item.id].length > 0) {
                        childrenMap[item.id].sort((a,b) => a.display_order - b.display_order);
                        
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
    
    function setupItemEvents(item, { viewContainer, editContainer, itemEl }) {
        const groupToggle = viewContainer.querySelector('.group-toggle');
        if (groupToggle) {
            groupToggle.onclick = (e) => {
                e.stopPropagation();
                const childContainer = itemEl.querySelector('.child-container');
                const icon = groupToggle.querySelector('svg');
                
                // MODIFIZIERT: Standard ist offen (block/0deg).
                // Wir prüfen, ob es aktuell 'none' ist.
                if (childContainer.style.display === 'none') {
                    childContainer.style.display = 'block';
                    icon.style.transform = 'rotate(0deg)';
                } else {
                    childContainer.style.display = 'none';
                    icon.style.transform = 'rotate(-90deg)'; // Zu (nach rechts)
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
            const titleIn = editContainer.querySelector('.edit-title'); if(titleIn) payload.title = titleIn.value;
            const urlIn = editContainer.querySelector('.edit-url'); if(urlIn) payload.url = urlIn.value;
            const imgIn = editContainer.querySelector('.edit-image-url'); if(imgIn) payload.image_url = imgIn.value;
            const priceIn = editContainer.querySelector('.edit-price'); if(priceIn) payload.price = priceIn.value;
            const parentIn = editContainer.querySelector('.edit-parent-id'); if(parentIn) payload.parent_id = parseInt(parentIn.value) || null;
            const featIn = editContainer.querySelector('.edit-is_featured'); if(featIn) payload.is_featured = featIn.checked;
            const affIn = editContainer.querySelector('.edit-is_affiliate'); if(affIn) payload.is_affiliate = affIn.checked;
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

    function initSortable() {
        sortableInstances.forEach(s => s.destroy());
        sortableInstances = [];

        const rootContainer = document.getElementById('manage-items-list');
        
        const config = {
            group: {
                name: 'nested',
                pull: true,
                put: (to, from, dragEl) => {
                    const type = dragEl.dataset.type;
                    const isGroup = ['slider_group', 'grid'].includes(type);
                    const isRootList = to.el.id === 'manage-items-list';
                    if (isGroup && !isRootList) return false;
                    return true;
                }
            },
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const itemEl = evt.item;
                const itemId = itemEl.dataset.id;
                const newContainer = itemEl.closest('.child-container');
                let newParentId = null;

                if (newContainer) {
                    newParentId = newContainer.dataset.parentId;
                    const ph = newContainer.querySelector('.empty-placeholder');
                    if(ph) ph.style.display = 'none';
                    
                    // AUTO-OPEN
                    newContainer.style.display = 'block';
                    const groupCard = newContainer.closest('.admin-item-card');
                    const icon = groupCard?.querySelector('.group-toggle svg');
                    if(icon) icon.style.transform = 'rotate(0deg)';
                }

                await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null });
                document.getElementById('save-order-button').style.display = 'block';
            }
        };

        if(rootContainer) sortableInstances.push(new Sortable(rootContainer, config));
        document.querySelectorAll('.child-container').forEach(el => {
            sortableInstances.push(new Sortable(el, config));
        });
    }

    saveOrderButton.onclick = async () => {
        const allCards = Array.from(document.querySelectorAll('.admin-item-card'));
        const ids = allCards.map(el => el.dataset.id);
        
        try {
            await API.reorderItems(ids);
            saveOrderButton.style.display = 'none';
            UI.setFormStatus(formStatus, 'Reihenfolge gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };

    // Profile Init
    const profileForm = document.getElementById('profile-form');
    if(profileForm) {
        // ... (Profile Elements laden & speichern wie gehabt, hier abgekürzt, da nicht geändert)
        // ... bitte den Code aus der vorherigen Version nutzen oder einfach den unten stehenden Loader
        // (Der komplette Profil-Code wurde in der vorherigen Antwort gepostet, er passt hier 1:1)
    }
    // Da "Complete Code" gefordert war, füge ich den Profil-Teil hier wieder ein:
    
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
    function toggleCustomThemeSettings(theme) { const el = document.getElementById('custom-theme-settings'); if(el) el.style.display = (theme === 'theme-custom') ? 'block' : 'none'; }
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

    loadItems();
    loadProfileSettings();
}
