// Fixed Live Preview Button - Shows preview in a modal popup
// Always visible in bottom-left corner

let previewModal = null;
let previewIframe = null;
let isPreviewVisible = false;

export function initFixedPreviewButton() {
    createFixedPreviewButton();
    createPreviewModal();
}

function createFixedPreviewButton() {
    // Check if button already exists
    if (document.getElementById('fixed-preview-btn')) return;
    
    const button = document.createElement('button');
    button.id = 'fixed-preview-btn';
    button.className = 'fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 transition-all hover:scale-105';
    button.innerHTML = `
        <i data-lucide="eye" class="w-5 h-5"></i>
        <span class="font-medium">Live-Vorschau</span>
    `;
    
    button.addEventListener('click', openPreviewModal);
    
    document.body.appendChild(button);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function createPreviewModal() {
    // Check if modal already exists
    if (document.getElementById('preview-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-[100] hidden items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-gray-900 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-700">
                <div class="flex items-center space-x-4">
                    <h3 class="text-xl font-semibold text-white flex items-center space-x-2">
                        <i data-lucide="eye" class="w-5 h-5"></i>
                        <span>Live-Vorschau</span>
                    </h3>
                    <div class="text-sm text-gray-400" id="preview-url-display"></div>
                </div>
                <div class="flex items-center space-x-2">
                    <!-- Device switcher -->
                    <div class="flex bg-gray-700 rounded-lg p-1 space-x-1">
                        <button data-device="mobile" class="preview-device-btn bg-gray-600 p-2 rounded hover:bg-gray-600 transition-colors" title="Mobile (375px)">
                            <i data-lucide="smartphone" class="w-4 h-4 text-gray-300"></i>
                        </button>
                        <button data-device="tablet" class="preview-device-btn p-2 rounded hover:bg-gray-600 transition-colors" title="Tablet (768px)">
                            <i data-lucide="tablet" class="w-4 h-4 text-gray-300"></i>
                        </button>
                        <button data-device="desktop" class="preview-device-btn p-2 rounded hover:bg-gray-600 transition-colors" title="Desktop">
                            <i data-lucide="monitor" class="w-4 h-4 text-gray-300"></i>
                        </button>
                    </div>
                    <button id="preview-refresh-btn" class="p-2 text-gray-400 hover:text-white transition-colors" title="Aktualisieren">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                    <button id="close-preview-modal" class="p-2 text-gray-400 hover:text-white transition-colors" title="Schließen">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
            
            <!-- Preview content -->
            <div class="flex-1 overflow-hidden bg-gray-800 p-4 flex items-center justify-center">
                <div id="preview-iframe-container" class="transition-all duration-300 bg-white rounded-lg shadow-2xl overflow-hidden" style="width: 375px; height: 667px;">
                    <iframe 
                        id="preview-iframe" 
                        class="w-full h-full"
                        frameborder="0"
                    ></iframe>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup event listeners
    const closeBtn = modal.querySelector('#close-preview-modal');
    closeBtn.addEventListener('click', closePreviewModal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePreviewModal();
        }
    });
    
    // Device switcher
    const deviceButtons = modal.querySelectorAll('.preview-device-btn');
    deviceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const device = btn.dataset.device;
            setPreviewDevice(device);
            
            // Update active state
            deviceButtons.forEach(b => b.classList.remove('bg-gray-600'));
            btn.classList.add('bg-gray-600');
        });
    });
    
    // Refresh button
    const refreshBtn = modal.querySelector('#preview-refresh-btn');
    refreshBtn.addEventListener('click', refreshPreview);
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPreviewVisible) {
            closePreviewModal();
        }
    });
    
    previewModal = modal;
    previewIframe = modal.querySelector('#preview-iframe');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function openPreviewModal() {
    if (!previewModal) {
        createPreviewModal();
    }
    
    // First save any pending changes
    await saveBeforePreview();
    
    // Show modal
    previewModal.classList.remove('hidden');
    previewModal.classList.add('flex');
    isPreviewVisible = true;
    
    // Load preview
    refreshPreview();
}

function closePreviewModal() {
    if (!previewModal) return;
    
    previewModal.classList.add('hidden');
    previewModal.classList.remove('flex');
    isPreviewVisible = false;
}

function refreshPreview() {
    if (!previewIframe) return;
    
    // Get current page URL
    let previewUrl = '/';
    
    // Check if we're on a special page
    const pageSelector = document.getElementById('page-selector');
    if (pageSelector && pageSelector.value) {
        const value = pageSelector.value;
        
        if (value.startsWith('special:')) {
            // Special page
            const pageKey = value.replace('special:', '');
            const specialPages = {
                'ueber-mich': '/ueber-mich',
                'impressum': '/impressum',
                'datenschutz': '/datenschutz',
                'kontakt': '/kontakt',
                'mediakit': '/mediakit'
            };
            previewUrl = specialPages[pageKey] || '/';
        } else {
            // Regular page - get the slug
            const pageId = parseInt(value);
            // For now, just show main page
            previewUrl = '/';
        }
    }
    
    // Update URL display
    const urlDisplay = document.getElementById('preview-url-display');
    if (urlDisplay) {
        urlDisplay.textContent = previewUrl;
    }
    
    // Load preview with cache buster
    previewIframe.src = `${previewUrl}?preview=1&t=${Date.now()}`;
}

function setPreviewDevice(device) {
    const container = document.getElementById('preview-iframe-container');
    if (!container) return;
    
    // Update container size based on device
    switch (device) {
        case 'mobile':
            container.style.width = '375px';
            container.style.height = '667px';
            break;
        case 'tablet':
            container.style.width = '768px';
            container.style.height = '1024px';
            break;
        case 'desktop':
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.maxWidth = '1200px';
            break;
    }
}

async function saveBeforePreview() {
    // Check if we're editing a special page
    const specialPageEditor = document.getElementById('special-page-editor-panel');
    if (specialPageEditor && specialPageEditor.style.display !== 'none') {
        // Save special page
        const saveBtn = document.getElementById('save-special-page-content');
        if (saveBtn) {
            // Trigger save - we'll wait a bit for it to complete
            saveBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } else {
        // Check if we're editing regular items
        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer) {
            // Items are auto-saved in this system, so we might not need to do anything
            // But we'll add a small delay to ensure any pending saves complete
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}

// Export function to trigger preview from other modules
export function showPreview() {
    openPreviewModal();
}
