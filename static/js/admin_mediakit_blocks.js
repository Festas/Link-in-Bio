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
        { type: 'platforms', name: 'Social Media', icon: 'share-2', desc: 'Social Media Kanäle mit Followern' },
        { type: 'partners', name: 'Brand Partners', icon: 'users', desc: 'Zusammengearbeitete Marken' },
        { type: 'rates', name: 'Preise', icon: 'dollar-sign', desc: 'Collaboration Rates & Services' },
        { type: 'cta', name: 'Call-to-Action', icon: 'zap', desc: 'Kontakt-Button' },
        { type: 'video', name: 'Video Pitch', icon: 'video', desc: 'Video-Vorstellung oder Pitch' },
        { type: 'audience', name: 'Audience Insights', icon: 'users', desc: 'Zielgruppen-Demografien' },
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
    
    const formHtml = getBlockFormTemplate(blockType, block);
    
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold">${block ? 'Block bearbeiten' : 'Neuer Block'}: ${getBlockTypeName(blockType)}</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <div class="mb-4">
                ${formHtml}
            </div>
            <div class="flex gap-2">
                <button onclick="window.saveBlockData('${blockType}', ${block?.id || 'null'})" class="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors">
                    <i data-lucide="save" class="w-4 h-4 inline-block mr-2"></i>
                    Speichern
                </button>
                <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors">Abbrechen</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
}

function getBlockTypeName(type) {
    const names = {
        'hero': 'Hero / Profil',
        'text': 'Text',
        'stats': 'Statistiken',
        'platforms': 'Social Media',
        'partners': 'Brand Partners',
        'rates': 'Preise',
        'cta': 'Call-to-Action',
        'video': 'Video Pitch',
        'audience': 'Audience Insights',
        'custom': 'Custom HTML'
    };
    return names[type] || type;
}

