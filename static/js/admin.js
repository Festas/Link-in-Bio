import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import { initProfile } from './admin_profile.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { organizeItems, getSortableConfig, isGroup } from './groups.js';
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

if (requireAuth()) {
    document.addEventListener('DOMContentLoaded', initAdmin);
}

async function initAdmin() {
    // 1. Lucide Check
    if (typeof lucide === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js'); } 
        catch(e) { console.error("Lucide Fail"); return; }
    }

    const formStatus = document.getElementById('form-status');
    const listContainer = document.getElementById('manage-items-list');
    const listLoadingSpinner = document.getElementById('manage-list-loading');
    const saveOrderButton = document.getElementById('save-order-button');
    let sortableInstances = [];

    // 2. Logout
    document.getElementById('logout-button')?.addEventListener('click', logout);

    // 3. Tabs
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
        if (tabName === 'community') { initializeSubscribers(); initializeInbox(); }
    }

    // 4. QR Code
    const qrButton = document.getElementById('qrcode-button');
    const qrModal = document.getElementById('qrcode-modal');
    const qrImage = document.getElementById('qrcode-image');

    if (qrButton) {
        qrButton.addEventListener('click', () => {
            qrImage.src = `/api/qrcode?t=${Date.now()}`;
            qrModal.style.display = 'flex';
        });
    }
    if (qrModal) qrModal.onclick = (e) => { if (e.target === qrModal) qrModal.style.display = 'none'; };

    // 5. Generische Formular-Handler (Items)
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
                    if (id === 'add-product-form') {
                         payload = { 
                             title: f.querySelector('#product-title').value, 
                             price: f.querySelector('#product-price').value, 
                             url: f.querySelector('#product-url').value 
                         };
                    } else if (id === 'add-testimonial-form') {
                         payload = { name: f.querySelector('#testimonial-name').value, text: prompt("Text:") || " " };
                    } else if (id === 'add-contact-form') {
                        payload = { title: f.querySelector('#contact-title').value };
                    } else {
                         const t = f.querySelector('input[id$="-title"]');
                         const u = f.querySelector('input[id$="-url"]');
                         if(t) payload = {title: t.value}; else if(u) payload = {url: u.value};
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

    // 6. Items Laden & Rendern
    async function loadItems() {
        listLoadingSpinner.style.display = 'flex';
        listContainer.innerHTML = '';
        try {
            const items = await API.fetchItems();
            listLoadingSpinner.style.display = 'none';
            if (items.length === 0) { listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Leer.</p>'; return; }
            
            const groupItems = items.filter(i => ['slider_group', 'grid'].includes(i.item_type));
            const { roots, childrenMap } = organizeItems(items);

            roots.forEach(rootItem => {
                const rendered = UI.renderAdminItem(rootItem, groupItems);
                listContainer.appendChild(rendered.itemEl);
                setupItemEvents(rootItem, rendered);

                if (isGroup(rootItem)) {
                    const childContainer = rendered.childrenContainer;
                    const childList = childrenMap[String(rootItem.id)];
                    if (childList && childList.length > 0) {
                        childContainer.querySelector('.empty-placeholder').style.display = 'none';
                        childList.forEach(c => {
                            const cr = UI.renderAdminItem(c, groupItems);
                            childContainer.appendChild(cr.itemEl);
                            setupItemEvents(c, cr);
                        });
                    }
                }
            });
            initSortable(); lucide.createIcons();
        } catch(e) { listLoadingSpinner.innerHTML = 'Fehler'; }
    }
    
    function setupItemEvents(item, { viewContainer, editContainer, childrenContainer }) {
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

        viewContainer.querySelector('.btn-edit').onclick = () => { viewContainer.style.display='none'; editContainer.style.display='block'; lucide.createIcons(); };
        viewContainer.querySelector('.btn-delete').onclick = async () => { if(confirm('Löschen?')) { await API.deleteItem(item.id); loadItems(); } };
        viewContainer.querySelector('.btn-toggle').onclick = async () => { await API.toggleItemVisibility(item.id); loadItems(); };
        editContainer.querySelector('.btn-cancel-edit').onclick = () => { editContainer.style.display='none'; viewContainer.style.display='flex'; };
        
        const uploadBtn = editContainer.querySelector('.btn-upload-image');
        if(uploadBtn) {
             uploadBtn.onclick = () => {
                const fi = editContainer.querySelector('.upload-image-file');
                fi.click();
                fi.onchange = async () => {
                    if(!fi.files[0]) return;
                    const fd = new FormData(); fd.append('file', fi.files[0]);
                    try {
                        const res = await API.uploadImage(fd);
                        editContainer.querySelector('.edit-image-url').value = res.url;
                    } catch(e) { alert(e.message); }
                };
             };
        }

        editContainer.querySelector('.btn-save-edit').onclick = async () => {
            const val = (s) => editContainer.querySelector(s)?.value;
            const chk = (s) => editContainer.querySelector(s)?.checked;
            
            const payload = { 
                title: val('.edit-title'), url: val('.edit-url'), 
                image_url: val('.edit-image-url'), price: val('.edit-price'), 
                is_featured: chk('.edit-is_featured'), is_affiliate: chk('.edit-is_affiliate') 
            };
            const pId = parseInt(val('.edit-parent-id')); if (!isNaN(pId)) payload.parent_id = pId === 0 ? null : pId;
            const cols = parseInt(val('.edit-grid-columns')); if (!isNaN(cols)) payload.grid_columns = cols;
            
            const dateIn = editContainer.querySelector('.edit-publish-on');
            if(dateIn) payload.publish_on = dateIn.value ? new Date(dateIn.value).toISOString() : '';
            const expIn = editContainer.querySelector('.edit-expires-on');
            if(expIn) payload.expires_on = expIn.value ? new Date(expIn.value).toISOString() : '';

            try { await API.updateItem(item.id, payload); UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 1000); loadItems(); } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
        };
    }

    // 7. Drag & Drop
    function initSortable() {
        sortableInstances.forEach(s => s.destroy()); sortableInstances = [];
        const root = document.getElementById('manage-items-list');
        const config = UI.getSortableConfig(
            async (itemId, newParentId) => { await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null }); },
            () => { document.getElementById('save-order-button').style.display = 'block'; },
            'manage-items-list'
        );
        if(root) sortableInstances.push(new Sortable(root, config));
        document.querySelectorAll('.child-container').forEach(el => sortableInstances.push(new Sortable(el, config)));
    }

    document.getElementById('save-order-button').onclick = async () => {
        const ids = Array.from(document.querySelectorAll('.admin-item-card')).map(el => el.dataset.id);
        try { await API.reorderItems(ids); saveOrderButton.style.display = 'none'; UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000); } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };

    // INITIAL START
    loadItems();
    // WICHTIG: Profil-Modul starten (hier wird renderSocialFields korrekt aufgerufen)
    initProfile();
}
