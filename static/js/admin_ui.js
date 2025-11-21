import { escapeHTML } from './utils.js';

export const STYLES = {
    input: "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
    btnPrimary: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50",
    btnSecondary: "w-full flex justify-center py-2 px-4 border border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
    btnDanger: "p-2 text-gray-400 hover:text-red-400 transition-colors",
    btnWarning: "p-2 text-gray-400 hover:text-yellow-400 transition-colors",
    btnIcon: "p-2 text-gray-400 hover:text-blue-400 transition-colors"
};

export function renderAdminItem(item, sliderGroups) {
    const itemEl = document.createElement('div');
    itemEl.className = `admin-item-card p-3 bg-gray-700 rounded-md flex flex-col mb-2 border border-gray-600 select-none transition-all duration-200`;
    itemEl.dataset.id = item.id;
    itemEl.dataset.type = item.item_type;
    
    if (!item.is_active) {
        itemEl.classList.add('opacity-50');
    }

    let itemIcon = '';
    let itemTypeInfo = '';
    const clickInfo = (['link', 'video', 'product'].includes(item.item_type)) ? 
        `<div class="text-xs text-gray-400 flex items-center space-x-1"><i data-lucide="bar-chart-2" class="w-3 h-3"></i><span>${item.click_count}</span></div>` : '';
    
    const affiliateIcon = item.is_affiliate ? `<i data-lucide="euro" class="w-3 h-3 text-yellow-400" title="Werbung/Affiliate"></i>` : '';
    const spotlightIcon = item.is_featured ? `<i data-lucide="star" class="w-3 h-3 text-yellow-400" title="Spotlight"></i>` : '';
    
    const toggleIcon = item.is_active ? 'eye' : 'eye-off';
    const isGroup = ['slider_group', 'grid'].includes(item.item_type);
    
    switch(item.item_type) {
        case 'link': itemIcon = `<i data-lucide="link" class="w-5 h-5 text-blue-400"></i>`; break;
        case 'video': itemIcon = `<i data-lucide="video" class="w-5 h-5 text-red-400"></i>`; break;
        case 'header': itemIcon = `<i data-lucide="type" class="w-5 h-5 text-gray-400"></i>`; itemTypeInfo = "Überschrift"; break;
        case 'slider_group': itemIcon = `<i data-lucide="gallery-horizontal" class="w-5 h-5 text-indigo-400"></i>`; itemTypeInfo = "Slider"; break;
        case 'email_form': itemIcon = `<i data-lucide="mail-plus" class="w-5 h-5 text-teal-400"></i>`; itemTypeInfo = "Newsletter"; break;
        case 'countdown': itemIcon = `<i data-lucide="timer" class="w-5 h-5 text-orange-400"></i>`; itemTypeInfo = "Countdown"; break;
        case 'grid': itemIcon = `<i data-lucide="layout-grid" class="w-5 h-5 text-pink-400"></i>`; itemTypeInfo = `Grid (${item.grid_columns || 2} Spalten)`; break;
        case 'faq': itemIcon = `<i data-lucide="help-circle" class="w-5 h-5 text-yellow-400"></i>`; itemTypeInfo = "FAQ"; break;
        case 'divider': itemIcon = `<i data-lucide="minus" class="w-5 h-5 text-gray-400"></i>`; itemTypeInfo = "Trennlinie"; break;
        case 'testimonial': itemIcon = `<i data-lucide="quote" class="w-5 h-5 text-green-400"></i>`; itemTypeInfo = "Rezension"; break;
        case 'contact_form': itemIcon = `<i data-lucide="message-square" class="w-5 h-5 text-blue-400"></i>`; itemTypeInfo = "Kontakt"; break;
        case 'product': itemIcon = `<i data-lucide="shopping-bag" class="w-5 h-5 text-purple-400"></i>`; itemTypeInfo = `Produkt (${escapeHTML(item.price || '')})`; break;
    }

    const viewContainer = document.createElement('div');
    viewContainer.className = 'flex items-center space-x-4 w-full';
    
    let chevronHTML = '';
    if (isGroup) {
        chevronHTML = `<button class="group-toggle text-gray-400 hover:text-white mr-1 focus:outline-none"><i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-200" style="transform: rotate(-90deg)"></i></button>`;
    }

    viewContainer.innerHTML = `
        <div class="drag-handle p-2 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing" title="Verschieben">
            <i data-lucide="grip-vertical" class="w-5 h-5"></i>
        </div>
        ${chevronHTML}
        <div class="flex-shrink-0 w-6 text-center">${itemIcon}</div>
        <div class="flex-grow min-w-0">
            <p class="text-white flex items-center space-x-2 truncate">
                <span class="truncate font-medium">${escapeHTML(item.title)}</span>
                ${spotlightIcon}
                ${affiliateIcon} 
            </p>
            <p class="text-xs text-gray-400 truncate">${escapeHTML(item.url || itemTypeInfo)}</p>
        </div>
        <div class="flex-shrink-0">${clickInfo}</div>
        <div class="flex-shrink-0 flex space-x-1">
             <button class="btn-toggle ${STYLES.btnIcon}"><i data-lucide="${toggleIcon}" class="w-4 h-4"></i></button>
             <button class="btn-edit ${STYLES.btnIcon}"><i data-lucide="pencil" class="w-4 h-4"></i></button>
             <button class="btn-delete ${STYLES.btnDanger}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `;

    const editContainer = document.createElement('div');
    editContainer.className = 'w-full pt-4 mt-4 border-t border-gray-600';
    editContainer.style.display = 'none';
    editContainer.innerHTML = createEditForm(item, sliderGroups);
    
    itemEl.appendChild(viewContainer);
    itemEl.appendChild(editContainer);

    if (isGroup) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'child-container ml-8 mt-2 p-2 min-h-[60px] rounded border-2 border-dashed border-gray-600 bg-gray-800/50 transition-all duration-300';
        childrenContainer.style.display = 'none'; // Standardmäßig zu
        childrenContainer.dataset.parentId = item.id;
        childrenContainer.innerHTML = '<div class="empty-placeholder text-xs text-gray-500 text-center py-2 pointer-events-none">Hier Elemente ablegen</div>';
        itemEl.appendChild(childrenContainer);
    }
    
    return { itemEl, viewContainer, editContainer };
}

