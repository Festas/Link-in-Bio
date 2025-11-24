// Real-time Preview Panel
// Provides split-screen preview with device switching

let previewPanel = null;
let previewIframe = null;
let currentDevice = 'mobile';
let isPreviewOpen = false;

const DEVICE_SIZES = {
    mobile: { width: 375, height: 667, icon: '📱', name: 'Mobile' },
    tablet: { width: 768, height: 1024, icon: '📲', name: 'Tablet' },
    desktop: { width: '100%', height: '100%', icon: '💻', name: 'Desktop' }
};

export function initPreviewPanel() {
    console.log('Initializing preview panel...');
    
    // Add toggle button to header
    addPreviewToggleButton();
    
    // Listen for changes to auto-refresh
    setupAutoRefresh();
}

function addPreviewToggleButton() {
    const header = document.querySelector('header .flex.space-x-4');
    if (!header) return;
    
    const button = document.createElement('button');
    button.id = 'preview-toggle-button';
    button.className = 'text-sm text-gray-400 hover:text-white flex items-center space-x-1';
    button.title = 'Live-Vorschau (Ctrl+P)';
    button.innerHTML = `
        <i data-lucide="monitor" class="w-4 h-4"></i>
        <span class="hidden md:inline">Live-Vorschau</span>
    `;
    
    button.addEventListener('click', togglePreview);
    
    // Insert before logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        header.insertBefore(button, logoutButton);
    } else {
        header.appendChild(button);
    }
    
    // Re-render lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

export function togglePreview() {
    if (isPreviewOpen) {
        closePreview();
    } else {
        openPreview();
    }
}

function openPreview() {
    if (previewPanel) {
        previewPanel.style.display = 'block';
        isPreviewOpen = true;
        return;
    }
    
    // Create preview panel
    createPreviewPanel();
    isPreviewOpen = true;
    
    // Adjust main content
    adjustMainContentForPreview(true);
    
    // Load preview
    refreshPreview();
}

function closePreview() {
    if (previewPanel) {
        previewPanel.style.display = 'none';
    }
    isPreviewOpen = false;
    
    // Restore main content
    adjustMainContentForPreview(false);
}

