import { initializeMediaManager } from './media.js';
import { initializeSubscribers } from './subscribers.js';
import { initializeInbox } from './inbox.js';
import { initProfile } from './admin_profile.js';
import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { organizeItems, getSortableConfig, isGroup } from './groups.js';
import { requireAuth, logout } from './utils.js';
import { initializePageManagement, getCurrentPageId } from './admin_pages.js';

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
    // 1. TABS SOFORT INITIALISIEREN (Damit sie klickbar sind)
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
                if (el.id === `tab-content-${tabName}`) {
                    el.classList.add('active');
                    el.style.display = 'block';
                } else {
                    el.classList.remove('active');
                    el.style.display = 'none';
                }
        });

        if (tabName === 'media') initializeMediaManager();
        if (tabName === 'community') {
            initializeSubscribers();
            initializeInbox();
        }
        // Profil wird global initialisiert, muss hier nicht neu geladen werden
    }

    // 2. Globale DOM Elemente
    const formStatus = document.getElementById('form-status');
    const listContainer = document.getElementById('manage-items-list');
    const listLoadingSpinner = document.getElementById('manage-list-loading');
    const saveOrderButton = document.getElementById('save-order-button');
    let sortableInstances = []; 

    // 3. Logout Handler
    document.getElementById('logout-button')?.addEventListener('click', logout);

    // 4. Lucide Check (kann dauern, daher nach Tabs)
    if (typeof lucide === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js'); } 
        catch(e) { console.error("Lucide Fail"); return; }
    }

    // 5. QR-Code Modal
    const qrButton = document.getElementById('qrcode-button');
    const qrModal = document.getElementById('qrcode-modal');
    const qrImage = document.getElementById('qrcode-image');
    
    if (qrButton) {
        qrButton.addEventListener('click', () => {
            if(qrImage) qrImage.src = `/api/qrcode?t=${Date.now()}`;
            if(qrModal) qrModal.style.display = 'flex';
        });
    }
    if (qrModal) qrModal.onclick = (e) => { if (e.target === qrModal) qrModal.style.display = 'none'; };

    // 6. Forms (Items erstellen)
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
                    // Payload bauen
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
                    } else if (id === 'add-countdown-form') {
                         payload = {
                            title: f.querySelector('#countdown-title').value,
                            target_datetime: new Date(f.querySelector('#countdown-datetime').value).toISOString()
                         };
                    } else {
                         const t = f.querySelector('input[id$="-title"]');
                         const u = f.querySelector('input[id$="-url"]');
                         if(t) payload = {title: t.value}; else if(u) payload = {url: u.value};
                    }
                    
                    if(!payload) return;
                    
                    // Add current page_id to payload
                    const pageId = getCurrentPageId();
                    if (pageId) {
                        payload.page_id = pageId;
                    }

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

    // 6.5. Category Toggle Functionality
    document.querySelectorAll('.category-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const category = this.dataset.category;
            const content = this.nextElementSibling;
            const chevron = this.querySelector('.category-chevron');
            
            if (content && content.classList.contains('category-content')) {
                const isHidden = content.classList.contains('hidden');
                content.classList.toggle('hidden');
                
                // Rotate chevron
                if (chevron) {
                    if (isHidden) {
                        chevron.style.transform = 'rotate(180deg)';
                    } else {
                        chevron.style.transform = 'rotate(0deg)';
                    }
                }
            }
        });
    });

    // 7. Items Laden & Rendern
    // Recursively render all children for a group
    function renderChildrenRecursive(parentItem, groupItems, childrenMap, setupItemEventsFn) {
        const childList = childrenMap[String(parentItem.id)];
        const renderedChildren = [];
        if (childList && childList.length > 0) {
            childList.forEach(child => {
                const cr = UI.renderAdminItem(child, groupItems);
                if (cr.itemEl) renderedChildren.push(cr.itemEl);
                if (setupItemEventsFn) setupItemEventsFn(child, cr);
                // If this child is a group, recurse
                if (isGroup(child) && cr.childrenContainer) {
                    cr.childrenContainer.innerHTML = '<div class="empty-placeholder text-xs text-gray-500 text-center py-2 pointer-events-none">Hier Elemente ablegen</div>';
                    // Recursively render children
                    const subChildren = renderChildrenRecursive(child, groupItems, childrenMap, setupItemEventsFn);
                    if (subChildren.length > 0) {
                        cr.childrenContainer.querySelector('.empty-placeholder').style.display = 'none';
                        subChildren.forEach(el => cr.childrenContainer.appendChild(el));
                    } else {
                        cr.childrenContainer.querySelector('.empty-placeholder').style.display = 'block';
                    }
                }
            });
        }
        return renderedChildren;
    }

    async function loadItems() {
        listLoadingSpinner.style.display = 'flex';
        listContainer.innerHTML = '';
        try {
            const pageId = getCurrentPageId();
            const items = await API.fetchItems(pageId);
            listLoadingSpinner.style.display = 'none';
            if (items.length === 0) { listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Leer.</p>'; return; }

            // If the API returns a nested tree (roots with .children arrays),
            // flatten it so `organizeItems` receives a flat list of all items.
            function flattenItems(list) {
                const out = [];
                (function walk(arr) {
                    arr.forEach(it => {
                        out.push(it);
                        if (it.children && Array.isArray(it.children) && it.children.length > 0) walk(it.children);
                    });
                })(list || []);
                return out;
            }

            const flatItems = flattenItems(items);
            const groupItems = flatItems.filter(i => isGroup(i));
            const { roots, childrenMap } = organizeItems(flatItems);

            roots.forEach(rootItem => {
                const rendered = UI.renderAdminItem(rootItem, groupItems);
                listContainer.appendChild(rendered.itemEl);
                setupItemEvents(rootItem, rendered);

                if (isGroup(rootItem) && rendered.childrenContainer) {
                    rendered.childrenContainer.innerHTML = '<div class="empty-placeholder text-xs text-gray-500 text-center py-2 pointer-events-none">Hier Elemente ablegen</div>';
                    const childrenEls = renderChildrenRecursive(rootItem, groupItems, childrenMap, setupItemEvents);
                    if (childrenEls.length > 0) {
                        rendered.childrenContainer.querySelector('.empty-placeholder').style.display = 'none';
                        childrenEls.forEach(el => rendered.childrenContainer.appendChild(el));
                    } else {
                        rendered.childrenContainer.querySelector('.empty-placeholder').style.display = 'block';
                    }
                }
            });
            initSortable();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch(e) { listLoadingSpinner.innerHTML = 'Fehler'; }
    }
    
    function setupItemEvents(item, { viewContainer, editContainer, childrenContainer }) {
        // Toggle
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

        // Buttons
        viewContainer.querySelector('.btn-edit').onclick = () => { viewContainer.style.display='none'; editContainer.style.display='block'; lucide.createIcons(); };
        viewContainer.querySelector('.btn-delete').onclick = async () => { if(confirm('Löschen?')) { await API.deleteItem(item.id); loadItems(); } };
        viewContainer.querySelector('.btn-toggle').onclick = async () => { await API.toggleItemVisibility(item.id); loadItems(); };
        
        editContainer.querySelector('.btn-cancel-edit').onclick = () => { editContainer.style.display='none'; viewContainer.style.display='flex'; };
        
        // Save Item
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
        
        // Upload Item Image
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
    }

    // 8. Drag & Drop
    function initSortable() {
        sortableInstances.forEach(s => s.destroy()); sortableInstances = [];
        const root = document.getElementById('manage-items-list');
        const config = UI.getSortableConfig(
            async (itemId, newParentId) => { await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null }); },
            () => { document.getElementById('save-order-button').style.display = 'block'; },
            'manage-items-list'
        );
        if(root) sortableInstances.push(new Sortable(root, config));
        // Enable drag-and-drop for all group children containers
        document.querySelectorAll('.child-container').forEach(el => sortableInstances.push(new Sortable(el, config)));
    }

    document.getElementById('save-order-button').onclick = async () => {
        const ids = Array.from(document.querySelectorAll('.admin-item-card')).map(el => el.dataset.id);
        try { await API.reorderItems(ids); saveOrderButton.style.display = 'none'; UI.setFormStatus(formStatus, 'Gespeichert!', 'text-green-400', 2000); } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };

    // INITIAL START
    initializePageManagement();
    loadItems();
    
    // Listen for page changes
    window.addEventListener('page-changed', (e) => {
        loadItems();
    });
    
    // WICHTIG: Profil-Modul initialisieren (dieser Aufruf fehlte!)
    // Das lädt die Settings, Social Inputs und Stylings
    initProfile();
}