export function createEditForm(item, groups) {
    const commonFields = renderCommonFields(item);
    const typeFields = renderTypeSpecificFields(item, groups);
    const actions = renderActionButtons();
    const scheduling = renderSchedulingFields(item);

    return `
        <div class="space-y-3">
            ${commonFields}
            ${typeFields}
            ${scheduling}
            ${actions}
        </div>
    `;
}

function renderGroupOptions(item, groups) {
    let options = groups.filter(g => g.id !== item.id).map(g => {
        const selected = (g.id === item.parent_id) ? 'selected' : '';
        return `<option value="${g.id}" ${selected}>${escapeHTML(g.title)}</option>`;
    }).join('');
    return `<option value="0" ${!item.parent_id ? 'selected' : ''}>-- Keine (Haupt-Item) --</option>` + options;
}

function renderCommonFields(item) {
    let label = 'Titel';
    if (item.item_type === 'testimonial') label = 'Name / Autor';
    if (item.item_type === 'faq') label = 'Frage';
    if (item.item_type === 'divider') label = 'Text (Optional)';
    if (item.item_type === 'contact_form') label = 'Überschrift';
    
    return `<div><label class="block text-xs font-medium text-gray-400">${label}</label><input type="text" class="edit-title ${STYLES.input}" value="${escapeHTML(item.title)}"></div>`;
}

