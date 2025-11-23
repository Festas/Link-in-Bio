// Media Kit Management
export function initMediaKit() {
    const saveBtn = document.getElementById('save-mediakit-btn');
    const refreshBtn = document.getElementById('refresh-social-stats-btn');
    const reloadStatsBtn = document.getElementById('reload-stats-btn');
    const viewRequestsBtn = document.getElementById('view-access-requests-btn');
    
    if (!saveBtn) return;
    
    // Load existing media kit data
    loadMediaKitData();
    loadMediaKitSettings();
    loadViewStats();
    
    // Save button
    saveBtn.addEventListener('click', async () => {
        await saveMediaKitData();
        await saveMediaKitSettings();
    });
    
    // Refresh social stats button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await refreshSocialStats();
        });
    }
    
    // Reload stats button
    if (reloadStatsBtn) {
        reloadStatsBtn.addEventListener('click', async () => {
            await loadViewStats();
        });
    }
    
    // View access requests button
    if (viewRequestsBtn) {
        viewRequestsBtn.addEventListener('click', async () => {
            await showAccessRequests();
        });
    }
    
    // Access mode radio buttons
    const accessRadios = document.querySelectorAll('input[name="mk-access-mode"]');
    accessRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const passwordField = document.getElementById('mk-password-field');
            if (radio.value === 'password' && radio.checked) {
                passwordField.style.display = 'block';
            } else {
                passwordField.style.display = 'none';
            }
        });
    });
}

async function refreshSocialStats() {
    const statusEl = document.getElementById('mediakit-status');
    const refreshBtn = document.getElementById('refresh-social-stats-btn');
    
    try {
        // Disable button and show loading
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 inline-block mr-2 animate-spin"></i>Aktualisiere...';
        }
        
        showStatus('mediakit-status', 'Hole aktuelle Social Media Daten...', 'info');
        
        const response = await fetch('/api/mediakit/refresh-social-stats', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Fehler beim Aktualisieren');
        }
        
        const result = await response.json();
        
        // Show success message
        showStatus('mediakit-status', `✓ Erfolgreich! Gesamt: ${result.total_followers} Follower`, 'success');
        
        // Reload data to show updated values
        await loadMediaKitData();
        
        // Re-initialize lucide icons for the refresh button
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
    } catch (error) {
        console.error('Error refreshing social stats:', error);
        showStatus('mediakit-status', `✗ ${error.message}`, 'error');
    } finally {
        // Re-enable button
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4 inline-block mr-2"></i>Social Stats aktualisieren';
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }
}