function getBlockFormTemplate(blockType, block) {
    const inputClass = 'w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-4 border border-gray-600 focus:border-cyan-500 focus:outline-none transition-colors';
    const labelClass = 'block text-sm font-medium text-gray-300 mb-2';
    const helpClass = 'text-xs text-gray-400 mt-1';
    
    switch(blockType) {
        case 'hero':
            const heroData = block ? JSON.parse(block.content || '{}') : {};
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Name / Titel</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || '')}" 
                               placeholder="Dein Name oder Markenname" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Profilbild URL</label>
                        <input type="text" id="hero-image-url" value="${escapeHtml(heroData.image_url || '')}" 
                               placeholder="https://example.com/image.jpg" class="${inputClass}">
                        <p class="${helpClass}">Empfohlen: Quadratisches Bild (z.B. 400x400px)</p>
                    </div>
                    <div>
                        <label class="${labelClass}">Tagline / Untertitel</label>
                        <input type="text" id="hero-tagline" value="${escapeHtml(heroData.tagline || '')}" 
                               placeholder="z.B. Content Creator | Influencer" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Standort</label>
                        <input type="text" id="hero-location" value="${escapeHtml(heroData.location || '')}" 
                               placeholder="z.B. Berlin, Germany" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Beschreibung / Bio</label>
                        <textarea id="hero-description" rows="4" placeholder="Kurze Beschreibung über dich..." 
                                  class="${inputClass}">${escapeHtml(heroData.description || '')}</textarea>
                    </div>
                </div>
            `;
            
        case 'text':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || '')}" 
                               placeholder="z.B. Über mich" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Text</label>
                        <textarea id="block-content" rows="10" placeholder="Dein Text..." 
                                  class="${inputClass}">${escapeHtml(block?.content || '')}</textarea>
                    </div>
                </div>
            `;
            
        case 'stats':
            const statsData = block ? JSON.parse(block.content || '[]') : [];
            let statsHtml = '';
            for (let i = 0; i < 6; i++) {
                const stat = statsData[i] || {};
                statsHtml += `
                    <div class="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="${labelClass}">Wert</label>
                                <input type="text" data-stat-index="${i}" data-stat-field="value" 
                                       value="${escapeHtml(stat.value || '')}" placeholder="z.B. 100K+" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="${labelClass}">Label</label>
                                <input type="text" data-stat-index="${i}" data-stat-field="label" 
                                       value="${escapeHtml(stat.label || '')}" placeholder="z.B. Followers" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="${labelClass}">Icon (Lucide)</label>
                            <input type="text" data-stat-index="${i}" data-stat-field="icon" 
                                   value="${escapeHtml(stat.icon || '')}" placeholder="z.B. users, heart, eye" 
                                   class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                        </div>
                    </div>
                `;
            }
            return `
                <div>
                    <label class="${labelClass}">Überschrift</label>
                    <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Statistiken')}" 
                           placeholder="z.B. Meine Reichweite" class="${inputClass}">
                </div>
                <div class="space-y-3 mt-4">
                    <label class="${labelClass}">Statistiken (bis zu 6 Metriken)</label>
                    ${statsHtml}
                </div>
                <p class="${helpClass}">Tipp: Lucide Icons findest du auf lucide.dev</p>
            `;
            
        case 'platforms':
            const platformsData = block ? JSON.parse(block.content || '[]') : [];
            let platformsHtml = '';
            const defaultPlatforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter'];
            for (let i = 0; i < 4; i++) {
                const platform = platformsData[i] || { name: defaultPlatforms[i] || '' };
                platformsHtml += `
                    <div class="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label class="${labelClass}">Plattform</label>
                                <input type="text" data-platform-index="${i}" data-platform-field="name" 
                                       value="${escapeHtml(platform.name || '')}" placeholder="z.B. Instagram" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="${labelClass}">Handle</label>
                                <input type="text" data-platform-index="${i}" data-platform-field="handle" 
                                       value="${escapeHtml(platform.handle || '')}" placeholder="@username" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="${labelClass}">Follower</label>
                                <input type="text" data-platform-index="${i}" data-platform-field="followers" 
                                       value="${escapeHtml(platform.followers || '')}" placeholder="z.B. 50K" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="${labelClass}">Icon</label>
                                <input type="text" data-platform-index="${i}" data-platform-field="icon" 
                                       value="${escapeHtml(platform.icon || '')}" placeholder="z.B. instagram" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                        </div>
                        <div class="mt-3">
                            <label class="${labelClass}">Profil URL</label>
                            <input type="text" data-platform-index="${i}" data-platform-field="url" 
                                   value="${escapeHtml(platform.url || '')}" placeholder="https://instagram.com/username" 
                                   class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                        </div>
                    </div>
                `;
            }
            return `
                <div>
                    <label class="${labelClass}">Überschrift</label>
                    <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Social Media')}" 
                           placeholder="z.B. Folge mir auf" class="${inputClass}">
                </div>
                <div class="space-y-3 mt-4">
                    <label class="${labelClass}">Plattformen</label>
                    ${platformsHtml}
                </div>
            `;
            
        case 'partners':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Brand Partners')}" 
                               placeholder="z.B. Zusammenarbeit mit" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Marken (komma-getrennt)</label>
                        <textarea id="block-content" rows="4" placeholder="Nike, Adidas, Samsung, Apple..." 
                                  class="${inputClass}">${escapeHtml(block?.content || '')}</textarea>
                        <p class="${helpClass}">Gib die Namen der Marken durch Komma getrennt ein</p>
                    </div>
                </div>
            `;
            
        case 'rates':
            const ratesData = block ? JSON.parse(block.content || '[]') : [];
            let ratesHtml = '';
            for (let i = 0; i < 4; i++) {
                const rate = ratesData[i] || {};
                ratesHtml += `
                    <div class="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label class="${labelClass}">Service</label>
                                <input type="text" data-rate-index="${i}" data-rate-field="service" 
                                       value="${escapeHtml(rate.service || '')}" placeholder="z.B. Instagram Post" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="${labelClass}">Preis</label>
                                <input type="text" data-rate-index="${i}" data-rate-field="price" 
                                       value="${escapeHtml(rate.price || '')}" placeholder="z.B. €500" 
                                       class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                            </div>
                        </div>
                        <div>
                            <label class="${labelClass}">Beschreibung (optional)</label>
                            <input type="text" data-rate-index="${i}" data-rate-field="description" 
                                   value="${escapeHtml(rate.description || '')}" placeholder="z.B. 1 Post + 3 Stories" 
                                   class="w-full bg-gray-600 text-white rounded px-3 py-2 border border-gray-500 focus:border-cyan-500 focus:outline-none">
                        </div>
                    </div>
                `;
            }
            return `
                <div>
                    <label class="${labelClass}">Überschrift</label>
                    <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Collaboration Rates')}" 
                           placeholder="z.B. Preise & Packages" class="${inputClass}">
                </div>
                <div class="space-y-3 mt-4">
                    <label class="${labelClass}">Services & Preise (bis zu 4)</label>
                    ${ratesHtml}
                </div>
            `;
            
        case 'cta':
            const ctaData = block ? JSON.parse(block.content || '{}') : {};
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Lass uns zusammenarbeiten!')}" 
                               placeholder="z.B. Bereit für eine Kooperation?" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Beschreibung</label>
                        <textarea id="cta-description" rows="3" placeholder="Kurzer Text..." 
                                  class="${inputClass}">${escapeHtml(ctaData.description || '')}</textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="${labelClass}">Button Text</label>
                            <input type="text" id="cta-button-text" value="${escapeHtml(ctaData.button_text || 'Kontakt aufnehmen')}" 
                                   placeholder="z.B. Jetzt anfragen" class="${inputClass}">
                        </div>
                        <div>
                            <label class="${labelClass}">Button URL</label>
                            <input type="text" id="cta-button-url" value="${escapeHtml(ctaData.button_url || '')}" 
                                   placeholder="mailto:email@example.com" class="${inputClass}">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="${labelClass}">Zweiter Button Text (optional)</label>
                            <input type="text" id="cta-secondary-text" value="${escapeHtml(ctaData.secondary_text || '')}" 
                                   placeholder="z.B. Media Kit herunterladen" class="${inputClass}">
                        </div>
                        <div>
                            <label class="${labelClass}">Zweiter Button URL</label>
                            <input type="text" id="cta-secondary-url" value="${escapeHtml(ctaData.secondary_url || '')}" 
                                   placeholder="https://..." class="${inputClass}">
                        </div>
                    </div>
                </div>
            `;
            
        case 'video':
            const videoData = block ? JSON.parse(block.content || '{}') : {};
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Video Pitch')}" 
                               placeholder="z.B. Lerne mich kennen" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Video URL</label>
                        <input type="text" id="video-url" value="${escapeHtml(videoData.video_url || '')}" 
                               placeholder="YouTube, Vimeo oder direkte Video URL" class="${inputClass}">
                        <p class="${helpClass}">Unterstützt: YouTube, Vimeo, oder direkte .mp4 URLs</p>
                    </div>
                    <div>
                        <label class="${labelClass}">Thumbnail URL (optional)</label>
                        <input type="text" id="video-thumbnail" value="${escapeHtml(videoData.thumbnail || '')}" 
                               placeholder="https://..." class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Beschreibung</label>
                        <textarea id="video-description" rows="3" placeholder="Optional..." 
                                  class="${inputClass}">${escapeHtml(videoData.description || '')}</textarea>
                    </div>
                </div>
            `;
            
        case 'audience':
            const audienceData = block ? JSON.parse(block.content || '{}') : {};
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || 'Meine Audience')}" 
                               placeholder="z.B. Zielgruppen-Insights" class="${inputClass}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="${labelClass}">Alter 18-24 (%)</label>
                            <input type="number" id="age-18-24" value="${audienceData.age_18_24 || ''}" 
                                   placeholder="z.B. 25" min="0" max="100" class="${inputClass}">
                        </div>
                        <div>
                            <label class="${labelClass}">Alter 25-34 (%)</label>
                            <input type="number" id="age-25-34" value="${audienceData.age_25_34 || ''}" 
                                   placeholder="z.B. 45" min="0" max="100" class="${inputClass}">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="${labelClass}">Alter 35-44 (%)</label>
                            <input type="number" id="age-35-44" value="${audienceData.age_35_44 || ''}" 
                                   placeholder="z.B. 20" min="0" max="100" class="${inputClass}">
                        </div>
                        <div>
                            <label class="${labelClass}">Alter 45+ (%)</label>
                            <input type="number" id="age-45-plus" value="${audienceData.age_45_plus || ''}" 
                                   placeholder="z.B. 10" min="0" max="100" class="${inputClass}">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="${labelClass}">Weiblich (%)</label>
                            <input type="number" id="gender-female" value="${audienceData.gender_female || ''}" 
                                   placeholder="z.B. 60" min="0" max="100" class="${inputClass}">
                        </div>
                        <div>
                            <label class="${labelClass}">Männlich (%)</label>
                            <input type="number" id="gender-male" value="${audienceData.gender_male || ''}" 
                                   placeholder="z.B. 40" min="0" max="100" class="${inputClass}">
                        </div>
                    </div>
                    <div>
                        <label class="${labelClass}">Top Länder (komma-getrennt)</label>
                        <input type="text" id="top-countries" value="${escapeHtml(audienceData.top_countries || '')}" 
                               placeholder="z.B. Deutschland, Österreich, Schweiz" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Top Städte (komma-getrennt)</label>
                        <input type="text" id="top-cities" value="${escapeHtml(audienceData.top_cities || '')}" 
                               placeholder="z.B. Berlin, München, Hamburg" class="${inputClass}">
                    </div>
                </div>
            `;
            
        case 'custom':
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || '')}" 
                               placeholder="Optional" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">HTML Code</label>
                        <textarea id="block-content" rows="12" placeholder="<div>Dein HTML...</div>" 
                                  class="${inputClass} font-mono text-sm">${escapeHtml(block?.content || '')}</textarea>
                        <p class="${helpClass}">⚠️ Vorsicht: Nur vertrauenswürdigen HTML-Code einfügen!</p>
                    </div>
                </div>
            `;
            
        default:
            return `
                <div class="space-y-4">
                    <div>
                        <label class="${labelClass}">Überschrift</label>
                        <input type="text" id="block-title" value="${escapeHtml(block?.title || '')}" 
                               placeholder="Titel" class="${inputClass}">
                    </div>
                    <div>
                        <label class="${labelClass}">Inhalt (JSON)</label>
                        <textarea id="block-content" rows="10" placeholder="{}" 
                                  class="${inputClass} font-mono text-sm">${escapeHtml(block?.content || '')}</textarea>
                    </div>
                </div>
            `;
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
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
    
    try {
        switch(blockType) {
            case 'hero':
                content = JSON.stringify({
                    tagline: document.getElementById('hero-tagline').value,
                    location: document.getElementById('hero-location').value,
                    image_url: document.getElementById('hero-image-url').value,
                    description: document.getElementById('hero-description').value
                });
                break;
                
            case 'stats':
                const stats = [];
                for (let i = 0; i < 6; i++) {
                    const value = document.querySelector(`[data-stat-index="${i}"][data-stat-field="value"]`)?.value;
                    const label = document.querySelector(`[data-stat-index="${i}"][data-stat-field="label"]`)?.value;
                    const icon = document.querySelector(`[data-stat-index="${i}"][data-stat-field="icon"]`)?.value;
                    if (value || label) {
                        stats.push({ value, label, icon });
                    }
                }
                content = JSON.stringify(stats);
                break;
                
            case 'platforms':
                const platforms = [];
                for (let i = 0; i < 4; i++) {
                    const name = document.querySelector(`[data-platform-index="${i}"][data-platform-field="name"]`)?.value;
                    const handle = document.querySelector(`[data-platform-index="${i}"][data-platform-field="handle"]`)?.value;
                    const followers = document.querySelector(`[data-platform-index="${i}"][data-platform-field="followers"]`)?.value;
                    const icon = document.querySelector(`[data-platform-index="${i}"][data-platform-field="icon"]`)?.value;
                    const url = document.querySelector(`[data-platform-index="${i}"][data-platform-field="url"]`)?.value;
                    if (name) {
                        platforms.push({ name, handle, followers, icon, url });
                    }
                }
                content = JSON.stringify(platforms);
                break;
                
            case 'rates':
                const rates = [];
                for (let i = 0; i < 4; i++) {
                    const service = document.querySelector(`[data-rate-index="${i}"][data-rate-field="service"]`)?.value;
                    const price = document.querySelector(`[data-rate-index="${i}"][data-rate-field="price"]`)?.value;
                    const description = document.querySelector(`[data-rate-index="${i}"][data-rate-field="description"]`)?.value;
                    if (service || price) {
                        rates.push({ service, price, description });
                    }
                }
                content = JSON.stringify(rates);
                break;
                
            case 'cta':
                content = JSON.stringify({
                    description: document.getElementById('cta-description').value,
                    button_text: document.getElementById('cta-button-text').value,
                    button_url: document.getElementById('cta-button-url').value,
                    secondary_text: document.getElementById('cta-secondary-text').value,
                    secondary_url: document.getElementById('cta-secondary-url').value
                });
                break;
                
            case 'video':
                content = JSON.stringify({
                    video_url: document.getElementById('video-url').value,
                    thumbnail: document.getElementById('video-thumbnail').value,
                    description: document.getElementById('video-description').value
                });
                break;
                
            case 'audience':
                content = JSON.stringify({
                    age_18_24: document.getElementById('age-18-24').value,
                    age_25_34: document.getElementById('age-25-34').value,
                    age_35_44: document.getElementById('age-35-44').value,
                    age_45_plus: document.getElementById('age-45-plus').value,
                    gender_female: document.getElementById('gender-female').value,
                    gender_male: document.getElementById('gender-male').value,
                    top_countries: document.getElementById('top-countries').value,
                    top_cities: document.getElementById('top-cities').value
                });
                break;
                
            case 'text':
            case 'partners':
            case 'custom':
            default:
                content = document.getElementById('block-content')?.value || '';
                break;
        }
        
        const endpoint = blockId ? `/api/mediakit/blocks/${blockId}` : '/api/mediakit/blocks';
        const method = blockId ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ 
                block_type: blockType, 
                title, 
                content 
            })
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Speichern');
        }
        
        document.querySelector('.fixed.inset-0')?.remove();
        await loadBlocks();
        
        // Show success message
        showSuccessToast('✓ Block erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('Error saving block:', error);
        showErrorToast('Fehler beim Speichern des Blocks!');
    }
};

function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

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
