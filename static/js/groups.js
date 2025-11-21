// static/js/groups.js

// Welche Item-Typen dürfen Kinder enthalten?
export const GROUP_TYPES = ['slider_group', 'grid'];

/**
 * Prüft, ob ein Item ein Gruppen-Container ist.
 */
export function isGroup(item) {
    return GROUP_TYPES.includes(item.item_type);
}

/**
 * Nimmt eine flache Liste von Items (aus der DB) und sortiert sie
 * sauber in Root-Elemente und Kinder-Listen.
 * * @param {Array} items - Die rohe Liste vom Server
 * @returns {Object} { roots: Array, childrenMap: Object }
 */
export function organizeItems(items) {
    const allIds = new Set(items.map(i => i.id));
    const roots = [];
    const childrenMap = {};

    items.forEach(i => {
        // Ein Item ist ein Kind, wenn es eine parent_id hat UND der Vater auch existiert
        if (i.parent_id && allIds.has(i.parent_id)) {
            if (!childrenMap[i.parent_id]) childrenMap[i.parent_id] = [];
            childrenMap[i.parent_id].push(i);
        } else {
            // Kein Parent oder Waisenkind -> Root
            roots.push(i);
        }
    });

    // Sortieren nach display_order
    roots.sort((a, b) => a.display_order - b.display_order);
    
    Object.keys(childrenMap).forEach(parentId => {
        childrenMap[parentId].sort((a, b) => a.display_order - b.display_order);
    });

    return { roots, childrenMap };
}

/**
 * Erstellt die Konfiguration für SortableJS.
 * Hier definieren wir die Regeln (wer darf wo hin).
 * * @param {Function} onMove - Callback wenn ein Item verschoben wurde (API Update)
 * @param {Function} onReorder - Callback wenn sich die Reihenfolge geändert hat (UI Update)
 * @param {string} rootContainerId - ID des Hauptcontainers
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
                
                // UI Feedback: Gruppe aufklappen
                newContainer.style.display = 'block';
                const groupCard = newContainer.closest('.admin-item-card');
                const icon = groupCard?.querySelector('.group-toggle svg');
                if (icon) icon.style.transform = 'rotate(0deg)';
            }

            // Callbacks auslösen
            if (onMove) await onMove(itemId, newParentId);
            if (onReorder) onReorder();
        }
    };
}
