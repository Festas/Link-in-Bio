import * as API from './admin_api.js';
import * as UI from './admin_ui.js';
import { organizeItems, getSortableConfig, isGroup } from './groups.js';

let sortableInstances = [];

export async function loadItems() {
    const listContainer = document.getElementById('manage-items-list');
    const listLoadingSpinner = document.getElementById('manage-list-loading');
    const saveOrderButton = document.getElementById('save-order-button');
    
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
                const childList = childrenMap[String(rootItem.id)];

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
        
        initSortable(saveOrderButton);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
    } catch(e) {
        console.error(e);
        listLoadingSpinner.innerHTML = `<p class="text-red-400 text-center">Fehler: ${e.message}</p>`;
    }
}

function setupItemEvents(item, { viewContainer, editContainer, childrenContainer }) {
    const formStatus = document.getElementById('form-status');
    
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
        viewContainer.style.display='none'; 
        editContainer.style.display='block'; 
        if (typeof lucide !== 'undefined') lucide.createIcons(); 
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
            } catch(e) { alert("Upload Fehler: " + e.message); }
        };
    }
}

function initSortable(saveOrderButton) {
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    const rootContainer = document.getElementById('manage-items-list');
    
    const config = getSortableConfig(
        // onMove
        async (itemId, newParentId) => {
            await API.updateItem(itemId, { parent_id: newParentId ? parseInt(newParentId) : null });
        },
        // onReorder
        () => {
            if(saveOrderButton) saveOrderButton.style.display = 'block';
        },
        'manage-items-list'
    );

    if(rootContainer) sortableInstances.push(new Sortable(rootContainer, config));
    
    document.querySelectorAll('.child-container').forEach(el => {
        sortableInstances.push(new Sortable(el, config));
    });
}

export function setupSaveOrder() {
    const saveBtn = document.getElementById('save-order-button');
    const formStatus = document.getElementById('form-status');
    if (!saveBtn) return;

    saveBtn.onclick = async () => {
        const allIds = Array.from(document.querySelectorAll('.admin-item-card')).map(el => el.dataset.id);
        try {
            await API.reorderItems(allIds);
            saveBtn.style.display = 'none';
            UI.setFormStatus(formStatus, 'Reihenfolge gespeichert!', 'text-green-400', 2000);
        } catch(e) { UI.setFormStatus(formStatus, e.message, 'text-red-400'); }
    };
}
