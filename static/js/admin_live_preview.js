// Live Preview Panel - Side-by-side preview while editing
export function initLivePreview() {
    const previewButton = document.getElementById('toggle-live-preview');
    const previewPanel = document.getElementById('live-preview-panel');
    const previewIframe = document.getElementById('live-preview-iframe');
    const adminContent = document.querySelector('.max-w-4xl');
    
    if (!previewButton || !previewPanel) {
        console.log('Live preview elements not found, creating...');
        createLivePreviewUI();
        return initLivePreview();
    }
    
    let isPreviewVisible = localStorage.getItem('livePreviewVisible') === 'true';
    
    if (isPreviewVisible) {
        showLivePreview();
    }
    
    previewButton.addEventListener('click', toggleLivePreview);
    
    // Auto-refresh on changes
    document.addEventListener('itemsChanged', refreshPreview);
    document.addEventListener('settingsChanged', refreshPreview);
    
    // Refresh button
    const refreshBtn = document.getElementById('preview-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshPreview);
    }
    
    // Device switcher
    const deviceButtons = document.querySelectorAll('[data-device]');
    deviceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const device = btn.dataset.device;
            setPreviewDevice(device);
            
            // Update active state
            deviceButtons.forEach(b => b.classList.remove('bg-gray-600'));
            btn.classList.add('bg-gray-600');
        });
    });
    
    function toggleLivePreview() {
        isPreviewVisible = !isPreviewVisible;
        localStorage.setItem('livePreviewVisible', isPreviewVisible);
        
        if (isPreviewVisible) {
            showLivePreview();
        } else {
            hideLivePreview();
        }
    }
    
    function showLivePreview() {
        previewPanel.classList.remove('hidden');
        adminContent.classList.add('preview-mode');
        previewButton.innerHTML = `
            <i data-lucide="eye-off" class="w-4 h-4"></i>
            <span>Vorschau ausblenden</span>
        `;
        
        // Update body class for grid layout
        document.body.classList.add('live-preview-active');
        
        refreshPreview();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    function hideLivePreview() {
        previewPanel.classList.add('hidden');
        adminContent.classList.remove('preview-mode');
        previewButton.innerHTML = `
            <i data-lucide="eye" class="w-4 h-4"></i>
            <span>Live-Vorschau</span>
        `;
        
        document.body.classList.remove('live-preview-active');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    function refreshPreview() {
        if (!isPreviewVisible) return;
        
        const currentDevice = document.querySelector('[data-device].bg-gray-600')?.dataset.device || 'mobile';
        previewIframe.src = `/?preview=1&t=${Date.now()}`;
        
        // Show loading state
        const loadingOverlay = document.getElementById('preview-loading');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            
            previewIframe.onload = () => {
                loadingOverlay.classList.add('hidden');
            };
        }
    }
    
    function setPreviewDevice(device) {
        const iframe = previewIframe;
        const container = iframe.parentElement;
        
        // Remove all device classes
        container.classList.remove('preview-mobile', 'preview-tablet', 'preview-desktop');
        
        // Add new device class
        container.classList.add(`preview-${device}`);
        
        // Update iframe width
        switch (device) {
            case 'mobile':
                iframe.style.width = '375px';
                iframe.style.height = '667px';
                break;
            case 'tablet':
                iframe.style.width = '768px';
                iframe.style.height = '1024px';
                break;
            case 'desktop':
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                break;
        }
    }
}

function createLivePreviewUI() {
    // Add live preview toggle button to header
    const header = document.querySelector('header .flex.space-x-4');
    if (header) {
        const previewToggle = document.createElement('button');
        previewToggle.id = 'toggle-live-preview';
        previewToggle.className = 'text-sm text-gray-400 hover:text-white flex items-center space-x-1';
        previewToggle.title = 'Live-Vorschau ein/ausblenden';
        previewToggle.innerHTML = `
            <i data-lucide="eye" class="w-4 h-4"></i>
            <span class="hidden md:inline">Live-Vorschau</span>
        `;
        header.insertBefore(previewToggle, header.firstChild);
    }
    
    // Create preview panel
    const previewPanel = document.createElement('div');
    previewPanel.id = 'live-preview-panel';
    previewPanel.className = 'hidden';
    previewPanel.innerHTML = `
        <div class="preview-header">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-white">Live-Vorschau</h3>
                <div class="flex items-center space-x-2">
                    <!-- Device switcher -->
                    <div class="flex bg-gray-700 rounded-lg p-1 space-x-1">
                        <button data-device="mobile" class="bg-gray-600 p-2 rounded hover:bg-gray-600 transition-colors" title="Mobile">
                            <i data-lucide="smartphone" class="w-4 h-4 text-gray-300"></i>
                        </button>
                        <button data-device="tablet" class="p-2 rounded hover:bg-gray-600 transition-colors" title="Tablet">
                            <i data-lucide="tablet" class="w-4 h-4 text-gray-300"></i>
                        </button>
                        <button data-device="desktop" class="p-2 rounded hover:bg-gray-600 transition-colors" title="Desktop">
                            <i data-lucide="monitor" class="w-4 h-4 text-gray-300"></i>
                        </button>
                    </div>
                    <button id="preview-refresh" class="p-2 text-gray-400 hover:text-white transition-colors" title="Aktualisieren">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="preview-container preview-mobile">
            <div id="preview-loading" class="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10 hidden">
                <div class="text-white">
                    <svg class="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-sm">Lädt...</p>
                </div>
            </div>
            <iframe 
                id="live-preview-iframe" 
                style="width: 375px; height: 667px;"
                class="bg-white rounded-lg shadow-2xl mx-auto"
                frameborder="0"
            ></iframe>
        </div>
    `;
    
    document.body.appendChild(previewPanel);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Dispatch custom events when items/settings change
export function notifyItemsChanged() {
    document.dispatchEvent(new CustomEvent('itemsChanged'));
}

export function notifySettingsChanged() {
    document.dispatchEvent(new CustomEvent('settingsChanged'));
}
