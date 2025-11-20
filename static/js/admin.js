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
        console.warn("Lucide lokal fehlt. Lade CDN...");
        try { await loadScript('https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js'); } 
        catch(e) { console.error("Lucide Fail"); return; }
    }

    const formStatus = document.getElementById('form-status');
    const listContainer = document.getElementById('manage-items-list');
    const saveOrderButton = document.getElementById('save-order-button');
    let sortableInstances = []; 

    document.getElementById('logout-button')?.addEventListener('click', logout);

    // Tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    function switchTab(tab) {
        document.querySelectorAll('.tab-button').forEach(b => {
             b.classList.toggle('border-blue-400', b.dataset.tab === tab);
             b.classList.toggle('text-blue-400', b.dataset.tab === tab);
             b.classList.toggle('border-transparent', b.dataset.tab !== tab);
        });
        document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-content-${tab}`));
        if (tab === 'media') initializeMediaManager();
        if (tab === 'community') { initializeSubscribers(); initializeInbox(); }
    }

    // Forms
    const socialContainer = document.getElementById('social-inputs-container');
    const socialFields = [ { id: 'youtube', label: 'YouTube', icon: 'youtube', placeholder: '...' }, { id: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: '...' }, { id: 'tiktok', label: 'TikTok', icon: 'music-4', placeholder: '...' }, { id: 'twitch', label: 'Twitch', icon: 'twitch', placeholder: '...' }, { id: 'x', label: 'X', icon: 'twitter', placeholder: '...' }, { id: 'discord', label: 'Discord', icon: 'discord', placeholder: '...' }, { id: 'email', label: 'E-Mail', icon: 'mail', placeholder: '...' } ];
    UI.renderSocialFields(socialContainer, socialFields);

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
        {id: 'add-testimonial-form', api: '/api/testimonials', data: (e) => ({name: e.target.querySelector('#testimonial-name').value, text: prompt("Text:")})},
        {id: 'add-product-form', api: '/api/products', data: (e) => ({title: e.target.querySelector('#product-title').value, price: e.target.querySelector('#product-price').value, url: e.target.querySelector('#product-url').value})},
        {id: 'add-countdown-form', api: '/api/countdowns', data: (e) => ({title: e.target.querySelector('#countdown-title').value, target_datetime: new Date(e.target.querySelector('#countdown-datetime').value).toISOString()})}
    ];

    forms.forEach(f => {
        const form = document.getElementById(f.id);
        if (form) {
            form.querySelectorAll('input').forEach(i => i.className = UI.STYLES.input);
            form.querySelectorAll('button').forEach(b => b.className = UI.STYLES.btnPrimary);
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const payload = f.data(e);
                    if(!payload) return; 
                    await API.createItem(f.api, payload);
                    UI.setFormStatus(formStatus, 'Hinzugefügt!', 'text-green-400', 2000);
                    loadItems();
                    e.target.reset();
                } catch(err) { UI.setFormStatus(formStatus, err.message, 'text-red-400'); }
            });
        }
    });

    async function loadItems() {
        const container = document.getElementById('manage-items-list');
        const spinner = document.getElementById('manage-list-loading');
        spinner.style.display = 'flex'; container.innerHTML = '';
        
        try {
            const items = await API.fetchItems();
            spinner.style.display = 'none';
            
            const groups = items.filter(i => ['slider_group', 'grid'].includes(i.item_type));
            const roots = []; const children = {};
            items.forEach(i => {
                if(i.parent_id) { 
                    if(!children[i.parent_id]) children[i.parent_id] = [];
                    children[i.parent_id].push(i);
                } else { roots.push(i); }
            });

            roots.forEach(item => {
                const rendered = UI.renderAdminItem(item, groups);
                container.appendChild(rendered.itemEl);
                setupItemEvents(item, rendered);

                if (children[item.id]) {
                    children[item.id].sort((a,b) => a.display_order - b.display_order);
                    const childContainer = rendered.itemEl.querySelector('.child-container');
                    if(childContainer) {
                        childContainer.querySelector('.empty-placeholder').style.display = 'none';
                        children[item.id].forEach(c => {
                            const r = UI.renderAdminItem(c, groups);
                            childContainer.appendChild(r.itemEl);
                            setupItemEvents(c, r);
                        });
                    }
                }
            });
            
            initSortable();
            lucide.createIcons();
        } catch(e) { spinner.innerHTML = 'Fehler'; }
    }

    // FIX: Buttons sicher über Klassen auswählen, nicht über Index
    function setupItemEvents(item, { viewContainer, editContainer }) {
        const toggleBtn = viewContainer.querySelector('.btn-toggle');
        const editBtn = viewContainer.querySelector('.btn-edit');
        const delBtn = viewContainer.querySelector('.btn-delete');
        
        if(editBtn) editBtn.onclick = () => { viewContainer.style.display='none'; editContainer.style.display='block'; lucide.createIcons(); };
        if(delBtn) delBtn.onclick = async () => { if(confirm('Löschen?')) { await API.deleteItem(item.id); loadItems(); } };
        if(toggleBtn) toggleBtn.onclick = async () => { await API.toggleItemVisibility(item.id); loadItems(); };
        
        const saveBtn = editContainer.querySelector('.btn-save-edit');
        const cancelBtn = editContainer.querySelector('.btn-cancel-edit');
        const uploadBtn = editContainer.querySelector('.btn-upload-image');

        if(cancelBtn) cancelBtn.onclick = () => { editContainer.style.display='none'; viewContainer.style.display='flex'; };
        
        if(saveBtn) saveBtn.onclick = async () => {
            const title = editContainer.querySelector('.edit-title')?.value;
            const url = editContainer.querySelector('.edit-url')?.value;
            const img = editContainer.querySelector('.edit-image-url')?.value;
            const price = editContainer.querySelector('.edit-price')?.value;
            const parent = editContainer.querySelector('.edit-parent-id')?.value;
            const gridCols = editContainer.querySelector('.edit-grid-columns')?.value; // NEU
            const feat = editContainer.querySelector('.edit-is_featured')?.checked;
            const aff = editContainer.querySelector('.edit-is_affiliate')?.checked;
            
            const payload = { title, url, image_url: img, price, is_featured: feat, is_affiliate: aff };
            if(parent !== undefined) payload.parent_id = parseInt(parent) || null;
            if(gridCols !== undefined) payload.grid_columns = parseInt(gridCols) || 2; // NEU
            
            await API.updateItem(item.id, payload);
            loadItems();
        };
        
        if(uploadBtn) {
            uploadBtn.onclick = async () => {
                const file = editContainer.querySelector('.upload-image-file').files[0];
                if(!file) return;
                const formData = new FormData(); formData.append('file', file);
                const res = await API.uploadImage(formData);
                editContainer.querySelector('.edit-image-url').value = res.url;
            };
        }
    }

    function initSortable() {
        if(sortableInstance) sortableInstance.destroy();
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
                }

                await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null });
                document.getElementById('save-order-button').style.display = 'block';
            }
        };

        sortableInstances.push(new Sortable(rootContainer, config));
        document.querySelectorAll('.child-container').forEach(el => {
            sortableInstances.push(new Sortable(el, config));
        });
    }

    document.getElementById('save-order-button').onclick = async () => {
        const ids = Array.from(listContainer.children).filter(el => el.dataset.id).map(el => el.dataset.id);
        await API.reorderItems(ids);
        document.getElementById('save-order-button').style.display = 'none';
        loadItems();
    };

    // ... (Preview, Profile Settings, etc. aus früherem Code unverändert) ...
    // Der Übersichtlichkeit halber hier gekürzt, aber in deiner Datei bitte behalten!
    loadItems();
    loadProfileSettings();
}


