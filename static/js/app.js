import { getProfileSettings, getItems } from './api.js';
import { applyTheme, renderProfileHeader, renderItems, renderFooter } from './ui.js';

async function main() {
    try {
        const [settings, items] = await Promise.all([
            getProfileSettings(),
            getItems()
        ]);
        
        applyTheme(settings);
        renderProfileHeader(settings);
        renderItems(items);
        renderFooter(settings);

    } catch (error) {
        console.error('Fehler beim Initialisieren der Seite:', error);
        
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
             spinner.innerHTML = `
                <div style="text-align: center; margin-top: 2rem;">
                    <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Inhalte konnten nicht geladen werden.</p>
                    <button onclick="window.location.reload()" 
                            style="padding: 0.5rem 1.5rem; border-radius: 8px; background: var(--color-accent); color: var(--color-bg); border: none; cursor: pointer; font-weight: 600;"
                            aria-label="Seite neu laden">
                        Erneut versuchen
                    </button>
                </div>`;
        }

        // Fallback: Basis-Theme laden, damit die Seite nicht komplett kaputt aussieht
        if (!document.body.classList.contains('theme-dark') && !document.body.classList.contains('theme-light')) {
            applyTheme({ theme: 'theme-dark', button_style: 'style-rounded' });
            renderProfileHeader({}); 
        }
    }
}

document.addEventListener('DOMContentLoaded', main);