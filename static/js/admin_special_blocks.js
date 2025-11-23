// Special Page Block Editor
let currentBlocks = [];
let currentPageKey = null;

// Block type definitions
const BLOCK_TYPES = {
    heading: {
        name: 'Überschrift',
        icon: 'heading',
        color: 'blue',
        defaultContent: 'Neue Überschrift',
        defaultSettings: { level: 'h2', align: 'left' }
    },
    text: {
        name: 'Text',
        icon: 'type',
        color: 'gray',
        defaultContent: 'Neuer Textabsatz',
        defaultSettings: { align: 'left' }
    },
    image: {
        name: 'Bild',
        icon: 'image',
        color: 'purple',
        defaultContent: '',
        defaultSettings: { align: 'center', width: 'full' }
    },
    list: {
        name: 'Liste',
        icon: 'list',
        color: 'green',
        defaultContent: 'Listeneintrag 1\nListeneintrag 2\nListeneintrag 3',
        defaultSettings: { type: 'ul' }
    },
    section: {
        name: 'Bereich',
        icon: 'layout',
        color: 'indigo',
        defaultContent: '',
        defaultSettings: { background: 'default' }
    },
    spacer: {
        name: 'Abstand',
        icon: 'minus',
        color: 'gray',
        defaultContent: '',
        defaultSettings: { size: 'medium' }
    },
    gallery: {
        name: 'Galerie',
        icon: 'images',
        color: 'pink',
        defaultContent: '[]',
        defaultSettings: { columns: 3 }
    },
    quote: {
        name: 'Zitat',
        icon: 'quote',
        color: 'yellow',
        defaultContent: 'Dein Zitat hier',
        defaultSettings: { author: '', style: 'default' }
    },
    video: {
        name: 'Video',
        icon: 'video',
        color: 'red',
        defaultContent: '',
        defaultSettings: {}
    },
    columns: {
        name: 'Spalten',
        icon: 'columns',
        color: 'teal',
        defaultContent: '[]',
        defaultSettings: { columns: 2 }
    },
    timeline: {
        name: 'Timeline',
        icon: 'calendar',
        color: 'orange',
        defaultContent: '[]',
        defaultSettings: {}
    }
};

export function initSpecialBlockEditor() {
    // Add block buttons
    Object.keys(BLOCK_TYPES).forEach(type => {
        const btn = document.getElementById(`add-${type}-block`);
        if (btn) {
            btn.addEventListener('click', () => addBlock(type));
        }
    });
}

