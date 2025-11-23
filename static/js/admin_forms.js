import * as API from './admin_api.js';
import * as UI from './admin_ui.js';

/**
 * Initialisiert alle "Hinzufügen"-Formulare.
 * @param {Function} refreshCallback - Funktion zum Neuladen der Liste (loadItems)
 */
export function initCreationForms(refreshCallback) {
    const formStatus = document.getElementById('form-status');

    const forms = [
        {id: 'add-link-form', api: '/api/links', data: (e) => ({url: e.target.querySelector('input').value})},
        {id: 'add-video-form', api: '/api/videos', data: (e) => ({url: e.target.querySelector('input').value})},
        {id: 'add-header-form', api: '/api/headers', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-slider-group-form', api: '/api/slider_groups', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-grid-form', api: '/api/grids', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-faq-form', api: '/api/faqs', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-divider-form', api: '/api/dividers', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-footer-form', api: '/api/footers', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-contact-form', api: '/api/contact_form', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-email-form', api: '/api/email_form', data: (e) => ({title: e.target.querySelector('input').value})},
        {id: 'add-testimonial-form', api: '/api/testimonials', data: (e) => ({name: e.target.querySelector('#testimonial-name').value, text: prompt("Bitte gib den Text der Rezension ein:")})},
        {id: 'add-product-form', api: '/api/products', data: (e) => ({
            title: e.target.querySelector('#product-title').value, 
            price: e.target.querySelector('#product-price').value, 
            url: e.target.querySelector('#product-url').value
        })},
        {id: 'add-countdown-form', api: '/api/countdowns', data: (e) => ({
            title: e.target.querySelector('#countdown-title').value, 
            target_datetime: new Date(e.target.querySelector('#countdown-datetime').value).toISOString()
        })}
    ];

    forms.forEach(f => {
        const form = document.getElementById(f.id);
        if (form) {
            // Styling anwenden
            form.querySelectorAll('input').forEach(i => i.className = UI.STYLES.input);
            form.querySelectorAll('button').forEach(b => b.className = UI.STYLES.btnPrimary);
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const payload = f.data(e);
                    // Abbrechen, wenn Prompt (z.B. bei Testimonial) abgebrochen wurde
                    if(!payload || (payload.text === null)) return; 

                    await API.createItem(f.api, payload);
                    UI.setFormStatus(formStatus, 'Hinzugefügt!', 'text-green-400', 2000);
                    
                    // Liste aktualisieren
                    if(refreshCallback) refreshCallback();
                    
                    e.target.reset();
                } catch(err) {
                    UI.setFormStatus(formStatus, err.message, 'text-red-400', 5000);
                }
            });
        }
    });
}
