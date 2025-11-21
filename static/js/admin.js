import { initCore } from './admin_core.js';
import { initCreationForms } from './admin_forms.js';
import { loadItems, setupSaveOrder } from './admin_items.js';
import { initProfile } from './admin_profile.js';
import { requireAuth } from './utils.js';

if (requireAuth()) {
    document.addEventListener('DOMContentLoaded', startAdmin);
}

async function startAdmin() {
    // 1. Core Init (Tabs, Logout, QR, Social Icons Render)
    await initCore();

    // 2. Items Laden (Initialer Fetch)
    await loadItems();

    // 3. "Hinzufügen"-Formulare aktivieren
    // Wir übergeben loadItems als Callback, damit die Liste nach dem Hinzufügen neu lädt
    initCreationForms(loadItems);

    // 4. Save Order Button Logik aktivieren
    setupSaveOrder();

    // 5. Profil & Design Tab Logik aktivieren
    initProfile();
}
