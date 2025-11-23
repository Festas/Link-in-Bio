import * as API from './admin_api.js';
import * as UI from './admin_ui.js';

let currentPageId = null;
let currentSpecialPage = null; // Track if a special page is selected
let allPages = [];

// Special pages configuration
const SPECIAL_PAGES = [
    { key: 'ueber-mich', title: 'Über mich', url: '/ueber-mich' },
    { key: 'impressum', title: 'Impressum', url: '/impressum' },
    { key: 'datenschutz', title: 'Datenschutz', url: '/datenschutz' },
    { key: 'kontakt', title: 'Kontakt', url: '/kontakt' },
    { key: 'mediakit', title: 'Media Kit', url: '/mediakit' }
];

export function getCurrentPageId() {
    return currentPageId;
}

export function getCurrentSpecialPage() {
    return currentSpecialPage;
}

export function initializePageManagement() {
    loadPages();
    
    // Page selector change handler
    const pageSelector = document.getElementById('page-selector');
    if (pageSelector) {
        pageSelector.addEventListener('change', (e) => {
            const value = e.target.value;
            
            // Check if it's a special page (starts with 'special:')
            if (value.startsWith('special:')) {
                const pageKey = value.replace('special:', '');
                currentPageId = null;
                currentSpecialPage = pageKey;
                showSpecialPageEditor(pageKey);
                // Hide tabs and show only the special page editor
                hideAllTabs();
            } else {
                const pageId = value ? parseInt(value) : null;
                currentPageId = pageId;
                currentSpecialPage = null;
                hideSpecialPageEditor();
                // Show tabs normally
                showAllTabs();
                // Trigger items reload
                window.dispatchEvent(new CustomEvent('page-changed', { detail: { pageId } }));
            }
        });
    }
    
    // Manage pages button
    const managePagesBtn = document.getElementById('manage-pages-button');
    if (managePagesBtn) {
        managePagesBtn.addEventListener('click', openPageManagementModal);
    }
    
    // Close modal button
    const closeModalBtn = document.getElementById('close-page-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePageManagementModal);
    }
    
    // Create page form
    const createPageForm = document.getElementById('create-page-form');
    if (createPageForm) {
        createPageForm.addEventListener('submit', handleCreatePage);
    }
    
    // Close special page editor
    const closeSpecialEditor = document.getElementById('close-special-editor');
    if (closeSpecialEditor) {
        closeSpecialEditor.addEventListener('click', () => {
            hideSpecialPageEditor();
            // Reset to first regular page
            const selector = document.getElementById('page-selector');
            if (selector && allPages.length > 0) {
                selector.value = allPages[0].id;
                currentPageId = allPages[0].id;
                currentSpecialPage = null;
                showAllTabs();
                window.dispatchEvent(new CustomEvent('page-changed', { detail: { pageId: currentPageId } }));
            }
        });
    }
    
    // Initialize special page editor handlers
    initSpecialPageEditor();
}

async function loadPages() {
    try {
        allPages = await API.fetchPages();
        updatePageSelector();
        
        // Set default page (empty slug) as selected
        const defaultPage = allPages.find(p => p.slug === '');
        if (defaultPage) {
            currentPageId = defaultPage.id;
            const selector = document.getElementById('page-selector');
            if (selector) {
                selector.value = defaultPage.id;
            }
        }
    } catch (error) {
        console.error('Error loading pages:', error);
        const selector = document.getElementById('page-selector');
        if (selector) {
            selector.innerHTML = '<option value="">Fehler beim Laden der Seiten</option>';
        }
    }
}

function updatePageSelector() {
    const selector = document.getElementById('page-selector');
    if (!selector) return;
    
    selector.innerHTML = '';
    
    // Add regular pages
    allPages.forEach(page => {
        const option = document.createElement('option');
        option.value = page.id;
        option.textContent = page.slug === '' ? `${page.title} (Hauptseite)` : `${page.title} (/${page.slug})`;
        selector.appendChild(option);
    });
    
    // Add separator
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = '──────────';
    selector.appendChild(separator);
    
    // Add special pages
    SPECIAL_PAGES.forEach(sp => {
        const option = document.createElement('option');
        option.value = `special:${sp.key}`;
        option.textContent = `⚙️ ${sp.title}`;
        selector.appendChild(option);
    });
    
    // Select current page or special page if set
    if (currentSpecialPage) {
        selector.value = `special:${currentSpecialPage}`;
    } else if (currentPageId) {
        selector.value = currentPageId;
    }
}

async function openPageManagementModal() {
    const modal = document.getElementById('page-management-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        await loadPagesIntoModal();
    }
}