async function loadMediaKitData() {
    try {
        const response = await fetch('/api/mediakit-data', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        if (!response.ok) return; // If no data exists yet, that's fine
        
        const { data } = await response.json();
        
        // Populate form fields from loaded data
        if (data.about) {
            document.getElementById('mk-name').value = data.about.name || '';
            document.getElementById('mk-location').value = data.about.location || '';
            document.getElementById('mk-about').value = data.about.description || '';
        }
        
        if (data.platforms) {
            document.getElementById('mk-instagram-followers').value = data.platforms.instagram_followers || '';
            document.getElementById('mk-instagram-handle').value = data.platforms.instagram_handle || '';
            document.getElementById('mk-tiktok-followers').value = data.platforms.tiktok_followers || '';
            document.getElementById('mk-tiktok-handle').value = data.platforms.tiktok_handle || '';
        }
        
        if (data.analytics) {
            document.getElementById('mk-total-followers').value = data.analytics.total_followers || '';
            document.getElementById('mk-engagement-rate').value = data.analytics.engagement_rate || '';
            document.getElementById('mk-avg-views').value = data.analytics.avg_views || '';
        }
        
        if (data.partners) {
            document.getElementById('mk-brand-partners').value = data.partners.list || '';
        }
        
        if (data.rates) {
            document.getElementById('mk-rate-post').value = data.rates.post || '';
            document.getElementById('mk-rate-story').value = data.rates.story || '';
            document.getElementById('mk-rate-video').value = data.rates.video || '';
            document.getElementById('mk-rate-package').value = data.rates.package || '';
        }
        
        if (data.video) {
            document.getElementById('mk-video-pitch-url').value = data.video.pitch_url || '';
        }
    } catch (error) {
        console.error('Error loading media kit data:', error);
    }
}

async function saveMediaKitData() {
    const updates = [
        // About section
        { section: 'about', key: 'name', value: document.getElementById('mk-name').value, display_order: 0 },
        { section: 'about', key: 'location', value: document.getElementById('mk-location').value, display_order: 1 },
        { section: 'about', key: 'description', value: document.getElementById('mk-about').value, display_order: 2 },
        
        // Platforms section
        { section: 'platforms', key: 'instagram_followers', value: document.getElementById('mk-instagram-followers').value, display_order: 0 },
        { section: 'platforms', key: 'instagram_handle', value: document.getElementById('mk-instagram-handle').value, display_order: 1 },
        { section: 'platforms', key: 'tiktok_followers', value: document.getElementById('mk-tiktok-followers').value, display_order: 2 },
        { section: 'platforms', key: 'tiktok_handle', value: document.getElementById('mk-tiktok-handle').value, display_order: 3 },
        
        // Analytics section
        { section: 'analytics', key: 'total_followers', value: document.getElementById('mk-total-followers').value, display_order: 0 },
        { section: 'analytics', key: 'engagement_rate', value: document.getElementById('mk-engagement-rate').value, display_order: 1 },
        { section: 'analytics', key: 'avg_views', value: document.getElementById('mk-avg-views').value, display_order: 2 },
        
        // Partners section
        { section: 'partners', key: 'list', value: document.getElementById('mk-brand-partners').value, display_order: 0 },
        
        // Rates section
        { section: 'rates', key: 'post', value: document.getElementById('mk-rate-post').value, display_order: 0 },
        { section: 'rates', key: 'story', value: document.getElementById('mk-rate-story').value, display_order: 1 },
        { section: 'rates', key: 'video', value: document.getElementById('mk-rate-video').value, display_order: 2 },
        { section: 'rates', key: 'package', value: document.getElementById('mk-rate-package').value, display_order: 3 },
        
        // Video section
        { section: 'video', key: 'pitch_url', value: document.getElementById('mk-video-pitch-url').value, display_order: 0 },
    ];
    
    try {
        // Use batch endpoint for better performance
        const response = await fetch('/api/mediakit-data/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ updates })
        });
        
        if (!response.ok) throw new Error('Fehler beim Speichern');
        
        showStatus('mediakit-status', 'Erfolgreich gespeichert! ✓', 'success');
    } catch (error) {
        console.error('Error saving media kit data:', error);
        showStatus('mediakit-status', 'Fehler beim Speichern', 'error');
    }
}

