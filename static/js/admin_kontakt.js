/**
 * Kontakt Admin
 * Page-specific functionality for Contact page admin
 */

class KontaktAdmin {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadContactSettings();
    }

    setupEventListeners() {
        // Email recipient fields
        const emailFields = ['contact-recipient-email', 'contact-cc-email'];
        emailFields.forEach(id => {
            document.getElementById(id)?.addEventListener('input', 
                this.debounce(() => {
                    this.saveContactSettings();
                }, 1000)
            );
        });

        // Form field checkboxes
        const fieldCheckboxes = ['field-phone', 'field-subject', 'field-company'];
        fieldCheckboxes.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.saveContactSettings();
            });
        });

        // Subject options textarea
        document.getElementById('subject-options')?.addEventListener('input', 
            this.debounce(() => {
                this.saveContactSettings();
            }, 1000)
        );

        // Auto-reply settings
        document.getElementById('auto-reply-enabled')?.addEventListener('change', (e) => {
            this.toggleAutoReplySettings(e.target.checked);
            this.saveContactSettings();
        });

        const autoReplyFields = ['auto-reply-subject', 'auto-reply-message'];
        autoReplyFields.forEach(id => {
            document.getElementById(id)?.addEventListener('input', 
                this.debounce(() => {
                    this.saveContactSettings();
                }, 1000)
            );
        });

        // Display settings
        const displayFields = [
            'display-email', 'display-phone', 'display-address', 'display-hours',
            'display-email-show', 'display-phone-show', 'display-address-show', 'display-hours-show'
        ];
        displayFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const eventType = el.type === 'checkbox' ? 'change' : 'input';
                el.addEventListener(eventType, 
                    this.debounce(() => {
                        this.saveContactSettings();
                    }, eventType === 'change' ? 0 : 1000)
                );
            }
        });

        // Social media fields
        const socialFields = ['social-instagram', 'social-twitter', 'social-linkedin', 'social-youtube'];
        socialFields.forEach(id => {
            document.getElementById(id)?.addEventListener('input', 
                this.debounce(() => {
                    this.saveContactSettings();
                }, 1000)
            );
        });

        // Save button enhancement
        const saveBtn = document.getElementById('save-page');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.saveContactSettings();
            });
        }
    }

    toggleAutoReplySettings(enabled) {
        const settingsDiv = document.getElementById('auto-reply-settings');
        if (settingsDiv) {
            settingsDiv.style.opacity = enabled ? '1' : '0.5';
            const inputs = settingsDiv.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.disabled = !enabled;
            });
        }
    }

    async loadContactSettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/special-pages/kontakt', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            const settings = data.page?.settings || {};

            // Email recipients
            if (settings.email) {
                document.getElementById('contact-recipient-email').value = settings.email.recipient || '';
                document.getElementById('contact-cc-email').value = settings.email.cc || '';
            }

            // Form fields
            if (settings.formFields) {
                document.getElementById('field-phone').checked = settings.formFields.phone || false;
                document.getElementById('field-subject').checked = settings.formFields.subject !== false;
                document.getElementById('field-company').checked = settings.formFields.company || false;
            }

            // Subject options
            if (settings.subjectOptions) {
                document.getElementById('subject-options').value = settings.subjectOptions.join('\n');
            }

            // Auto-reply
            if (settings.autoReply) {
                const enabled = settings.autoReply.enabled || false;
                document.getElementById('auto-reply-enabled').checked = enabled;
                document.getElementById('auto-reply-subject').value = settings.autoReply.subject || '';
                document.getElementById('auto-reply-message').value = settings.autoReply.message || '';
                this.toggleAutoReplySettings(enabled);
            } else {
                this.toggleAutoReplySettings(false);
            }

            // Display settings
            if (settings.display) {
                document.getElementById('display-email').value = settings.display.email || '';
                document.getElementById('display-email-show').checked = settings.display.emailShow !== false;
                document.getElementById('display-phone').value = settings.display.phone || '';
                document.getElementById('display-phone-show').checked = settings.display.phoneShow || false;
                document.getElementById('display-address').value = settings.display.address || '';
                document.getElementById('display-address-show').checked = settings.display.addressShow || false;
                document.getElementById('display-hours').value = settings.display.hours || '';
                document.getElementById('display-hours-show').checked = settings.display.hoursShow || false;
            }

            // Social media
            if (settings.social) {
                document.getElementById('social-instagram').value = settings.social.instagram || '';
                document.getElementById('social-twitter').value = settings.social.twitter || '';
                document.getElementById('social-linkedin').value = settings.social.linkedin || '';
                document.getElementById('social-youtube').value = settings.social.youtube || '';
            }
        } catch (error) {
            console.error('Error loading contact settings:', error);
        }
    }

    async saveContactSettings() {
        try {
            const token = localStorage.getItem('authToken');
            
            const subjectOptionsText = document.getElementById('subject-options')?.value || '';
            const subjectOptions = subjectOptionsText.split('\n').filter(s => s.trim());

            const settings = {
                email: {
                    recipient: document.getElementById('contact-recipient-email')?.value || '',
                    cc: document.getElementById('contact-cc-email')?.value || ''
                },
                formFields: {
                    name: true, // Always required
                    email: true, // Always required
                    message: true, // Always required
                    phone: document.getElementById('field-phone')?.checked || false,
                    subject: document.getElementById('field-subject')?.checked !== false,
                    company: document.getElementById('field-company')?.checked || false
                },
                subjectOptions: subjectOptions,
                autoReply: {
                    enabled: document.getElementById('auto-reply-enabled')?.checked || false,
                    subject: document.getElementById('auto-reply-subject')?.value || '',
                    message: document.getElementById('auto-reply-message')?.value || ''
                },
                display: {
                    email: document.getElementById('display-email')?.value || '',
                    emailShow: document.getElementById('display-email-show')?.checked !== false,
                    phone: document.getElementById('display-phone')?.value || '',
                    phoneShow: document.getElementById('display-phone-show')?.checked || false,
                    address: document.getElementById('display-address')?.value || '',
                    addressShow: document.getElementById('display-address-show')?.checked || false,
                    hours: document.getElementById('display-hours')?.value || '',
                    hoursShow: document.getElementById('display-hours-show')?.checked || false
                },
                social: {
                    instagram: document.getElementById('social-instagram')?.value || '',
                    twitter: document.getElementById('social-twitter')?.value || '',
                    linkedin: document.getElementById('social-linkedin')?.value || '',
                    youtube: document.getElementById('social-youtube')?.value || ''
                }
            };

            await fetch('/api/special-pages/kontakt', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Kontakt',
                    subtitle: 'Kontaktiere mich',
                    settings: settings
                })
            });

            this.showStatus('Kontakteinstellungen gespeichert', 'success');
        } catch (error) {
            console.error('Error saving contact settings:', error);
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

// Initialize Kontakt Admin
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PAGE_KEY !== 'undefined' && PAGE_KEY === 'kontakt') {
        new KontaktAdmin();
    }
});
