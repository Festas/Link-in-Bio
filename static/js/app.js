import { getProfileSettings, getItems } from './api.js';
import { applyTheme, renderProfileHeader, renderItems } from './ui.js';

async function main() {
    try {
        const [settings, items] = await Promise.all([
            getProfileSettings(),
            getItems()
        ]);
        
        applyTheme(settings);
        renderProfileHeader(settings);
        renderItems(items);

    } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
        
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
             spinner.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; margin-top: 2rem;">Inhalte konnten nicht geladen werden.</p>';
        }

        // Fallback: Basis-Theme laden, damit die Seite nicht komplett kaputt aussieht
        if (!document.body.classList.contains('theme-dark') && !document.body.classList.contains('theme-light')) {
            applyTheme({ theme: 'theme-dark', button_style: 'style-rounded' });
            renderProfileHeader({}); 
        }
    }
}

document.addEventListener('DOMContentLoaded', main);