// Load media kit settings (video pitch, access control, etc.)
async function loadMediaKitSettings() {
    try {
        const response = await fetch('/api/mediakit/settings', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        if (!response.ok) return;
        
        const { settings } = await response.json();
        
        // Load video pitch URL
        if (settings.video_pitch_url) {
            document.getElementById('mk-video-pitch-url').value = settings.video_pitch_url;
        }
        
        // Load access mode
        const accessMode = settings.access_mode || 'public';
        const accessRadio = document.getElementById(`mk-access-${accessMode}`);
        if (accessRadio) {
            accessRadio.checked = true;
            if (accessMode === 'password') {
                document.getElementById('mk-password-field').style.display = 'block';
            }
        }
        
        // Load password if exists
        if (settings.access_password) {
            document.getElementById('mk-access-password-value').value = settings.access_password;
        }
    } catch (error) {
        console.error('Error loading media kit settings:', error);
    }
}

// Save media kit settings
async function saveMediaKitSettings() {
    try {
        // Get selected access mode
        const accessMode = document.querySelector('input[name="mk-access-mode"]:checked')?.value || 'public';
        
        const settings = {
            video_pitch_url: document.getElementById('mk-video-pitch-url').value,
            access_mode: accessMode,
            access_password: document.getElementById('mk-access-password-value').value
        };
        
        const response = await fetch('/api/mediakit/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        
        console.log('Media kit settings saved successfully');
    } catch (error) {
        console.error('Error saving media kit settings:', error);
    }
}

// Load view statistics
async function loadViewStats() {
    try {
        const [statsResponse, requestsResponse] = await Promise.all([
            fetch('/api/mediakit/views/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            }),
            fetch('/api/mediakit/access-requests?status=pending', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            })
        ]);
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('stat-total-views').textContent = stats.total_views || '0';
            document.getElementById('stat-month-views').textContent = stats.views_this_month || '0';
            document.getElementById('stat-unique-viewers').textContent = stats.unique_viewers || '0';
        }
        
        if (requestsResponse.ok) {
            const { requests } = await requestsResponse.json();
            document.getElementById('stat-pending-requests').textContent = requests?.length || '0';
        }
    } catch (error) {
        console.error('Error loading view stats:', error);
    }
}

// Show access requests modal/page
async function showAccessRequests() {
    try {
        const response = await fetch('/api/mediakit/access-requests', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load access requests');
        }
        
        const { requests } = await response.json();
        
        // Create a simple modal to show requests
        let html = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="access-requests-modal">
                <div class="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold">Zugriffsanfragen</h3>
                        <button onclick="document.getElementById('access-requests-modal').remove()" class="text-gray-400 hover:text-white">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="space-y-3">
        `;
        
        if (requests.length === 0) {
            html += '<p class="text-gray-400 text-center py-8">Keine Anfragen vorhanden</p>';
        } else {
            requests.forEach(req => {
                const statusColor = req.status === 'approved' ? 'green' : req.status === 'rejected' ? 'red' : 'yellow';
                html += `
                    <div class="p-4 bg-gray-700 rounded flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-semibold">${req.name || 'Kein Name'}</div>
                            <div class="text-sm text-gray-400">${req.email}</div>
                            ${req.company ? `<div class="text-sm text-gray-400">${req.company}</div>` : ''}
                            ${req.message ? `<div class="text-sm mt-2">${req.message}</div>` : ''}
                            <div class="text-xs text-gray-500 mt-2">${new Date(req.requested_at).toLocaleString('de-DE')}</div>
                        </div>
                        <div class="ml-4 space-x-2">
                            <span class="px-2 py-1 text-xs rounded bg-${statusColor}-500/20 text-${statusColor}-400">${req.status}</span>
                            ${req.status === 'pending' ? `
                                <button onclick="updateRequestStatus(${req.id}, 'approved')" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">
                                    Genehmigen
                                </button>
                                <button onclick="updateRequestStatus(${req.id}, 'rejected')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded">
                                    Ablehnen
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Re-initialize lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (error) {
        console.error('Error showing access requests:', error);
        alert('Fehler beim Laden der Anfragen');
    }
}

// Make updateRequestStatus globally available
window.updateRequestStatus = async function(requestId, status) {
    try {
        const response = await fetch(`/api/mediakit/access-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update request');
        }
        
        // Close modal and reload stats
        document.getElementById('access-requests-modal')?.remove();
        await loadViewStats();
        alert(`Anfrage wurde ${status === 'approved' ? 'genehmigt' : 'abgelehnt'}`);
    } catch (error) {
        console.error('Error updating request:', error);
        alert('Fehler beim Aktualisieren der Anfrage');
    }
};

function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    
    statusEl.textContent = message;
    let colorClass = 'text-gray-400';
    if (type === 'success') colorClass = 'text-green-400';
    else if (type === 'error') colorClass = 'text-red-400';
    else if (type === 'info') colorClass = 'text-blue-400';
    
    statusEl.className = `mt-4 text-center ${colorClass}`;
    
    if (type !== 'info') {
        setTimeout(() => {
            statusEl.textContent = '';
        }, 5000);
    }
}
