// Media Kit Blocks Management (New System)
export function initMediaKitBlocks() {
    loadBlocks();
    setupEventListeners();
}

let blocks = [];

async function loadBlocks() {
    try {
        const response = await fetch('/api/mediakit/blocks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        const data = await response.json();
        blocks = data.blocks || [];
        renderBlocks();
    } catch (error) {
        console.error('Error loading blocks:', error);
    }
}

function renderBlocks() {
    const container = document.getElementById('mediakit-blocks-container');
    if (!container) return;
    
    if (blocks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i data-lucide="layout" class="w-16 h-16 mx-auto mb-4 opacity-50"></i>
                <p class="mb-4">Noch keine Blöcke erstellt.</p>
                <p class="text-sm">Klicke auf "Block hinzufügen" um zu starten.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    container.innerHTML = blocks.map(block => `
        <div class="bg-gray-700 rounded-lg p-4 mb-4" data-block-id="${block.id}">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <i data-lucide="grip-vertical" class="w-5 h-5 text-gray-400 cursor-move"></i>
                    <span class="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded">${block.block_type}</span>
                    <h3 class="font-semibold">${block.title || 'Unbenannter Block'}</h3>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="toggleBlockVisibility(${block.id}, ${block.is_visible})" class="p-2 hover:bg-gray-600 rounded transition-colors" title="${block.is_visible ? 'Ausblenden' : 'Einblenden'}">
                        <i data-lucide="${block.is_visible ? 'eye' : 'eye-off'}" class="w-4 h-4 ${block.is_visible ? 'text-green-400' : 'text-gray-500'}"></i>
                    </button>
                    <button onclick="editBlock(${block.id})" class="p-2 hover:bg-gray-600 rounded transition-colors" title="Bearbeiten">
                        <i data-lucide="edit" class="w-4 h-4 text-blue-400"></i>
                    </button>
                    <button onclick="deleteBlock(${block.id})" class="p-2 hover:bg-gray-600 rounded transition-colors" title="Löschen">
                        <i data-lucide="trash-2" class="w-4 h-4 text-red-400"></i>
                    </button>
                </div>
            </div>
            ${block.content ? `<p class="text-sm text-gray-400 line-clamp-2">${getBlockPreview(block)}</p>` : ''}
        </div>
    `).join('');
    
    if (window.lucide) window.lucide.createIcons();
    initSortable();
}

function getBlockPreview(block) {
    try {
        if (block.block_type === 'text') {
            return block.content.substring(0, 100) + '...';
        } else if (block.content && block.content.startsWith('{')) {
            const data = JSON.parse(block.content);
            return JSON.stringify(data).substring(0, 100) + '...';
        }
        return block.content || '';
    } catch (e) {
        return block.content || '';
    }
}

function initSortable() {
    const container = document.getElementById('mediakit-blocks-container');
    if (!container || !window.Sortable) return;
    
    new Sortable(container, {
        animation: 150,
        handle: '[data-lucide="grip-vertical"]',
        onEnd: async (evt) => {
            const newOrder = Array.from(container.children).map((el, index) => ({
                id: parseInt(el.dataset.blockId),
                position: index
            }));
            await saveBlockOrder(newOrder);
        }
    });
}

async function saveBlockOrder(order) {
    try {
        await fetch('/api/mediakit/blocks/reorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ blocks: order })
        });
    } catch (error) {
        console.error('Error saving order:', error);
    }
}

function setupEventListeners() {
    const addBtn = document.getElementById('add-mediakit-block-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => showAddBlockModal());
    }
    
    // Make functions globally available
    window.toggleBlockVisibility = toggleBlockVisibility;
    window.editBlock = editBlock;
    window.deleteBlock = deleteBlock;
}

async function toggleBlockVisibility(blockId, currentlyVisible) {
    try {
        await fetch(`/api/mediakit/blocks/${blockId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ is_visible: !currentlyVisible })
        });
        await loadBlocks();
    } catch (error) {
        console.error('Error toggling visibility:', error);
    }
}

function showAddBlockModal() {
    const blockTypes = [
        { type: 'hero', name: 'Hero / Profil', icon: 'user', desc: 'Profilbild, Name, Standort, Beschreibung' },
        { type: 'text', name: 'Text', icon: 'type', desc: 'Einfacher Textblock mit Titel' },
        { type: 'stats', name: 'Statistiken', icon: 'bar-chart', desc: 'Metriken und Zahlen' },
        { type: 'platforms', name: 'Plattformen', icon: 'share-2', desc: 'Social Media Kanäle' },
        { type: 'partners', name: 'Partner', icon: 'users', desc: 'Brand Partners' },
        { type: 'rates', name: 'Preise', icon: 'dollar-sign', desc: 'Collaboration Rates' },
        { type: 'cta', name: 'Call-to-Action', icon: 'zap', desc: 'Kontakt-Button' },
        { type: 'custom', name: 'Custom HTML', icon: 'code', desc: 'Eigenes HTML' }
    ];
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 class="text-2xl font-bold mb-4">Block hinzufügen</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${blockTypes.map(bt => `
                    <button onclick="window.createBlock('${bt.type}')" class="text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                        <div class="flex items-center gap-3 mb-2">
                            <i data-lucide="${bt.icon}" class="w-5 h-5 text-cyan-400"></i>
                            <span class="font-semibold">${bt.name}</span>
                        </div>
                        <p class="text-sm text-gray-400">${bt.desc}</p>
                    </button>
                `).join('')}
            </div>
            <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Abbrechen</button>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
}

window.createBlock = async function(blockType) {
    // Close modal
    document.querySelector('.fixed.inset-0')?.remove();
    
    // Show edit modal for new block
    showEditModal(blockType, null);
};

function showEditModal(blockType, block) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto p-4';
    
    let formHtml = '';
    
    if (blockType === 'hero') {
        const data = block ? JSON.parse(block.content || '{}') : {};
        formHtml = `
            <input type="text" id="block-title" value="${block?.title || ''}" placeholder="Name" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <input type="text" id="hero-tagline" value="${data.tagline || ''}" placeholder="Tagline" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <input type="text" id="hero-location" value="${data.location || ''}" placeholder="Standort" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <input type="text" id="hero-image-url" value="${data.image_url || ''}" placeholder="Bild URL" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <textarea id="hero-description" rows="3" placeholder="Beschreibung" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">${data.description || ''}</textarea>
        `;
    } else if (blockType === 'text') {
        formHtml = `
            <input type="text" id="block-title" value="${block?.title || ''}" placeholder="Titel" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <textarea id="block-content" rows="8" placeholder="Text..." class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">${block?.content || ''}</textarea>
        `;
    } else if (blockType === 'partners') {
        formHtml = `
            <input type="text" id="block-title" value="${block?.title || 'Brand Partners'}" placeholder="Titel" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <textarea id="block-content" rows="4" placeholder="Partner (komma-getrennt)" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">${block?.content || ''}</textarea>
            <p class="text-xs text-gray-400">Beispiel: Nike, Adidas, Samsung</p>
        `;
    } else {
        formHtml = `
            <input type="text" id="block-title" value="${block?.title || ''}" placeholder="Titel" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3">
            <textarea id="block-content" rows="8" placeholder="Inhalt (JSON für komplexe Blöcke)" class="w-full bg-gray-600 text-white rounded px-3 py-2 mb-3 font-mono text-sm">${block?.content || ''}</textarea>
            <p class="text-xs text-gray-400">Für ${blockType} Blöcke verwende JSON Format</p>
        `;
    }
    
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 class="text-2xl font-bold mb-4">${block ? 'Block bearbeiten' : 'Neuer Block'}: ${blockType}</h2>
            <div class="mb-4">
                ${formHtml}
            </div>
            <div class="flex gap-2">
                <button onclick="window.saveBlockData('${blockType}', ${block?.id || 'null'})" class="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors">Speichern</button>
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Abbrechen</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.editBlock = function(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
        showEditModal(block.block_type, block);
    }
};

window.saveBlockData = async function(blockType, blockId) {
    const title = document.getElementById('block-title')?.value || '';
    let content = '';
    
    if (blockType === 'hero') {
        content = JSON.stringify({
            tagline: document.getElementById('hero-tagline').value,
            location: document.getElementById('hero-location').value,
            image_url: document.getElementById('hero-image-url').value,
            description: document.getElementById('hero-description').value
        });
    } else {
        content = document.getElementById('block-content')?.value || '';
    }
    
    try {
        if (blockId) {
            // Update existing block
            await fetch(`/api/mediakit/blocks/${blockId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: JSON.stringify({ title, content })
            });
        } else {
            // Create new block
            await fetch('/api/mediakit/blocks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: JSON.stringify({ block_type: blockType, title, content })
            });
        }
        
        document.querySelector('.fixed.inset-0')?.remove();
        await loadBlocks();
        alert('Block gespeichert!');
    } catch (error) {
        console.error('Error saving block:', error);
        alert('Fehler beim Speichern!');
    }
};

window.deleteBlock = async function(blockId) {
    if (!confirm('Block wirklich löschen?')) return;
    
    try {
        await fetch(`/api/mediakit/blocks/${blockId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        await loadBlocks();
    } catch (error) {
        console.error('Error deleting block:', error);
        alert('Fehler beim Löschen!');
    }
};