export async function loadSpecialPageBlocks(pageKey) {
    currentPageKey = pageKey;
    
    try {
        const response = await fetch(`/api/special-pages/${pageKey}/blocks`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        if (!response.ok) throw new Error('Fehler beim Laden der Blöcke');
        
        const data = await response.json();
        currentBlocks = data.blocks || [];
        
        renderBlocks();
    } catch (error) {
        console.error('Error loading blocks:', error);
        currentBlocks = [];
        renderBlocks();
    }
}

export async function saveSpecialPageBlocks() {
    if (!currentPageKey) return;
    
    try {
        // Prepare blocks data
        const blocksData = currentBlocks.map((block, index) => ({
            block_type: block.block_type,
            content: block.content,
            settings: block.settings,
            position: index
        }));
        
        const response = await fetch(`/api/special-pages/${currentPageKey}/blocks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ blocks: blocksData })
        });
        
        if (!response.ok) throw new Error('Fehler beim Speichern');
        
        return true;
    } catch (error) {
        console.error('Error saving blocks:', error);
        throw error;
    }
}

function addBlock(type) {
    const blockDef = BLOCK_TYPES[type];
    if (!blockDef) return;
    
    const newBlock = {
        id: Date.now(), // Temporary ID for new blocks
        block_type: type,
        content: blockDef.defaultContent,
        settings: { ...blockDef.defaultSettings },
        isNew: true
    };
    
    currentBlocks.push(newBlock);
    renderBlocks();
}

function renderBlocks() {
    const container = document.getElementById('content-blocks-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (currentBlocks.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                <p>Noch keine Blöcke vorhanden.</p>
                <p class="text-sm mt-1">Füge Blöcke mit den Buttons unten hinzu.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        return;
    }
    
    currentBlocks.forEach((block, index) => {
        const blockEl = createBlockElement(block, index);
        container.appendChild(blockEl);
    });
    
    // Initialize Sortable for drag & drop
    if (typeof Sortable !== 'undefined') {
        new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'opacity-50',
            onEnd: function(evt) {
                // Reorder blocks array
                const movedBlock = currentBlocks.splice(evt.oldIndex, 1)[0];
                currentBlocks.splice(evt.newIndex, 0, movedBlock);
            }
        });
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function createBlockElement(block, index) {
    const blockDef = BLOCK_TYPES[block.block_type];
    if (!blockDef) return document.createElement('div');
    
    const div = document.createElement('div');
    div.className = 'bg-gray-700 rounded-lg p-4 block-item';
    div.dataset.index = index;
    
    div.innerHTML = `
        <div class="flex items-start space-x-3">
            <button class="drag-handle text-gray-400 hover:text-white cursor-move mt-1">
                <i data-lucide="grip-vertical" class="w-5 h-5"></i>
            </button>
            
            <div class="flex-1">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <div class="bg-${blockDef.color}-600 p-2 rounded">
                            <i data-lucide="${blockDef.icon}" class="w-4 h-4"></i>
                        </div>
                        <span class="font-medium">${blockDef.name}</span>
                    </div>
                    <div class="flex space-x-2">
                        <button class="edit-block text-blue-400 hover:text-blue-300 p-1" data-index="${index}">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-block text-red-400 hover:text-red-300 p-1" data-index="${index}">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                
                <div class="block-preview bg-gray-800 rounded p-3">
                    ${renderBlockPreview(block)}
                </div>
                
                <div class="block-editor hidden mt-3" data-index="${index}">
                    ${renderBlockEditor(block, index)}
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners
    const editBtn = div.querySelector('.edit-block');
    editBtn.addEventListener('click', () => toggleBlockEditor(index));
    
    const deleteBtn = div.querySelector('.delete-block');
    deleteBtn.addEventListener('click', () => deleteBlock(index));
    
    return div;
}

function renderBlockPreview(block) {
    const settings = block.settings || {};
    
    switch (block.block_type) {
        case 'heading':
            const level = settings.level || 'h2';
            const headingSize = level === 'h1' ? 'text-3xl' : level === 'h2' ? 'text-2xl' : 'text-xl';
            return `<${level} class="${headingSize} font-bold">${escapeHtml(block.content || 'Überschrift')}</${level}>`;
            
        case 'text':
            return `<p class="text-gray-300">${escapeHtml(block.content || 'Text').replace(/\n/g, '<br>')}</p>`;
            
        case 'image':
            return block.content ? 
                `<img src="${escapeHtml(block.content)}" alt="Bild" class="max-w-full rounded">` :
                `<div class="text-center text-gray-500 py-4">
                    <i data-lucide="image" class="w-8 h-8 mx-auto mb-2"></i>
                    <p class="text-sm">Kein Bild ausgewählt</p>
                </div>`;
                
        case 'list':
            const listType = settings.type || 'ul';
            const items = (block.content || '').split('\n').filter(i => i.trim());
            const listItems = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
            return `<${listType} class="list-disc list-inside text-gray-300">${listItems}</${listType}>`;
            
        case 'section':
            return `<div class="text-gray-400 text-sm italic">
                <i data-lucide="layout" class="w-4 h-4 inline"></i>
                Bereich (wird Inhalte gruppieren)
            </div>`;
            
        case 'spacer':
            const size = settings.size || 'medium';
            const height = size === 'small' ? '20px' : size === 'large' ? '60px' : '40px';
            return `<div class="text-center text-gray-500 text-sm" style="height: ${height}">
                <i data-lucide="minus" class="w-4 h-4 inline"></i>
                Abstand (${size})
            </div>`;
            
        default:
            return `<p class="text-gray-500">Unbekannter Block-Typ</p>`;
    }
}

function renderBlockEditor(block, index) {
    const settings = block.settings || {};
    
    switch (block.block_type) {
        case 'heading':
            return `
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Text</label>
                        <input type="text" 
                            class="w-full bg-gray-600 text-white rounded px-3 py-2 block-content-input" 
                            value="${escapeHtml(block.content || '')}"
                            data-index="${index}">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Größe</label>
                        <select class="bg-gray-600 text-white rounded px-3 py-2 block-setting-level" data-index="${index}">
                            <option value="h1" ${settings.level === 'h1' ? 'selected' : ''}>H1 (Groß)</option>
                            <option value="h2" ${settings.level === 'h2' ? 'selected' : ''}>H2 (Mittel)</option>
                            <option value="h3" ${settings.level === 'h3' ? 'selected' : ''}>H3 (Klein)</option>
                        </select>
                    </div>
                    <button class="save-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm" data-index="${index}">
                        Speichern
                    </button>
                </div>
            `;
            
        case 'text':
            return `
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Text</label>
                        <textarea 
                            class="w-full bg-gray-600 text-white rounded px-3 py-2 block-content-input" 
                            rows="4"
                            data-index="${index}">${escapeHtml(block.content || '')}</textarea>
                    </div>
                    <button class="save-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm" data-index="${index}">
                        Speichern
                    </button>
                </div>
            `;
            
        case 'image':
            return `
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Bild-URL</label>
                        <input type="text" 
                            class="w-full bg-gray-600 text-white rounded px-3 py-2 block-content-input" 
                            value="${escapeHtml(block.content || '')}"
                            data-index="${index}"
                            placeholder="https://example.com/bild.jpg">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Breite</label>
                        <select class="bg-gray-600 text-white rounded px-3 py-2 block-setting-width" data-index="${index}">
                            <option value="full" ${settings.width === 'full' ? 'selected' : ''}>Volle Breite</option>
                            <option value="large" ${settings.width === 'large' ? 'selected' : ''}>Groß</option>
                            <option value="medium" ${settings.width === 'medium' ? 'selected' : ''}>Mittel</option>
                            <option value="small" ${settings.width === 'small' ? 'selected' : ''}>Klein</option>
                        </select>
                    </div>
                    <button class="save-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm" data-index="${index}">
                        Speichern
                    </button>
                </div>
            `;
            
        case 'list':
            return `
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Einträge (ein Eintrag pro Zeile)</label>
                        <textarea 
                            class="w-full bg-gray-600 text-white rounded px-3 py-2 block-content-input" 
                            rows="5"
                            data-index="${index}">${escapeHtml(block.content || '')}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Listentyp</label>
                        <select class="bg-gray-600 text-white rounded px-3 py-2 block-setting-type" data-index="${index}">
                            <option value="ul" ${settings.type === 'ul' ? 'selected' : ''}>Aufzählung</option>
                            <option value="ol" ${settings.type === 'ol' ? 'selected' : ''}>Nummerierung</option>
                        </select>
                    </div>
                    <button class="save-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm" data-index="${index}">
                        Speichern
                    </button>
                </div>
            `;
            
        case 'spacer':
            return `
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm text-gray-400 mb-1">Größe</label>
                        <select class="bg-gray-600 text-white rounded px-3 py-2 block-setting-size" data-index="${index}">
                            <option value="small" ${settings.size === 'small' ? 'selected' : ''}>Klein</option>
                            <option value="medium" ${settings.size === 'medium' ? 'selected' : ''}>Mittel</option>
                            <option value="large" ${settings.size === 'large' ? 'selected' : ''}>Groß</option>
                        </select>
                    </div>
                    <button class="save-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm" data-index="${index}">
                        Speichern
                    </button>
                </div>
            `;
            
        default:
            return '<p class="text-gray-500">Keine Bearbeitungsoptionen verfügbar</p>';
    }
}

function toggleBlockEditor(index) {
    const container = document.getElementById('content-blocks-container');
    const blockItem = container.querySelector(`.block-item[data-index="${index}"]`);
    if (!blockItem) return;
    
    const editor = blockItem.querySelector('.block-editor');
    const preview = blockItem.querySelector('.block-preview');
    
    if (editor.classList.contains('hidden')) {
        // Show editor
        editor.classList.remove('hidden');
        preview.classList.add('hidden');
        
        // Setup save button
        const saveBtn = editor.querySelector('.save-block');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => saveBlockEdit(index));
        }
    } else {
        // Hide editor
        editor.classList.add('hidden');
        preview.classList.remove('hidden');
    }
}

function saveBlockEdit(index) {
    const container = document.getElementById('content-blocks-container');
    const blockItem = container.querySelector(`.block-item[data-index="${index}"]`);
    if (!blockItem) return;
    
    const block = currentBlocks[index];
    const editor = blockItem.querySelector('.block-editor');
    
    // Get content
    const contentInput = editor.querySelector('.block-content-input');
    if (contentInput) {
        block.content = contentInput.value;
    }
    
    // Get settings based on block type
    block.settings = block.settings || {};
    
    const settingsInputs = editor.querySelectorAll('[class*="block-setting-"]');
    settingsInputs.forEach(input => {
        const settingName = Array.from(input.classList)
            .find(c => c.startsWith('block-setting-'))
            .replace('block-setting-', '');
        block.settings[settingName] = input.value;
    });
    
    // Re-render blocks
    renderBlocks();
}

function deleteBlock(index) {
    if (!confirm('Möchten Sie diesen Block wirklich löschen?')) return;
    
    currentBlocks.splice(index, 1);
    renderBlocks();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
