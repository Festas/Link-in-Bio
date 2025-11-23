import { apiFetch } from './utils.js';

export async function fetchSettings() {
    const response = await apiFetch('/api/settings');
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Einstellungen konnten nicht geladen werden.');
    }
    return await response.json();
}

export async function updateSettings(payload) {
    const response = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Fehler beim Speichern der Einstellungen.');
    }
    return await response.json();
}

export async function fetchItems(pageId = null) {
    const url = pageId ? `/api/items?page_id=${pageId}` : '/api/items';
    const response = await apiFetch(url);
    if (!response.ok) {
        throw new Error('Items konnten nicht geladen werden.');
    }
    return await response.json();
}

export async function createItem(endpoint, payload) {
    const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Erstellen des Items.');
    }
    return await response.json();
}

export async function updateItem(itemId, payload) {
    const response = await apiFetch(`/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Aktualisieren des Items.');
    }
    return await response.json();
}

export async function deleteItem(itemId) {
    const response = await apiFetch(`/api/items/${itemId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Löschen des Items.');
    }
    return true;
}

export async function toggleItemVisibility(itemId) {
    const response = await apiFetch(`/api/items/${itemId}/toggle_visibility`, {
        method: 'PUT'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Umschalten der Sichtbarkeit.');
    }
    return await response.json();
}

export async function reorderItems(ids) {
    const response = await apiFetch('/api/items/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids: ids.map(Number) })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Speichern der Reihenfolge.');
    }
    return true;
}

export async function uploadImage(formData) {
    // Wichtig: Bei FormData darf kein Content-Type Header manuell gesetzt werden,
    // da der Browser dies automatisch inklusive Boundary macht.
    // apiFetch in utils.js beachtet dies.
    const response = await apiFetch('/api/upload_image', {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload fehlgeschlagen.');
    }
    return await response.json();
}

export async function downloadBackup() {
    const response = await apiFetch('/api/backup/download');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Backup-Erstellung fehlgeschlagen.');
    }
    return response; // Wir geben das Response-Objekt zurück, damit der Blob verarbeitet werden kann
}

// Page management functions
export async function fetchPages() {
    const response = await apiFetch('/api/pages');
    if (!response.ok) {
        throw new Error('Seiten konnten nicht geladen werden.');
    }
    return await response.json();
}

export async function fetchPage(pageId) {
    const response = await apiFetch(`/api/pages/${pageId}`);
    if (!response.ok) {
        throw new Error('Seite konnte nicht geladen werden.');
    }
    return await response.json();
}

export async function createPage(payload) {
    const response = await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Erstellen der Seite.');
    }
    return await response.json();
}

export async function updatePage(pageId, payload) {
    const response = await apiFetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Aktualisieren der Seite.');
    }
    return await response.json();
}

export async function deletePage(pageId) {
    const response = await apiFetch(`/api/pages/${pageId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Fehler beim Löschen der Seite.');
    }
    return true;
}

// Analytics functions
export async function getAnalytics() {
    const response = await apiFetch('/api/analytics');
    if (!response.ok) {
        throw new Error('Analytics konnten nicht geladen werden.');
    }
    return await response.json();
}

// Simplified alias for consistency
export const getItems = fetchItems;

// Get recent activity (mock implementation - can be enhanced with real endpoint later)
export async function getRecentActivity() {
    // For now, return empty array. This can be enhanced with a real API endpoint later
    // that tracks admin actions, subscriber signups, message receipts, etc.
    return [];
}