import * as API from './admin_api.js';
import { createLucideIcon } from './icons.js';

let currentPageId = null;
let allPages = [];

export function getCurrentPageId() {
    return currentPageId;
}

export function initializePageManagement() {
    loadPages();
    
    // Page selector change handler
    const pageSelector = document.getElementById('page-selector');
    if (pageSelector) {
        pageSelector.addEventListener('change', (e) => {
            const pageId = e.target.value ? parseInt(e.target.value) : null;
            currentPageId = pageId;
            // Trigger items reload
            window.dispatchEvent(new CustomEvent('page-changed', { detail: { pageId } }));
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
    
    allPages.forEach(page => {
        const option = document.createElement('option');
        option.value = page.id;
        option.textContent = page.slug === '' ? `${page.title} (Hauptseite)` : `${page.title} (/${page.slug})`;
        selector.appendChild(option);
    });
    
    // Select current page if set
    if (currentPageId) {
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
