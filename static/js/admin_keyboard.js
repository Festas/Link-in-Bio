// Keyboard Shortcuts for Admin Panel
// Provides power-user features with keyboard navigation

const SHORTCUTS = {
    // Global shortcuts
    'ctrl+s': { action: 'save', description: 'Änderungen speichern' },
    'ctrl+p': { action: 'preview', description: 'Vorschau öffnen' },
    'ctrl+k': { action: 'quickSearch', description: 'Schnellsuche' },
    'ctrl+n': { action: 'newItem', description: 'Neues Item erstellen' },
    'esc': { action: 'closeModal', description: 'Modal schließen' },
    
    // Navigation
    'ctrl+1': { action: 'switchTab', tab: 'items', description: 'Tab: Items' },
    'ctrl+2': { action: 'switchTab', tab: 'profile', description: 'Tab: Profil' },
    'ctrl+3': { action: 'switchTab', tab: 'analytics', description: 'Tab: Analytics' },
    'ctrl+4': { action: 'switchTab', tab: 'community', description: 'Tab: Community' },
    
    // Item management
    'ctrl+d': { action: 'duplicateSelected', description: 'Item duplizieren' },
    'ctrl+h': { action: 'toggleSelected', description: 'Item ein/ausblenden' },
    'delete': { action: 'deleteSelected', description: 'Item löschen' },
    
    // Bulk operations
    'ctrl+a': { action: 'selectAll', description: 'Alle auswählen' },
    'ctrl+shift+a': { action: 'deselectAll', description: 'Auswahl aufheben' },
    
    // Undo/Redo
    'ctrl+z': { action: 'undo', description: 'Rückgängig' },
    'ctrl+y': { action: 'redo', description: 'Wiederholen' },
    'ctrl+shift+z': { action: 'redo', description: 'Wiederholen' }
};

let selectedItems = new Set();
let actionHistory = [];
let historyIndex = -1;
let callbacks = {};

export function initKeyboardShortcuts(options = {}) {
    callbacks = options;
    
    document.addEventListener('keydown', handleKeydown);
    
    // Show shortcuts help on Ctrl+?
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            showShortcutsHelp();
        }
    });
    
    console.log('Keyboard shortcuts initialized. Press Ctrl+/ for help.');
}

function handleKeydown(e) {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
        // Allow Ctrl+S even in inputs
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            executeAction('save');
        }
        return;
    }
    
    const key = getKeyCombo(e);
    const shortcut = SHORTCUTS[key];
    
    if (shortcut) {
        e.preventDefault();
        executeAction(shortcut.action, shortcut);
        showShortcutFeedback(shortcut.description);
    }
}

function getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    
    let key = e.key.toLowerCase();
    // Normalize key names
    if (key === 'escape') key = 'esc';
    
    parts.push(key);
    return parts.join('+');
}

function executeAction(action, data = {}) {
    console.log('Executing action:', action, data);
    
    switch (action) {
        case 'save':
            if (callbacks.onSave) callbacks.onSave();
            break;
            
        case 'preview':
            if (callbacks.onPreview) callbacks.onPreview();
            break;
            
        case 'quickSearch':
            showQuickSearch();
            break;
            
        case 'newItem':
            if (callbacks.onNewItem) callbacks.onNewItem();
            break;
            
        case 'closeModal':
            closeAllModals();
            break;
            
        case 'switchTab':
            if (callbacks.onSwitchTab) callbacks.onSwitchTab(data.tab);
            break;
            
        case 'duplicateSelected':
            if (callbacks.onDuplicate) callbacks.onDuplicate(Array.from(selectedItems));
            break;
            
        case 'toggleSelected':
            if (callbacks.onToggle) callbacks.onToggle(Array.from(selectedItems));
            break;
            
        case 'deleteSelected':
            if (selectedItems.size > 0 && callbacks.onDelete) {
                if (confirm(`${selectedItems.size} Item(s) wirklich löschen?`)) {
                    callbacks.onDelete(Array.from(selectedItems));
                }
            }
            break;
            
        case 'selectAll':
            selectAllItems();
            break;
            
        case 'deselectAll':
            deselectAllItems();
            break;
            
        case 'undo':
            performUndo();
            break;
            
        case 'redo':
            performRedo();
            break;
    }
}