function renderTypeSpecificFields(item, groups) {
    if (item.item_type === 'grid') {
        const cols = item.grid_columns || 2;
        return `<div><label class="block text-xs font-medium text-gray-400">Spaltenanzahl</label><select class="edit-grid-columns ${STYLES.input}"><option value="1" ${cols == 1 ? 'selected' : ''}>1 Spalte (Liste)</option><option value="2" ${cols == 2 ? 'selected' : ''}>2 Spalten</option><option value="3" ${cols == 3 ? 'selected' : ''}>3 Spalten</option></select></div>`;
    }

    if (item.item_type === 'link' || item.item_type === 'product') {
        let fields = `<div><label class="block text-xs font-medium text-gray-400">URL / Ziel</label><input type="text" class="edit-url ${STYLES.input}" value="${escapeHTML(item.url || '')}"></div>`;
        
        if (item.item_type === 'product') {
            fields += `<div><label class="block text-xs font-medium text-gray-400">Preis</label><input type="text" class="edit-price ${STYLES.input}" value="${escapeHTML(item.price || '')}" placeholder="z.B. 19.99 €"></div>`;
        }

        fields += `
            <div><label class="block text-xs font-medium text-gray-400">Bild-URL</label><input type="text" class="edit-image-url ${STYLES.input}" value="${escapeHTML(item.image_url || '')}"></div>
            <div class="pt-2 flex items-center space-x-2"><input type="file" class="upload-image-file text-xs text-gray-300"><button type="button" class="btn-upload-image text-xs bg-blue-600 px-2 py-1 rounded">Upload</button></div>
            <div><label class="block text-xs font-medium text-gray-400">Gruppe (Manuell)</label><select class="edit-parent-id ${STYLES.input}">${renderGroupOptions(item, groups)}</select></div>
            <div class="flex items-center space-x-4 pt-2"><label class="flex items-center space-x-2"><input type="checkbox" class="edit-is_featured" ${item.is_featured ? 'checked' : ''}><span class="text-sm text-gray-300">Spotlight?</span></label></div>
        `;
        return fields;
    }
    
    if (item.item_type === 'video' || item.item_type === 'countdown') {
        return `<div><label class="block text-xs font-medium text-gray-400">URL / Ziel</label><input type="text" class="edit-url ${STYLES.input}" value="${escapeHTML(item.url || '')}"></div>`;
    }
    if (item.item_type === 'faq' || item.item_type === 'testimonial') {
        return `<div><label class="block text-xs font-medium text-gray-400">Inhalt</label><textarea class="edit-url ${STYLES.input}" rows="3">${escapeHTML(item.url || '')}</textarea></div>`;
    }
    return ''; 
}

function renderSchedulingFields(item) {
    if (['header', 'slider_group', 'grid', 'divider', 'testimonial', 'contact_form'].includes(item.item_type)) return '';
    const formatISODate = (iso) => { if (!iso) return ''; try { const d = new Date(iso); const l = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)); return l.toISOString().slice(0, 16); } catch (e) { return ''; } };
    return `
        <div class="pt-3 border-t border-gray-600">
            <h4 class="text-sm font-medium text-gray-300 mb-2">Planung</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label class="block text-xs font-medium text-gray-400">Start</label><input type="datetime-local" class="edit-publish-on ${STYLES.input}" value="${formatISODate(item.publish_on)}" style="color-scheme: dark;"></div>
                <div><label class="block text-xs font-medium text-gray-400">Ende</label><input type="datetime-local" class="edit-expires-on ${STYLES.input}" value="${formatISODate(item.expires_on)}" style="color-scheme: dark;"></div>
            </div>
        </div>
    `;
}

function renderActionButtons() {
    return `<div class="flex justify-end space-x-3 pt-3"><button class="btn-cancel-edit ${STYLES.btnSecondary} w-auto py-1.5 px-3">Abbrechen</button><button class="btn-save-edit ${STYLES.btnPrimary} w-auto py-1.5 px-3">Speichern</button></div>`;
}

export function renderSocialFields(container, fields) {
    if (!container) return;
    fields.forEach(f => {
        const div = document.createElement('div');
        div.innerHTML = `<label for="social-${f.id}" class="block text-sm font-medium text-gray-300 flex items-center space-x-2"><i data-lucide="${f.icon}" class="w-4 h-4"></i><span>${f.label}</span></label><input type="text" id="social-${f.id}" name="social_${f.id}" class="${STYLES.input}" placeholder="${f.placeholder}">`;
        container.appendChild(div);
    });
}
export function setFormStatus(el, msg, cls, dur=0) {
    if (!el) return;
    el.textContent = msg; el.className = `mt-6 text-center ${cls}`;
    if (dur > 0) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, dur);
}
