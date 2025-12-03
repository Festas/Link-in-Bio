/**
 * Über mich (About) Admin
 * Page-specific functionality for About page admin
 */

class UeberMichAdmin {
    constructor() {
        this.milestones = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadAboutSettings();
    }

    setupEventListeners() {
        // Profile image URL input
        document.getElementById('about-profile-image')?.addEventListener('input', (e) => {
            this.updateProfileImagePreview(e.target.value);
        });

        // Upload button
        document.getElementById('upload-profile-btn')?.addEventListener('click', () => {
            document.getElementById('upload-profile-file')?.click();
        });

        // File upload handler
        document.getElementById('upload-profile-file')?.addEventListener('change', (e) => {
            this.handleProfileImageUpload(e);
        });

        // Personal information fields
        const infoFields = ['about-name', 'about-title', 'about-location', 'about-website'];
        infoFields.forEach(id => {
            document.getElementById(id)?.addEventListener('input', 
                this.debounce(() => {
                    this.saveAboutSettings();
                }, 1000)
            );
        });

        // Short bio with character count
        document.getElementById('about-short-bio')?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('short-bio-count').textContent = count;
            this.debounce(() => {
                this.saveAboutSettings();
            }, 1000)();
        });

        // Long bio
        document.getElementById('about-long-bio')?.addEventListener('input', 
            this.debounce(() => {
                this.saveAboutSettings();
            }, 1000)
        );

        // Skills
        document.getElementById('about-skills')?.addEventListener('input', 
            this.debounce(() => {
                this.saveAboutSettings();
            }, 1000)
        );

        // Add milestone button
        document.getElementById('add-milestone')?.addEventListener('click', () => {
            this.addMilestone();
        });

        // Save button enhancement
        const saveBtn = document.getElementById('save-page');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.saveAboutSettings();
            });
        }
    }

    updateProfileImagePreview(url) {
        const preview = document.getElementById('profile-image-preview');
        const placeholder = document.getElementById('profile-image-placeholder');
        
        if (url && url.trim()) {
            preview.src = url;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }

    async handleProfileImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showStatus('Nur Bilddateien (JPEG, PNG, GIF, WebP) sind erlaubt', 'error');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showStatus('Das Bild darf maximal 5 MB groß sein', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const imageUrl = data.url || data.file_url;
            
            document.getElementById('about-profile-image').value = imageUrl;
            this.updateProfileImagePreview(imageUrl);
            this.saveAboutSettings();
            
            this.showStatus('Bild hochgeladen', 'success');
        } catch (error) {
            console.error('Error uploading image:', error);
            this.showStatus('Fehler beim Hochladen', 'error');
        }
    }

    addMilestone(data = null) {
        const container = document.getElementById('milestones-container');
        if (!container) return;

        // Remove empty state message if present
        const emptyState = container.querySelector('.text-center');
        if (emptyState) {
            emptyState.remove();
        }

        const milestone = data || {
            id: Date.now(),
            year: '',
            title: '',
            description: ''
        };

        const div = document.createElement('div');
        div.className = 'milestone-item bg-gray-700 rounded-lg p-4 border border-gray-600';
        div.dataset.milestoneId = milestone.id;

        div.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-24 flex-shrink-0">
                    <input type="text" class="milestone-year w-full bg-gray-800 text-white rounded px-3 py-2 text-center font-bold" 
                           value="${this.escapeHtml(milestone.year)}" placeholder="Jahr">
                </div>
                <div class="flex-1 space-y-2">
                    <input type="text" class="milestone-title w-full bg-gray-800 text-white rounded px-3 py-2 font-medium" 
                           value="${this.escapeHtml(milestone.title)}" placeholder="Meilenstein-Titel">
                    <textarea class="milestone-description w-full bg-gray-800 text-white rounded px-3 py-2 text-sm" rows="2"
                              placeholder="Beschreibung (optional)">${this.escapeHtml(milestone.description)}</textarea>
                </div>
                <button class="delete-milestone text-gray-400 hover:text-red-400 flex-shrink-0">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        `;

        // Add event listeners
        div.querySelector('.delete-milestone').addEventListener('click', () => {
            this.deleteMilestone(milestone.id);
            div.remove();
            this.checkMilestonesEmpty();
        });

        const inputs = div.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', this.debounce(() => {
                this.updateMilestoneData(milestone.id, div);
                this.saveAboutSettings();
            }, 1000));
        });

        container.appendChild(div);
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Add to milestones array if new
        if (!data) {
            this.milestones.push(milestone);
        }
    }

    deleteMilestone(id) {
        this.milestones = this.milestones.filter(m => m.id !== id);
        this.saveAboutSettings();
    }

    updateMilestoneData(id, div) {
        const milestone = this.milestones.find(m => m.id === id);
        if (milestone) {
            milestone.year = div.querySelector('.milestone-year').value;
            milestone.title = div.querySelector('.milestone-title').value;
            milestone.description = div.querySelector('.milestone-description').value;
        }
    }

    checkMilestonesEmpty() {
        const container = document.getElementById('milestones-container');
        if (container && container.children.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i data-lucide="calendar" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>Noch keine Meilensteine hinzugefügt</p>
                    <p class="text-sm">Klicke auf "Meilenstein hinzufügen" um zu beginnen</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    async loadAboutSettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/special-pages/ueber-mich', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const data = await response.json();
            const settings = data.page?.settings || {};

            // Profile image
            if (settings.profileImage) {
                document.getElementById('about-profile-image').value = settings.profileImage;
                this.updateProfileImagePreview(settings.profileImage);
            }

            // Personal info
            if (settings.personalInfo) {
                document.getElementById('about-name').value = settings.personalInfo.name || '';
                document.getElementById('about-title').value = settings.personalInfo.title || '';
                document.getElementById('about-location').value = settings.personalInfo.location || '';
                document.getElementById('about-website').value = settings.personalInfo.website || '';
            }

            // Bio
            if (settings.bio) {
                const shortBio = settings.bio.short || '';
                document.getElementById('about-short-bio').value = shortBio;
                document.getElementById('short-bio-count').textContent = shortBio.length;
                document.getElementById('about-long-bio').value = settings.bio.long || '';
            }

            // Skills
            if (settings.skills && Array.isArray(settings.skills)) {
                document.getElementById('about-skills').value = settings.skills.join('\n');
            }

            // Milestones
            if (settings.milestones && Array.isArray(settings.milestones)) {
                this.milestones = settings.milestones;
                const container = document.getElementById('milestones-container');
                container.innerHTML = ''; // Clear existing
                
                if (this.milestones.length > 0) {
                    this.milestones.forEach(milestone => {
                        this.addMilestone(milestone);
                    });
                } else {
                    this.checkMilestonesEmpty();
                }
            }
        } catch (error) {
            console.error('Error loading about settings:', error);
        }
    }

    async saveAboutSettings() {
        try {
            const token = localStorage.getItem('authToken');
            
            const skillsText = document.getElementById('about-skills')?.value || '';
            const skills = skillsText.split('\n').filter(s => s.trim());

            const settings = {
                profileImage: document.getElementById('about-profile-image')?.value || '',
                personalInfo: {
                    name: document.getElementById('about-name')?.value || '',
                    title: document.getElementById('about-title')?.value || '',
                    location: document.getElementById('about-location')?.value || '',
                    website: document.getElementById('about-website')?.value || ''
                },
                bio: {
                    short: document.getElementById('about-short-bio')?.value || '',
                    long: document.getElementById('about-long-bio')?.value || ''
                },
                skills: skills,
                milestones: this.milestones
            };

            await fetch('/api/special-pages/ueber-mich', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Über mich',
                    subtitle: 'Erfahre mehr über mich',
                    settings: settings
                })
            });

            this.showStatus('Über mich gespeichert', 'success');
        } catch (error) {
            console.error('Error saving about settings:', error);
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

    escapeHtml(text) {
        if (!text) return '';
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

// Initialize Über mich Admin
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PAGE_KEY !== 'undefined' && PAGE_KEY === 'ueber-mich') {
        new UeberMichAdmin();
    }
});