function createPreviewPanel() {
    // Create panel container
    previewPanel = document.createElement('div');
    previewPanel.id = 'preview-panel';
    previewPanel.className = 'fixed right-0 top-0 h-screen bg-gray-900 border-l border-gray-700 shadow-2xl z-40';
    previewPanel.style.width = '40%';
    previewPanel.style.minWidth = '400px';
    
    previewPanel.innerHTML = `
        <div class="h-full flex flex-col">
            <!-- Preview Header -->
            <div class="bg-gray-800 border-b border-gray-700 p-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-white flex items-center">
                        <i data-lucide="monitor" class="w-5 h-5 mr-2"></i>
                        Live-Vorschau
                    </h3>
                    <button id="close-preview-button" class="text-gray-400 hover:text-white" title="Schließen (ESC)">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <!-- Device Switcher -->
                <div class="flex items-center space-x-2">
                    <button class="device-button active" data-device="mobile" title="Mobile (375x667)">
                        <span class="text-xl">📱</span>
                        <span class="text-xs ml-1">Mobile</span>
                    </button>
                    <button class="device-button" data-device="tablet" title="Tablet (768x1024)">
                        <span class="text-xl">📲</span>
                        <span class="text-xs ml-1">Tablet</span>
                    </button>
                    <button class="device-button" data-device="desktop" title="Desktop (volle Breite)">
                        <span class="text-xl">💻</span>
                        <span class="text-xs ml-1">Desktop</span>
                    </button>
                    
                    <button id="refresh-preview-button" class="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm" title="Aktualisieren">
                        <i data-lucide="refresh-cw" class="w-4 h-4 inline"></i>
                    </button>
                </div>
            </div>
            
            <!-- Preview Content -->
            <div class="flex-1 bg-gray-800 p-4 overflow-auto">
                <div id="preview-container" class="mx-auto bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300">
                    <iframe id="preview-iframe" 
                            class="w-full h-full border-0" 
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                            title="Preview">
                    </iframe>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewPanel);
    
    // Add event listeners
    document.getElementById('close-preview-button')?.addEventListener('click', closePreview);
    document.getElementById('refresh-preview-button')?.addEventListener('click', refreshPreview);
    
    // Device switcher
    document.querySelectorAll('.device-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const device = e.currentTarget.dataset.device;
            switchDevice(device);
        });
    });
    
    // Get iframe reference
    previewIframe = document.getElementById('preview-iframe');
    
    // Re-render lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Set initial device
    switchDevice('mobile');
}

function switchDevice(device) {
    if (!DEVICE_SIZES[device]) return;
    
    currentDevice = device;
    const size = DEVICE_SIZES[device];
    const container = document.getElementById('preview-container');
    
    if (!container) return;
    
    // Update active button
    document.querySelectorAll('.device-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.device === device) {
            btn.classList.add('active');
        }
    });
    
    // Update container size
    if (device === 'desktop') {
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.maxWidth = 'none';
    } else {
        container.style.width = size.width + 'px';
        container.style.height = size.height + 'px';
        container.style.maxWidth = size.width + 'px';
    }
    
    // Update iframe
    if (previewIframe) {
        previewIframe.style.width = '100%';
        previewIframe.style.height = device === 'desktop' ? '800px' : size.height + 'px';
    }
}

function refreshPreview() {
    if (!previewIframe) return;
    
    // Get current page slug
    const pageSelector = document.getElementById('page-selector');
    let slug = '';
    
    if (pageSelector && pageSelector.selectedOptions.length > 0) {
        const selectedOption = pageSelector.selectedOptions[0];
        slug = selectedOption.dataset.slug || '';
    }
    
    // Load preview
    const previewUrl = slug ? `/${slug}` : '/';
    previewIframe.src = previewUrl;
    
    // Show loading indicator
    showPreviewLoading();
}

function showPreviewLoading() {
    const container = document.getElementById('preview-container');
    if (container) {
        container.classList.add('opacity-50');
        
        if (previewIframe) {
            previewIframe.addEventListener('load', () => {
                container.classList.remove('opacity-50');
            }, { once: true });
        }
    }
}

function adjustMainContentForPreview(isOpen) {
    const mainContent = document.querySelector('.max-w-4xl');
    
    if (!mainContent) return;
    
    if (isOpen) {
        mainContent.style.marginRight = '42%';
        mainContent.style.transition = 'margin-right 0.3s ease';
    } else {
        mainContent.style.marginRight = 'auto';
    }
}

function setupAutoRefresh() {
    // Listen for form submissions and changes
    const adminContainer = document.querySelector('.max-w-4xl');
    if (!adminContainer) return;
    
    // Debounce auto-refresh
    let refreshTimeout = null;
    
    const scheduleRefresh = () => {
        if (!isPreviewOpen) return;
        
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(() => {
            refreshPreview();
        }, 1000); // Refresh 1 second after last change
    };
    
    // Listen for save button clicks
    document.addEventListener('click', (e) => {
        if (e.target.id === 'save-order-button' || 
            e.target.id === 'save-profile-button' ||
            e.target.closest('#save-order-button') ||
            e.target.closest('#save-profile-button')) {
            // Wait a bit for the save to complete
            setTimeout(scheduleRefresh, 500);
        }
    });
    
    // Listen for form inputs (for profile changes)
    adminContainer.addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT') {
            scheduleRefresh();
        }
    });
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .device-button {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background-color: #374151;
        color: #9CA3AF;
        border-radius: 0.375rem;
        transition: all 0.2s;
        border: 2px solid transparent;
    }
    
    .device-button:hover {
        background-color: #4B5563;
        color: #FFFFFF;
    }
    
    .device-button.active {
        background-color: #3B82F6;
        color: #FFFFFF;
        border-color: #60A5FA;
    }
    
    #preview-container {
        transition: opacity 0.3s ease;
    }
`;
document.head.appendChild(style);