function closePageManagementModal() {
    const modal = document.getElementById('page-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadPagesIntoModal() {
    const pagesList = document.getElementById('pages-list');
    if (!pagesList) return;
    
    pagesList.innerHTML = '<div class="flex justify-center items-center p-4"><svg class="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>';
    
    try {
        allPages = await API.fetchPages();
        
        if (allPages.length === 0) {
            pagesList.innerHTML = '<p class="text-gray-400 text-center p-4">Keine Seiten vorhanden</p>';
            return;
        }
        
        pagesList.innerHTML = '';
        
        allPages.forEach(page => {
            const pageItem = createPageListItem(page);
            pagesList.appendChild(pageItem);
        });
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading pages:', error);
        pagesList.innerHTML = '<p class="text-red-400 text-center p-4">Fehler beim Laden der Seiten</p>';
    }
}

function createPageListItem(page) {
    const div = document.createElement('div');
    div.className = 'bg-gray-700 p-4 rounded flex items-center justify-between';
    
    const isMainPage = page.slug === '';
    const pageUrl = isMainPage ? '/' : `/${page.slug}`;
    
    div.innerHTML = `
        <div class="flex-1">
            <div class="flex items-center space-x-2">
                <h5 class="font-semibold">${escapeHtml(page.title)}</h5>
                ${isMainPage ? '<span class="text-xs bg-blue-600 px-2 py-1 rounded">Hauptseite</span>' : ''}
                ${!page.is_active ? '<span class="text-xs bg-gray-600 px-2 py-1 rounded">Inaktiv</span>' : ''}
            </div>
            <p class="text-sm text-gray-400 mt-1">${pageUrl}</p>
            ${page.bio ? `<p class="text-sm text-gray-500 mt-1">${escapeHtml(page.bio)}</p>` : ''}
        </div>
        <div class="flex items-center space-x-2">
            <button class="edit-page-btn text-blue-400 hover:text-blue-300 p-2" data-page-id="${page.id}" title="Bearbeiten">
                <i data-lucide="edit-2" class="w-5 h-5"></i>
            </button>
            ${!isMainPage ? `
            <button class="delete-page-btn text-red-400 hover:text-red-300 p-2" data-page-id="${page.id}" title="Löschen">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
            ` : ''}
            <a href="${pageUrl}" target="_blank" class="text-gray-400 hover:text-white p-2" title="Vorschau">
                <i data-lucide="external-link" class="w-5 h-5"></i>
            </a>
        </div>
    `;
    
    // Add event listeners
    const editBtn = div.querySelector('.edit-page-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => handleEditPage(page.id));
    }
    
    const deleteBtn = div.querySelector('.delete-page-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDeletePage(page.id));
    }
    
    return div;
}

async function handleCreatePage(e) {
    e.preventDefault();
    
    const slug = document.getElementById('new-page-slug').value.trim();
    const title = document.getElementById('new-page-title').value.trim();
    const bio = document.getElementById('new-page-bio').value.trim();
    
    if (!slug || !title) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
    }
    
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
        alert('Der URL-Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
        return;
    }
    
    try {
        const newPage = await API.createPage({
            slug,
            title,
            bio: bio || null
        });
        
        // Reset form
        document.getElementById('create-page-form').reset();
        
        // Reload pages
        await loadPages();
        await loadPagesIntoModal();
        
        alert(`Seite "${title}" wurde erfolgreich erstellt!`);
    } catch (error) {
        console.error('Error creating page:', error);
        alert(`Fehler beim Erstellen der Seite: ${error.message}`);
    }
}

async function handleEditPage(pageId) {
    const page = allPages.find(p => p.id === pageId);
    if (!page) return;
    
    const newTitle = prompt('Neuer Titel:', page.title);
    if (newTitle === null) return; // Cancelled
    
    const newBio = prompt('Neue Beschreibung:', page.bio || '');
    if (newBio === null) return; // Cancelled
    
    try {
        await API.updatePage(pageId, {
            title: newTitle.trim() || page.title,
            bio: newBio.trim() || null
        });
        
        await loadPages();
        await loadPagesIntoModal();
        
        alert('Seite wurde erfolgreich aktualisiert!');
    } catch (error) {
        console.error('Error updating page:', error);
        alert(`Fehler beim Aktualisieren der Seite: ${error.message}`);
    }
}

