/**
 * Special Pages Editor
 * Unified block-based editor for all special pages
 */

class SpecialPageEditor {
    constructor(pageKey) {
        this.pageKey = pageKey;
        this.blocks = [];
        this.init();
    }

    async init() {
        await this.loadBlocks();
        this.setupEventListeners();
        if (this.pageKey === 'mediakit') {
            await this.loadMediaKitSettings();
            await this.loadMediaKitAnalytics();
        }
    }

    async loadBlocks() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/special-pages/${this.pageKey}/blocks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load blocks');
            
            const data = await response.json();
            this.blocks = data.blocks || [];
            this.renderBlocks();
        } catch (error) {
            console.error('Error loading blocks:', error);
            this.showStatus('Fehler beim Laden der Blöcke', 'error');
        }
    }

    renderBlocks() {
        const container = document.getElementById('blocks-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.blocks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                    <p>Noch keine Blöcke vorhanden. Füge deinen ersten Block hinzu!</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        this.blocks.forEach((block, index) => {
            const blockEl = this.createBlockElement(block, index);
            container.appendChild(blockEl);
        });
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Initialize Sortable for drag-and-drop
        if (typeof Sortable !== 'undefined') {
            new Sortable(container, {
                animation: 150,
                handle: '.drag-handle',
                onEnd: (evt) => {
                    const movedBlock = this.blocks.splice(evt.oldIndex, 1)[0];
                    this.blocks.splice(evt.newIndex, 0, movedBlock);
                    this.updateBlockPositions();
                }
            });
        }
    }

    createBlockElement(block, index) {
        const div = document.createElement('div');
        div.className = 'bg-gray-700 rounded-lg p-4 border border-gray-600';
        div.dataset.blockId = block.id;
        div.dataset.blockIndex = index;
        
        const blockTypeLabel = this.getBlockTypeLabel(block.block_type);
        
        div.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <button class="drag-handle text-gray-400 hover:text-white cursor-move">
                        <i data-lucide="grip-vertical" class="w-5 h-5"></i>
                    </button>
                    <div class="flex items-center space-x-2">
                        <i data-lucide="${this.getBlockIcon(block.block_type)}" class="w-4 h-4 text-blue-400"></i>
                        <span class="text-sm font-medium">${blockTypeLabel}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="toggle-block text-gray-400 hover:text-white" data-block-id="${block.id}">
                        <i data-lucide="${block.is_visible ? 'eye' : 'eye-off'}" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-block text-gray-400 hover:text-red-400" data-block-id="${block.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="block-content">
                ${this.renderBlockContent(block)}
            </div>
        `;
        
        return div;
    }

    getBlockTypeLabel(type) {
        const labels = {
            'heading': 'Überschrift',
            'text': 'Text',
            'image': 'Bild',
            'list': 'Liste',
            'divider': 'Trennlinie',
            'stats': 'Statistiken',
            'platforms': 'Plattformen',
            'rates': 'Preise',
            'contact-form': 'Kontaktformular',
            'hero': 'Hero',
            'cta': 'Call-to-Action',
            'video': 'Video'
        };
        return labels[type] || type;
    }

    getBlockIcon(type) {
        const icons = {
            'heading': 'heading',
            'text': 'type',
            'image': 'image',
            'list': 'list',
            'divider': 'minus',
            'stats': 'bar-chart',
            'platforms': 'share-2',
            'rates': 'dollar-sign',
            'contact-form': 'mail',
            'hero': 'layout',
            'cta': 'zap',
            'video': 'video'
        };
        return icons[type] || 'square';
    }

    renderBlockContent(block) {
        const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
        const settings = block.settings || {};
        
        switch (block.block_type) {
            case 'heading':
                return `
                    <input type="text" 
                           class="block-input w-full bg-gray-800 text-white rounded px-3 py-2 text-lg font-semibold" 
                           value="${this.escapeHtml(content)}" 
                           data-block-id="${block.id}"
                           placeholder="Überschrift eingeben...">
                `;
            
            case 'text':
                return `
                    <textarea 
                        class="block-input w-full bg-gray-800 text-white rounded px-3 py-2 min-h-[100px]" 
                        data-block-id="${block.id}"
                        placeholder="Text eingeben...">${this.escapeHtml(content)}</textarea>
                `;
            
            case 'image':
                const imageUrl = settings.url || content;
                return `
                    <div class="space-y-2">
                        ${imageUrl ? `<img src="${this.escapeHtml(imageUrl)}" class="w-full max-h-64 object-cover rounded" alt="Block image">` : ''}
                        <input type="url" 
                               class="block-input w-full bg-gray-800 text-white rounded px-3 py-2" 
                               value="${this.escapeHtml(imageUrl)}" 
                               data-block-id="${block.id}"
                               data-setting="url"
                               placeholder="Bild-URL eingeben...">
                        <input type="text" 
                               class="block-input w-full bg-gray-800 text-white rounded px-3 py-2" 
                               value="${this.escapeHtml(settings.alt || '')}" 
                               data-block-id="${block.id}"
                               data-setting="alt"
                               placeholder="Alt-Text (optional)">
                    </div>
                `;
            
            case 'list':
                const items = Array.isArray(content) ? content : (content ? content.split('\n') : []);
                return `
                    <textarea 
                        class="block-input w-full bg-gray-800 text-white rounded px-3 py-2 min-h-[120px]" 
                        data-block-id="${block.id}"
                        placeholder="Ein Element pro Zeile...">${items.join('\n')}</textarea>
                    <p class="text-xs text-gray-400 mt-2">Tipp: Ein Listenelement pro Zeile</p>
                `;
            
            case 'divider':
                return `<div class="border-t-2 border-gray-600 my-4"></div>`;
            
            case 'stats':
                return this.renderStatsBlock(block);
            
            case 'platforms':
                return this.renderPlatformsBlock(block);
            
            case 'rates':
                return this.renderRatesBlock(block);
            
            default:
                return `
                    <textarea 
                        class="block-input w-full bg-gray-800 text-white rounded px-3 py-2 min-h-[100px]" 
                        data-block-id="${block.id}"
                        placeholder="Inhalt...">${this.escapeHtml(content)}</textarea>
                `;
        }
    }

    renderStatsBlock(block) {
        // For media kit stats
        return `
            <div class="bg-gray-800 rounded p-4">
                <div class="text-sm text-gray-400 mb-2">Statistiken werden automatisch aktualisiert</div>
                <button class="refresh-stats bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                    <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i>
                    Social Stats aktualisieren
                </button>
            </div>
        `;
    }

    renderPlatformsBlock(block) {
        return `
            <div class="bg-gray-800 rounded p-4">
                <div class="text-sm text-gray-400">Plattformen werden aus den Profil-Einstellungen geladen</div>
            </div>
        `;
    }

    renderRatesBlock(block) {
        const content = typeof block.content === 'object' ? block.content : {};
        return `
            <div class="space-y-3">
                <input type="text" 
                       class="block-input w-full bg-gray-800 text-white rounded px-3 py-2" 
                       value="${this.escapeHtml(content.title || '')}" 
                       data-block-id="${block.id}"
                       data-setting="title"
                       placeholder="Titel (z.B. Kooperationspreise)">
                <textarea 
                    class="block-input w-full bg-gray-800 text-white rounded px-3 py-2 min-h-[120px]" 
                    data-block-id="${block.id}"
                    placeholder="Preise (eine pro Zeile, z.B.: Instagram Post - 500€)">${this.escapeHtml(content.items || '')}</textarea>
            </div>
        `;
    }

    setupEventListeners() {
        // Add block buttons
        document.querySelectorAll('.add-block-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const blockType = e.currentTarget.dataset.blockType;
                this.addBlock(blockType);
            });
        });

        // Save button
        document.getElementById('save-page')?.addEventListener('click', () => {
            this.saveBlocks();
        });

        // Delegated event listeners for dynamic content
        document.getElementById('blocks-container')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-block');
            const toggleBtn = e.target.closest('.toggle-block');
            
            if (deleteBtn) {
                const blockId = parseInt(deleteBtn.dataset.blockId);
                this.deleteBlock(blockId);
            }
            
            if (toggleBtn) {
                const blockId = parseInt(toggleBtn.dataset.blockId);
                this.toggleBlockVisibility(blockId);
            }
        });

        // Auto-save on input change (debounced)
        document.getElementById('blocks-container')?.addEventListener('input', 
            this.debounce((e) => {
                if (e.target.classList.contains('block-input')) {
                    const blockId = parseInt(e.target.dataset.blockId);
                    const setting = e.target.dataset.setting;
                    const value = e.target.value;
                    this.updateBlockContent(blockId, value, setting);
                }
            }, 500)
        );
    }

    async addBlock(blockType) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/special-pages/${this.pageKey}/blocks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    block_type: blockType,
                    content: '',
                    settings: {},
                    position: this.blocks.length
                })
            });
            
            if (!response.ok) throw new Error('Failed to add block');
            
            await this.loadBlocks();
            this.showStatus('Block hinzugefügt', 'success');
        } catch (error) {
            console.error('Error adding block:', error);
            this.showStatus('Fehler beim Hinzufügen des Blocks', 'error');
        }
    }

    async deleteBlock(blockId) {
        if (!confirm('Möchtest du diesen Block wirklich löschen?')) return;
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/special-page-blocks/${blockId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to delete block');
            
            this.blocks = this.blocks.filter(b => b.id !== blockId);
            this.renderBlocks();
            this.showStatus('Block gelöscht', 'success');
        } catch (error) {
            console.error('Error deleting block:', error);
            this.showStatus('Fehler beim Löschen des Blocks', 'error');
        }
    }

    async toggleBlockVisibility(blockId) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return;
        
        block.is_visible = !block.is_visible;
        
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`/api/special-page-blocks/${blockId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: block.content,
                    settings: block.settings || {}
                })
            });
            
            this.renderBlocks();
        } catch (error) {
            console.error('Error toggling visibility:', error);
        }
    }

    updateBlockContent(blockId, value, setting) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return;
        
        if (setting) {
            // Update a specific setting
            if (!block.settings) block.settings = {};
            block.settings[setting] = value;
        } else {
            // Update main content
            block.content = value;
        }
    }

    async updateBlockPositions() {
        this.blocks.forEach((block, index) => {
            block.position = index;
        });
        await this.saveBlocks();
    }

    async saveBlocks() {
        try {
            const token = localStorage.getItem('authToken');
            
            // Save each block individually
            for (const block of this.blocks) {
                await fetch(`/api/special-page-blocks/${block.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: block.content,
                        settings: block.settings || {}
                    })
                });
            }
            
            this.showStatus('Änderungen gespeichert', 'success');
        } catch (error) {
            console.error('Error saving blocks:', error);
            this.showStatus('Fehler beim Speichern', 'error');
        }
    }

    async loadMediaKitSettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/mediakit/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            const settings = data.settings || {};
            
            document.getElementById('mediakit-access-control').value = settings.access_control || 'public';
            document.getElementById('mediakit-video-pitch').value = settings.video_pitch_url || '';
        } catch (error) {
            console.error('Error loading mediakit settings:', error);
        }
    }

    async loadMediaKitAnalytics() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/mediakit/views/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) return;
            
            const stats = await response.json();
            
            document.getElementById('stat-total-views').textContent = stats.total_views || 0;
            document.getElementById('stat-week-views').textContent = stats.views_last_7_days || 0;
            document.getElementById('stat-access-requests').textContent = stats.pending_requests || 0;
        } catch (error) {
            console.error('Error loading mediakit analytics:', error);
        }
    }

    showStatus(message, type = 'success') {
        const statusEl = document.getElementById('status-message');
        const statusText = document.getElementById('status-text');
        
        if (!statusEl || !statusText) return;
        
        statusEl.className = `rounded-lg p-4 ${type === 'success' ? 'bg-green-900 bg-opacity-50 border border-green-700' : 'bg-red-900 bg-opacity-50 border border-red-700'}`;
        statusText.textContent = message;
        statusEl.classList.remove('hidden');
        
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PAGE_KEY !== 'undefined') {
        new SpecialPageEditor(PAGE_KEY);
    }
});
