// Media Kit Management
export function initMediaKit() {
    const saveBtn = document.getElementById('save-mediakit-btn');
    const refreshBtn = document.getElementById('refresh-social-stats-btn');
    
    if (!saveBtn) return;
    
    // Load existing media kit data
    loadMediaKitData();
    
    // Save button
    saveBtn.addEventListener('click', async () => {
        await saveMediaKitData();
    });
    
    // Refresh social stats button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await refreshSocialStats();
        });
    }
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