async function handleDeletePage(pageId) {
    const page = allPages.find(p => p.id === pageId);
    if (!page) return;
    
    if (!confirm(`Möchten Sie die Seite "${page.title}" wirklich löschen? Alle zugehörigen Items werden ebenfalls gelöscht.`)) {
        return;
    }
    
    try {
        await API.deletePage(pageId);
        
        // If we deleted the current page, switch to default
        if (currentPageId === pageId) {
            const defaultPage = allPages.find(p => p.slug === '');
            if (defaultPage) {
                currentPageId = defaultPage.id;
                window.dispatchEvent(new CustomEvent('page-changed', { detail: { pageId: currentPageId } }));
            }
        }
        
        await loadPages();
        await loadPagesIntoModal();
        
        alert('Seite wurde erfolgreich gelöscht!');
    } catch (error) {
        console.error('Error deleting page:', error);
        alert(`Fehler beim Löschen der Seite: ${error.message}`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Special page editor functions
function showSpecialPageEditor(pageKey) {
    const editorPanel = document.getElementById('special-page-editor-panel');
    if (editorPanel) {
        editorPanel.style.display = 'block';
        loadSpecialPageContent(pageKey);
        
        // Update preview link
        const previewLink = document.getElementById('sp-preview-link');
        if (previewLink) {
            const specialPageConfig = SPECIAL_PAGES.find(sp => sp.key === pageKey);
            if (specialPageConfig) {
                previewLink.href = specialPageConfig.url;
            }
        }
    }
}

function hideSpecialPageEditor() {
    const editorPanel = document.getElementById('special-page-editor-panel');
    if (editorPanel) {
        editorPanel.style.display = 'none';
    }
}

function hideAllTabs() {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelector('.mb-6.border-b.border-gray-700')?.style.setProperty('display', 'none');
}

function showAllTabs() {
    document.querySelector('.mb-6.border-b.border-gray-700')?.style.removeProperty('display');
    // The active tab will be shown by the tab switching logic
}

function initSpecialPageEditor() {
    // Save button
    const saveBtn = document.getElementById('save-special-page-content');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSpecialPageContent);
    }
    
    // Add block buttons (placeholder - will be implemented later)
    const statusEl = document.getElementById('special-page-status');
    
    const addTextBlockBtn = document.getElementById('add-text-block');
    if (addTextBlockBtn) {
        addTextBlockBtn.addEventListener('click', () => {
            if (statusEl) {
                UI.setFormStatus(statusEl, 'ℹ️ Textblock-Editor kommt bald! Verwende vorerst den HTML-Editor unten.', 'text-blue-400', 4000);
            }
        });
    }
    
    const addImageBlockBtn = document.getElementById('add-image-block');
    if (addImageBlockBtn) {
        addImageBlockBtn.addEventListener('click', () => {
            if (statusEl) {
                UI.setFormStatus(statusEl, 'ℹ️ Bildblock-Editor kommt bald! Verwende vorerst den HTML-Editor unten.', 'text-purple-400', 4000);
            }
        });
    }
    
    const addSectionBlockBtn = document.getElementById('add-section-block');
    if (addSectionBlockBtn) {
        addSectionBlockBtn.addEventListener('click', () => {
            if (statusEl) {
                UI.setFormStatus(statusEl, 'ℹ️ Bereichs-Editor kommt bald! Verwende vorerst den HTML-Editor unten.', 'text-green-400', 4000);
            }
        });
    }
}

async function loadSpecialPageContent(pageKey) {
    try {
        const response = await fetch(`/api/special-pages/${pageKey}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        
        if (!response.ok) throw new Error('Fehler beim Laden');
        
        const data = await response.json();
        document.getElementById('sp-title-legacy').value = data.title || '';
        document.getElementById('sp-subtitle-legacy').value = data.subtitle || '';
        document.getElementById('sp-content-legacy').value = data.content || '';
    } catch (error) {
        console.error('Error loading special page:', error);
        const statusEl = document.getElementById('special-page-status');
        if (statusEl) {
            UI.setFormStatus(statusEl, 'Fehler beim Laden der Seite', 'text-red-400', 3000);
        }
    }
}

async function saveSpecialPageContent() {
    if (!currentSpecialPage) return;
    
    const title = document.getElementById('sp-title-legacy').value;
    const subtitle = document.getElementById('sp-subtitle-legacy').value;
    const content = document.getElementById('sp-content-legacy').value;
    
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
        
        const statusEl = document.getElementById('special-page-status');
        if (statusEl) {
            UI.setFormStatus(statusEl, 'Erfolgreich gespeichert! ✓', 'text-green-400', 3000);
        }
    } catch (error) {
        console.error('Error saving special page:', error);
        const statusEl = document.getElementById('special-page-status');
        if (statusEl) {
            UI.setFormStatus(statusEl, 'Fehler beim Speichern', 'text-red-400', 3000);
        }
    }
}