function showShortcutFeedback(message) {
    const feedback = document.getElementById('shortcut-feedback');
    if (!feedback) {
        const div = document.createElement('div');
        div.id = 'shortcut-feedback';
        div.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
        document.body.appendChild(div);
    }
    
    const feedbackEl = document.getElementById('shortcut-feedback');
    feedbackEl.textContent = message;
    feedbackEl.style.opacity = '1';
    
    setTimeout(() => {
        feedbackEl.style.opacity = '0';
    }, 2000);
}

function showQuickSearch() {
    const searchModal = document.getElementById('quick-search-modal');
    if (searchModal) {
        searchModal.style.display = 'flex';
        const input = searchModal.querySelector('input');
        if (input) input.focus();
    } else {
        createQuickSearchModal();
    }
}

function createQuickSearchModal() {
    const modal = document.createElement('div');
    modal.id = 'quick-search-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div class="p-4">
                <input type="text" 
                       id="quick-search-input"
                       placeholder="Schnellsuche... (Titel, URL, Typ)"
                       class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div id="quick-search-results" class="max-h-96 overflow-y-auto p-4 pt-0">
                <p class="text-gray-400 text-sm text-center py-8">Tippe um zu suchen...</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#quick-search-input');
    input.focus();
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Search on input
    input.addEventListener('input', (e) => {
        performQuickSearch(e.target.value);
    });
    
    // Close on Esc
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
        }
    });
}

