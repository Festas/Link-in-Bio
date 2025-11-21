import { initCore } from './admin_core.js';
import { initCreationForms } from './admin_forms.js';
import { loadItems, setupSaveOrder } from './admin_items.js';
import { initProfile } from './admin_profile.js';
import { requireAuth } from './utils.js';

if (requireAuth()) {
    document.addEventListener('DOMContentLoaded', startAdmin);
}

async function startAdmin() {
    // 1. Core Init (Tabs, Logout, QR)
    await initCore();

    // 2. Items Laden
    await loadItems();

    // 3. Formulare aktivieren (und bei Erfolg Items neu laden lassen)
    initCreationForms(loadItems);

    // 4. Save Order Button aktivieren
    setupSaveOrder();

    // 5. Profil Tab aktivieren
    initProfile();
}
