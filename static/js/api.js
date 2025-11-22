import { apiFetch } from './utils.js';

export async function getProfileSettings() {
    try {
        const response = await apiFetch('/api/settings');
        if (!response.ok) {
             console.error('Einstellungen nicht gefunden, verwende Standard.');
             return { theme: 'theme-dark', button_style: 'style-rounded' };
        }
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        return { theme: 'theme-dark', button_style: 'style-rounded' };
    }
}

export async function getItems() {
    // Get page_id from body element if it exists
    const pageId = document.body.dataset.pageId;
    const url = pageId ? `/api/items?page_id=${pageId}` : '/api/items';
    const response = await apiFetch(url);
    if (!response.ok) {
        throw new Error('Items konnten nicht geladen werden.');
    }
    return await response.json();
}

export async function trackClick(itemId) {
    try {
        await apiFetch(`/api/click/${itemId}`, {
            method: 'POST'
        });
    } catch (error) {
        console.warn('Klick-Zählung fehlgeschlagen:', error);
    }
}

export async function subscribeEmail(email, privacyAgreed) {
    const response = await apiFetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({
            email: email,
            privacy_agreed: privacyAgreed
        })
    });
    
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.detail || 'Ein unbekannter Fehler ist aufgetreten.');
    }
    return result;
}

export async function sendContactMessage(payload) {
    const response = await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.detail || 'Fehler beim Senden der Nachricht.');
    }
    return result;
}