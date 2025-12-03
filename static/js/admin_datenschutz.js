/**
 * Datenschutz Admin
 * Page-specific functionality for Datenschutz (Privacy Policy) admin page
 */

class DatenschutzAdmin {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadPrivacySettings();
    }

    setupEventListeners() {
        // Cookie settings changes
        const cookieCheckboxes = ['cookie-analytics', 'cookie-marketing'];
        cookieCheckboxes.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.savePrivacySettings();
            });
        });

        // Third-party service checkboxes
        const serviceCheckboxes = [
            'service-google-analytics', 'service-google-fonts', 'service-youtube',
            'service-instagram', 'service-tiktok', 'service-cloudflare'
        ];
        serviceCheckboxes.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.savePrivacySettings();
            });
        });

        // Custom services textarea
        document.getElementById('service-custom')?.addEventListener('input', 
            this.debounce(() => {
                this.savePrivacySettings();
            }, 1000)
        );

        // Data processing fields
        const dataFields = ['data-purpose', 'data-legal-basis', 'data-retention'];
        dataFields.forEach(id => {
            document.getElementById(id)?.addEventListener('input', 
                this.debounce(() => {
                    this.savePrivacySettings();
                }, 1000)
            );
        });

        // GDPR standard sections
        const gdprCheckboxes = ['gdpr-rights', 'gdpr-contact', 'gdpr-supervisory', 'gdpr-ssl'];
        gdprCheckboxes.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.savePrivacySettings();
            });
        });

        // Save button enhancement
        const saveBtn = document.getElementById('save-page');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.savePrivacySettings();
            });
        }
    }

    async loadPrivacySettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/special-pages/datenschutz', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            const settings = data.page?.settings || {};

            // Cookie settings
            if (settings.cookies) {
                document.getElementById('cookie-analytics').checked = settings.cookies.analytics || false;
                document.getElementById('cookie-marketing').checked = settings.cookies.marketing || false;
            }

            // Third-party services
            if (settings.services) {
                document.getElementById('service-google-analytics').checked = settings.services.googleAnalytics || false;
                document.getElementById('service-google-fonts').checked = settings.services.googleFonts || false;
                document.getElementById('service-youtube').checked = settings.services.youtube || false;
                document.getElementById('service-instagram').checked = settings.services.instagram || false;
                document.getElementById('service-tiktok').checked = settings.services.tiktok || false;
                document.getElementById('service-cloudflare').checked = settings.services.cloudflare || false;
                document.getElementById('service-custom').value = settings.services.custom || '';
            }

            // Data processing
            if (settings.dataProcessing) {
                document.getElementById('data-purpose').value = settings.dataProcessing.purpose || '';
                document.getElementById('data-legal-basis').value = settings.dataProcessing.legalBasis || '';
                document.getElementById('data-retention').value = settings.dataProcessing.retention || '';
            }

            // GDPR sections
            if (settings.gdprSections) {
                document.getElementById('gdpr-rights').checked = settings.gdprSections.rights !== false;
                document.getElementById('gdpr-contact').checked = settings.gdprSections.contact !== false;
                document.getElementById('gdpr-supervisory').checked = settings.gdprSections.supervisory !== false;
                document.getElementById('gdpr-ssl').checked = settings.gdprSections.ssl !== false;
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
        }
    }

    async savePrivacySettings() {
        try {
            const token = localStorage.getItem('authToken');
            
            const settings = {
                cookies: {
                    essential: true, // Always true
                    analytics: document.getElementById('cookie-analytics')?.checked || false,
                    marketing: document.getElementById('cookie-marketing')?.checked || false
                },
                services: {
                    googleAnalytics: document.getElementById('service-google-analytics')?.checked || false,
                    googleFonts: document.getElementById('service-google-fonts')?.checked || false,
                    youtube: document.getElementById('service-youtube')?.checked || false,
                    instagram: document.getElementById('service-instagram')?.checked || false,
                    tiktok: document.getElementById('service-tiktok')?.checked || false,
                    cloudflare: document.getElementById('service-cloudflare')?.checked || false,
                    custom: document.getElementById('service-custom')?.value || ''
                },
                dataProcessing: {
                    purpose: document.getElementById('data-purpose')?.value || '',
                    legalBasis: document.getElementById('data-legal-basis')?.value || '',
                    retention: document.getElementById('data-retention')?.value || ''
                },
                gdprSections: {
                    rights: document.getElementById('gdpr-rights')?.checked !== false,
                    contact: document.getElementById('gdpr-contact')?.checked !== false,
                    supervisory: document.getElementById('gdpr-supervisory')?.checked !== false,
                    ssl: document.getElementById('gdpr-ssl')?.checked !== false
                }
            };

            await fetch('/api/special-pages/datenschutz', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Datenschutzerklärung',
                    subtitle: 'Informationen zum Datenschutz',
                    settings: settings
                })
            });

            this.showStatus('Datenschutzeinstellungen gespeichert', 'success');
        } catch (error) {
            console.error('Error saving privacy settings:', error);
            this.showStatus('Fehler beim Speichern', 'error');
        }
    }

    showStatus(message, type = 'success') {
        const statusEl = document.getElementById('status-message');
        const statusText = document.getElementById('status-text');
        
        if (!statusEl || !statusText) return;
        
        statusEl.className = `rounded-xl p-4 ${type === 'success' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`;
        statusText.textContent = message;
        statusText.className = type === 'success' ? 'text-green-300' : 'text-red-300';
        statusEl.classList.remove('hidden');
        
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
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

// Initialize Datenschutz Admin
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PAGE_KEY !== 'undefined' && PAGE_KEY === 'datenschutz') {
        new DatenschutzAdmin();
    }
});
