// static/js/groups.js

// Item-Typen, die als Container fungieren
export const GROUP_TYPES = ['slider_group', 'grid'];

/**
 * Prüft, ob ein Item ein Container ist.
 */
export function isGroup(item) {
    return item && GROUP_TYPES.includes(item.item_type);
}

/**
 * Wandelt die flache Liste (Flat List) in eine Baumstruktur um.
 * Behebt Typ-Probleme (String vs Int) und rettet verlorene Kinder.
 */
export function organizeItems(items) {
    // Map für schnellen Zugriff: ID (String) -> Item
    const itemMap = new Map();
    items.forEach(i => itemMap.set(String(i.id), i));

    const roots = [];
    const childrenMap = {};

    items.forEach(item => {
        const pId = item.parent_id ? String(item.parent_id) : null;

        // Ist es ein Kind? (Hat ParentID UND der Parent existiert in der aktuellen Liste)
        if (pId && itemMap.has(pId)) {
            if (!childrenMap[pId]) {
                childrenMap[pId] = [];
            }
            childrenMap[pId].push(item);
        } else {
            // Es ist ein Root-Element (oder ein Waisenkind, dessen Vater gelöscht wurde)
            roots.push(item);
        }
    });

    // Sortierung anwenden (nach display_order)
    const sortFn = (a, b) => (a.display_order || 0) - (b.display_order || 0);
    
    roots.sort(sortFn);
    Object.keys(childrenMap).forEach(key => {
        childrenMap[key].sort(sortFn);
    });

    return { roots, childrenMap };
}

/**
 * Konfiguration für SortableJS (Drag & Drop)
 */
export function getSortableConfig(onMove, onReorder, rootContainerId) {
    return {
        group: 'nested', // Erlaubt Austausch zwischen Listen
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        handle: '.drag-handle', // Nur am Griff ziehen
        ghostClass: 'sortable-ghost',
        
        // Wer darf wo rein?
        put: (to, from, dragEl) => {
            const type = dragEl.dataset.type;
            const isGroupItem = GROUP_TYPES.includes(type);
            const isRootList = to.el.id === rootContainerId;

            // Gruppen dürfen NUR in die Root-Liste (keine Gruppe in Gruppe)
            if (isGroupItem && !isRootList) return false;
            
            return true;
        },

        // Wenn das Droppen fertig ist
        onEnd: async (evt) => {
            const itemEl = evt.item;
            const itemId = itemEl.dataset.id;
            const newContainer = itemEl.closest('.child-container');
            let newParentId = null;

            // Wo sind wir gelandet?
            if (newContainer) {
                newParentId = newContainer.dataset.parentId;
                
                // UI Kosmetik: Leeren-Placeholder ausblenden
                const ph = newContainer.querySelector('.empty-placeholder');
                if(ph) ph.style.display = 'none';
                
                // Gruppe aufklappen, damit der User sein Item sieht
                newContainer.style.display = 'block';
                // Pfeil anpassen (optional, je nach Implementierung in admin.js)
            } else {
                // Im Root gelandet
            }

            // Callbacks feuern
            if (onMove) await onMove(itemId, newParentId);
            if (onReorder) onReorder();
        }
    };
}
