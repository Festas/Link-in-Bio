/**
 * Media Kit Enhanced Admin
 * Additional functionality specific to Media Kit admin page
 */

class MediaKitAdmin {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Access control change
        document.getElementById('mediakit-access-control')?.addEventListener('change', (e) => {
            this.saveSettings();
        });

        // Video pitch URL change (debounced)
        document.getElementById('mediakit-video-pitch')?.addEventListener('input', 
            this.debounce(() => {
                this.saveSettings();
            }, 1000)
        );

        // Refresh stats button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.refresh-stats')) {
                this.refreshSocialStats();
            }
        });
    }

    async loadSettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/mediakit/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            const settings = data.settings || {};
            
            if (settings.access_control) {
                document.getElementById('mediakit-access-control').value = settings.access_control;
            }
            if (settings.video_pitch_url) {
                document.getElementById('mediakit-video-pitch').value = settings.video_pitch_url;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            const token = localStorage.getItem('authToken');
            const settings = {
                access_control: document.getElementById('mediakit-access-control')?.value || 'public',
                video_pitch_url: document.getElementById('mediakit-video-pitch')?.value || ''
            };

            await fetch('/api/mediakit/settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async refreshSocialStats() {
        const btn = document.querySelector('.refresh-stats');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 inline mr-1 animate-spin"></i> Aktualisiere...';
        
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/mediakit/refresh-social-stats', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to refresh stats');
            }

            btn.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline mr-1"></i> Aktualisiert!';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 2000);
        } catch (error) {
            console.error('Error refreshing stats:', error);
            btn.innerHTML = '<i data-lucide="x" class="w-4 h-4 inline mr-1"></i> Fehler';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 2000);
        }
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

// Initialize Media Kit Admin
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PAGE_KEY !== 'undefined' && PAGE_KEY === 'mediakit') {
        new MediaKitAdmin();
    }
});
