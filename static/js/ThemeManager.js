// Theme management - extracted from ui.js
import { escapeHTML, pSBC } from './utils.js';

export function applyTheme(settings) {
    document.body.className = 'min-h-screen flex justify-center p-4';
    if (settings.bg_image_url) { document.body.style.backgroundImage = `url('${escapeHTML(settings.bg_image_url)}')`; } else { document.body.style.backgroundImage = 'none'; }
    if (settings.theme === 'theme-custom') {
        document.body.classList.add(settings.theme);
        let customStyle = document.getElementById('custom-theme-style');
        if (!customStyle) { customStyle = document.createElement('style'); customStyle.id = 'custom-theme-style'; document.head.appendChild(customStyle); }
        customStyle.innerHTML = `body.theme-custom { --color-bg: ${escapeHTML(settings.custom_bg_color)}; --color-text: ${escapeHTML(settings.custom_text_color)}; --color-text-muted: ${escapeHTML(settings.custom_text_color)}CC; --color-item-bg: ${escapeHTML(settings.custom_button_color)}CC; --color-item-text: ${escapeHTML(settings.custom_button_text_color)}; --color-item-bg-hover: ${pSBC(-0.10, settings.custom_button_color)}DD; --color-item-shadow: rgba(0, 0, 0, 0.2); --color-border: ${pSBC(-0.20, settings.custom_button_color)}55; } body.theme-custom .countdown-box { background-color: rgba(0, 0, 0, 0.1); } body.theme-custom .email-input { color: #111; } body.theme-custom .email-submit-button { background-color: var(--color-item-text); color: var(--color-item-bg); }`;
    } else { document.body.classList.add(settings.theme || 'theme-dark'); }
    document.body.classList.add(settings.button_style || 'style-rounded');

    // Apply Google Font if configured
    if (settings.font_family) {
        const fontMap = {
            'inter': 'Inter',
            'poppins': 'Poppins',
            'playfair': 'Playfair Display',
            'space-grotesk': 'Space Grotesk',
            'dm-sans': 'DM Sans',
            'outfit': 'Outfit'
        };
        const fontName = fontMap[settings.font_family];
        if (fontName) {
            // Load Google Font dynamically
            const existingLink = document.getElementById('google-font-link');
            if (!existingLink) {
                const link = document.createElement('link');
                link.id = 'google-font-link';
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
                document.head.appendChild(link);
            }
            document.body.classList.add(`font-${settings.font_family}`);
        }
    }

    // Apply background pattern
    if (settings.bg_pattern && settings.bg_pattern !== 'none') {
        document.body.classList.add(`bg-pattern-${settings.bg_pattern}`);
    }
}
