// Special Pages Management
let currentSpecialPage = 'ueber-mich';

export function initSpecialPages() {
    const pageSelect = document.getElementById('special-page-select');
    const form = document.getElementById('special-page-form');
    const previewLink = document.getElementById('sp-preview-link');
    
    if (!pageSelect || !form) return;
    
    // Load initial page
    loadSpecialPage(currentSpecialPage);
    
    // Page selector change
    pageSelect.addEventListener('change', (e) => {
        currentSpecialPage = e.target.value;
        loadSpecialPage(currentSpecialPage);
        previewLink.href = `/${currentSpecialPage}`;
    });
    
    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSpecialPage();
    });
}

async function loadSpecialPage(pageKey) {
    try {
        const response = await fetch(`/api/special-pages/${pageKey}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        if (!response.ok) throw new Error('Fehler beim Laden');
        
        const data = await response.json();
        document.getElementById('sp-title').value = data.title || '';
        document.getElementById('sp-subtitle').value = data.subtitle || '';
        document.getElementById('sp-content').value = data.content || '';
    } catch (error) {
        console.error('Error loading special page:', error);
        showStatus('special-page-status', 'Fehler beim Laden der Seite', 'error');
    }
}

async function saveSpecialPage() {
    const title = document.getElementById('sp-title').value;
    const subtitle = document.getElementById('sp-subtitle').value;
    const content = document.getElementById('sp-content').value;
    
    try {
        const response = await fetch(`/api/special-pages/${currentSpecialPage}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ title, subtitle, content })
        });
        
        if (!response.ok) throw new Error('Fehler beim Speichern');
        
        showStatus('special-page-status', 'Erfolgreich gespeichert! ✓', 'success');
    } catch (error) {
        console.error('Error saving special page:', error);
        showStatus('special-page-status', 'Fehler beim Speichern', 'error');
    }
}

function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `mt-4 text-center ${type === 'success' ? 'text-green-400' : 'text-red-400'}`;
    
    setTimeout(() => {
        statusEl.textContent = '';
    }, 3000);
}