async function performQuickSearch(query) {
    if (!query || query.length < 2) {
        document.getElementById('quick-search-results').innerHTML = 
            '<p class="text-gray-400 text-sm text-center py-8">Tippe um zu suchen...</p>';
        return;
    }
    
    if (callbacks.onSearch) {
        const results = await callbacks.onSearch(query);
        displaySearchResults(results);
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('quick-search-results');
    if (!results || results.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Keine Ergebnisse gefunden</p>';
        return;
    }
    
    container.innerHTML = results.map(item => `
        <div class="p-3 hover:bg-gray-700 rounded cursor-pointer transition-colors" 
             onclick="window.quickSearchSelectItem(${item.id})">
            <div class="flex items-center space-x-3">
                <i data-lucide="${getItemIcon(item.item_type)}" class="w-5 h-5 text-blue-400"></i>
                <div class="flex-1">
                    <p class="text-white font-medium">${escapeHTML(item.title)}</p>
                    <p class="text-xs text-gray-400">${item.item_type} ${item.url ? '• ' + escapeHTML(item.url) : ''}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

window.quickSearchSelectItem = function(itemId) {
    document.getElementById('quick-search-modal').style.display = 'none';
    if (callbacks.onSelectItem) {
        callbacks.onSelectItem(itemId);
    }
};

function getItemIcon(type) {
    const icons = {
        'link': 'link',
        'video': 'video',
        'header': 'type',
        'slider_group': 'gallery-horizontal',
        'product': 'shopping-bag',
        'email_form': 'mail-plus',
        'contact_form': 'message-square',
        'faq': 'help-circle',
        'countdown': 'timer',
        'testimonial': 'quote',
        'grid': 'layout-grid',
        'divider': 'minus'
    };
    return icons[type] || 'square';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    });
    
    const quickSearch = document.getElementById('quick-search-modal');
    if (quickSearch) quickSearch.style.display = 'none';
}

function selectAllItems() {
    document.querySelectorAll('.admin-item-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        selectedItems.add(id);
        card.classList.add('selected', 'ring-2', 'ring-blue-500');
    });
    updateSelectionUI();
}

function deselectAllItems() {
    document.querySelectorAll('.admin-item-card').forEach(card => {
        card.classList.remove('selected', 'ring-2', 'ring-blue-500');
    });
    selectedItems.clear();
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = selectedItems.size;
    const toolbar = document.getElementById('bulk-actions-toolbar');
    
    if (count > 0) {
        if (!toolbar) {
            createBulkActionsToolbar();
        }
        document.getElementById('selection-count').textContent = `${count} ausgewählt`;
    } else {
        if (toolbar) toolbar.style.display = 'none';
    }
}

function createBulkActionsToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'bulk-actions-toolbar';
    toolbar.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg shadow-xl px-6 py-3 flex items-center space-x-4 z-40';
    
    toolbar.innerHTML = `
        <span id="selection-count" class="text-white font-medium">0 ausgewählt</span>
        <div class="w-px h-6 bg-gray-600"></div>
        <button onclick="window.bulkToggleVisibility()" class="text-gray-300 hover:text-white flex items-center space-x-1">
            <i data-lucide="eye" class="w-4 h-4"></i>
            <span>Ein/Ausblenden</span>
        </button>
        <button onclick="window.bulkDuplicate()" class="text-gray-300 hover:text-white flex items-center space-x-1">
            <i data-lucide="copy" class="w-4 h-4"></i>
            <span>Duplizieren</span>
        </button>
        <button onclick="window.bulkDelete()" class="text-red-400 hover:text-red-300 flex items-center space-x-1">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
            <span>Löschen</span>
        </button>
        <button onclick="window.deselectAllItems()" class="text-gray-400 hover:text-white">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    
    document.body.appendChild(toolbar);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Undo/Redo functionality
export function recordAction(action) {
    // Remove any actions after current position
    actionHistory = actionHistory.slice(0, historyIndex + 1);
    
    actionHistory.push({
        ...action,
        timestamp: Date.now()
    });
    
    historyIndex = actionHistory.length - 1;
    
    // Keep max 50 actions
    if (actionHistory.length > 50) {
        actionHistory.shift();
        historyIndex--;
    }
}

function performUndo() {
    if (historyIndex < 0) {
        showShortcutFeedback('Nichts rückgängig zu machen');
        return;
    }
    
    const action = actionHistory[historyIndex];
    if (callbacks.onUndo) {
        callbacks.onUndo(action);
        historyIndex--;
        showShortcutFeedback('Rückgängig: ' + action.type);
    }
}

function performRedo() {
    if (historyIndex >= actionHistory.length - 1) {
        showShortcutFeedback('Nichts wiederherzustellen');
        return;
    }
    
    historyIndex++;
    const action = actionHistory[historyIndex];
    if (callbacks.onRedo) {
        callbacks.onRedo(action);
        showShortcutFeedback('Wiederholt: ' + action.type);
    }
}

function showShortcutsHelp() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const shortcuts = Object.entries(SHORTCUTS).map(([key, data]) => {
        return `
            <div class="flex items-center justify-between py-2 border-b border-gray-700">
                <span class="text-gray-300">${data.description}</span>
                <kbd class="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-gray-300">${key.toUpperCase()}</kbd>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-700 flex items-center justify-between">
                <h2 class="text-2xl font-bold text-white">Tastaturkürzel</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1">
                ${shortcuts}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Export for window access
window.deselectAllItems = deselectAllItems;
window.bulkToggleVisibility = () => {
    if (callbacks.onToggle) callbacks.onToggle(Array.from(selectedItems));
};
window.bulkDuplicate = () => {
    if (callbacks.onDuplicate) callbacks.onDuplicate(Array.from(selectedItems));
};
window.bulkDelete = () => {
    if (selectedItems.size > 0 && callbacks.onDelete) {
        if (confirm(`${selectedItems.size} Item(s) wirklich löschen?`)) {
            callbacks.onDelete(Array.from(selectedItems));
        }
    }
};

export { selectedItems };
