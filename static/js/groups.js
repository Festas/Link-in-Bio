// static/js/groups.js

// Welche Item-Typen dürfen Kinder enthalten?
export const GROUP_TYPES = ['slider_group', 'grid'];

/**
 * Prüft, ob ein Item ein Gruppen-Container ist.
 */
export function isGroup(item) {
    return item && GROUP_TYPES.includes(item.item_type);
}

/**
 * Nimmt eine flache Liste von Items (aus der DB) und sortiert sie
 * sauber in Root-Elemente und Kinder-Listen.
 * * Verbesserungen:
 * - Typ-Sicher (Vergleich als String)
 * - Rettet "Waisenkinder" (Items mit ungültiger parent_id)
 */
export function organizeItems(items) {
    // Wir speichern alle IDs als String für sicheren Vergleich
    const allIds = new Set(items.map(i => String(i.id)));
    const roots = [];
    const childrenMap = {};

    items.forEach(i => {
        const parentId = i.parent_id ? String(i.parent_id) : null;
        
        // Ein Item ist ein Kind, wenn es eine parent_id hat UND der Vater auch in der Liste existiert
        if (parentId && allIds.has(parentId)) {
            if (!childrenMap[parentId]) {
                childrenMap[parentId] = [];
            }
            childrenMap[parentId].push(i);
        } else {
            // Kein Parent oder Parent existiert nicht mehr (Waisenkind) -> Ab in die Root-Liste (Rettung!)
            roots.push(i);
        }
    });

    // Sortieren nach display_order
    roots.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    Object.keys(childrenMap).forEach(pId => {
        childrenMap[pId].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    });

    return { roots, childrenMap };
}

/**
 * Erstellt die Konfiguration für SortableJS.
 */
export function getSortableConfig(onMove, onReorder, rootContainerId = 'manage-items-list') {
    return {
        group: {
            name: 'nested',
            pull: true,
            put: (to, from, dragEl) => {
                // REGEL: Gruppen dürfen NICHT in andere Gruppen verschachtelt werden.
                const type = dragEl.dataset.type;
                const isGroupItem = GROUP_TYPES.includes(type);
                const isRootList = to.el.id === rootContainerId;
                
                // Wenn es eine Gruppe ist, darf sie nur in die Root-Liste
                if (isGroupItem && !isRootList) return false;
                
                return true;
            }
        },
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        fallbackOnBody: true, // Hilft bei Dragging-Problemen in verschachtelten Listen
        swapThreshold: 0.65,
        onEnd: async (evt) => {
            const itemEl = evt.item;
            const itemId = itemEl.dataset.id;
            
            // Wo liegt das Item jetzt?
            const newContainer = itemEl.closest('.child-container');
            let newParentId = null;

            if (newContainer) {
                // Es liegt in einer Gruppe
                newParentId = newContainer.dataset.parentId;
                
                // UI Feedback: Placeholder ausblenden
                const ph = newContainer.querySelector('.empty-placeholder');
                if (ph) ph.style.display = 'none';
                
                // UI Feedback: Gruppe aufklappen (visuell)
                newContainer.style.display = 'block';
                
                // Icon korrigieren (Pfeil nach unten)
                const groupCard = newContainer.closest('.admin-item-card');
                const icon = groupCard?.querySelector('.group-toggle svg');
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                // Es liegt im Root
                // Falls es vorher in einer Gruppe war, prüfen ob die jetzt leer ist
                // (Das ist optionales UI-Polish, SortableJS kümmert sich meist selbst drum)
            }

            // Callbacks auslösen
            if (onMove) await onMove(itemId, newParentId);
            if (onReorder) onReorder();
        }
    };
}
