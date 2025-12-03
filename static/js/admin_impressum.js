/**
 * Impressum Admin
 * Page-specific functionality for Impressum admin page
 */

class ImpressumAdmin {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadLegalInfo();
        this.updatePreview();
    }

    setupEventListeners() {
        // Form field changes trigger preview update
        const formFields = document.querySelectorAll('#legal-info-form input, #legal-info-form textarea');
        formFields.forEach(field => {
            field.addEventListener('input', this.debounce(() => {
                this.updatePreview();
            }, 500));
        });

        // Disclaimer checkboxes
        document.getElementById('disclaimer-links')?.addEventListener('change', () => this.updatePreview());
        document.getElementById('disclaimer-content')?.addEventListener('change', () => this.updatePreview());
        document.getElementById('disclaimer-copyright')?.addEventListener('change', () => this.updatePreview());

        // Save button enhancement
        const saveBtn = document.getElementById('save-page');
        if (saveBtn) {
            const originalClick = saveBtn.onclick;
            saveBtn.addEventListener('click', async (e) => {
                await this.saveLegalInfo();
            });
        }
    }

    async loadLegalInfo() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/special-pages/impressum', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            const content = data.page?.content || {};
            const settings = data.page?.settings || {};

            // Populate form fields
            if (typeof content === 'object') {
                document.getElementById('legal-company-name').value = content.company_name || '';
                document.getElementById('legal-company-type').value = content.company_type || '';
                document.getElementById('legal-street').value = content.street || '';
                document.getElementById('legal-city').value = content.city || '';
                document.getElementById('legal-country').value = content.country || 'Deutschland';
                document.getElementById('legal-email').value = content.email || '';
                document.getElementById('legal-phone').value = content.phone || '';
                document.getElementById('legal-vat-id').value = content.vat_id || '';
                document.getElementById('legal-trade-register').value = content.trade_register || '';
                document.getElementById('legal-responsible').value = content.responsible || '';
            }

            // Disclaimer checkboxes
            if (settings.disclaimers) {
                document.getElementById('disclaimer-links').checked = settings.disclaimers.links || false;
                document.getElementById('disclaimer-content').checked = settings.disclaimers.content || false;
                document.getElementById('disclaimer-copyright').checked = settings.disclaimers.copyright || false;
            }

            this.updatePreview();
        } catch (error) {
            console.error('Error loading legal info:', error);
        }
    }

    async saveLegalInfo() {
        try {
            const token = localStorage.getItem('authToken');
            
            const content = {
                company_name: document.getElementById('legal-company-name')?.value || '',
                company_type: document.getElementById('legal-company-type')?.value || '',
                street: document.getElementById('legal-street')?.value || '',
                city: document.getElementById('legal-city')?.value || '',
                country: document.getElementById('legal-country')?.value || 'Deutschland',
                email: document.getElementById('legal-email')?.value || '',
                phone: document.getElementById('legal-phone')?.value || '',
                vat_id: document.getElementById('legal-vat-id')?.value || '',
                trade_register: document.getElementById('legal-trade-register')?.value || '',
                responsible: document.getElementById('legal-responsible')?.value || ''
            };

            const settings = {
                disclaimers: {
                    links: document.getElementById('disclaimer-links')?.checked || false,
                    content: document.getElementById('disclaimer-content')?.checked || false,
                    copyright: document.getElementById('disclaimer-copyright')?.checked || false
                }
            };

            await fetch('/api/special-pages/impressum', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Impressum',
                    subtitle: 'Impressum und rechtliche Angaben',
                    content: JSON.stringify(content),
                    settings: settings
                })
            });

            this.showStatus('Impressum gespeichert', 'success');
        } catch (error) {
            console.error('Error saving legal info:', error);
            this.showStatus('Fehler beim Speichern', 'error');
        }
    }

    updatePreview() {
        const preview = document.getElementById('impressum-preview');
        if (!preview) return;

        const companyName = document.getElementById('legal-company-name')?.value || '';
        const companyType = document.getElementById('legal-company-type')?.value || '';
        const street = document.getElementById('legal-street')?.value || '';
        const city = document.getElementById('legal-city')?.value || '';
        const country = document.getElementById('legal-country')?.value || '';
        const email = document.getElementById('legal-email')?.value || '';
        const phone = document.getElementById('legal-phone')?.value || '';
        const vatId = document.getElementById('legal-vat-id')?.value || '';
        const tradeRegister = document.getElementById('legal-trade-register')?.value || '';
        const responsible = document.getElementById('legal-responsible')?.value || '';

        let html = '<div class="space-y-4">';
        
        // Company name
        if (companyName) {
            html += `<h2 class="text-xl font-bold">${this.escapeHtml(companyName)}${companyType ? ` ${this.escapeHtml(companyType)}` : ''}</h2>`;
        }

        // Address
        if (street || city) {
            html += '<div class="mt-4">';
            if (street) html += `<p>${this.escapeHtml(street)}</p>`;
            if (city) html += `<p>${this.escapeHtml(city)}</p>`;
            if (country) html += `<p>${this.escapeHtml(country)}</p>`;
            html += '</div>';
        }

        // Contact
        if (email || phone) {
            html += '<div class="mt-4"><h3 class="font-semibold">Kontakt</h3>';
            if (email) html += `<p>E-Mail: <a href="mailto:${this.escapeHtml(email)}" class="text-cyan-400">${this.escapeHtml(email)}</a></p>`;
            if (phone) html += `<p>Telefon: ${this.escapeHtml(phone)}</p>`;
            html += '</div>';
        }

        // Additional info
        if (vatId || tradeRegister || responsible) {
            html += '<div class="mt-4">';
            if (vatId) html += `<p>USt-IdNr.: ${this.escapeHtml(vatId)}</p>`;
            if (tradeRegister) html += `<p>Handelsregister: ${this.escapeHtml(tradeRegister)}</p>`;
            if (responsible) html += `<p>Inhaltlich verantwortlich: ${this.escapeHtml(responsible)}</p>`;
            html += '</div>';
        }

        html += '</div>';

        if (!companyName && !street && !email) {
            html = '<p class="text-gray-400">Fülle die Felder oben aus, um eine Vorschau zu sehen.</p>';
        }

        preview.innerHTML = html;
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

// Initialize Impressum Admin
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PAGE_KEY !== 'undefined' && PAGE_KEY === 'impressum') {
        new ImpressumAdmin();
    }
});
