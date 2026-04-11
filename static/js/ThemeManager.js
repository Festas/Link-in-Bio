// Theme management - extracted from ui.js
import { escapeHTML, pSBC } from './utils.js';

function loadGoogleFont(fontName) {
    const existingLink = document.getElementById('google-font-link');
    const href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
    if (existingLink) {
        existingLink.href = href;
    } else {
        const link = document.createElement('link');
        link.id = 'google-font-link';
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
}

export function applyTheme(settings) {
    document.body.className = 'min-h-screen flex justify-center p-4';
    if (settings.bg_image_url) { document.body.style.backgroundImage = `url('${escapeHTML(settings.bg_image_url)}')`; } else { document.body.style.backgroundImage = 'none'; }
    if (settings.theme === 'theme-custom') {
        document.body.classList.add(settings.theme);
        let customStyle = document.getElementById('custom-theme-style');
        if (!customStyle) { customStyle = document.createElement('style'); customStyle.id = 'custom-theme-style'; document.head.appendChild(customStyle); }
        const bgColor = settings.custom_bg_color || '#000000';
        const isGradient = bgColor.includes('linear-gradient');
        const bgRule = isGradient ? `background: ${escapeHTML(bgColor)};` : `--color-bg: ${escapeHTML(bgColor)};`;
        customStyle.innerHTML = `body.theme-custom { ${bgRule} --color-text: ${escapeHTML(settings.custom_text_color)}; --color-text-muted: ${escapeHTML(settings.custom_text_color)}CC; --color-item-bg: ${escapeHTML(settings.custom_button_color)}CC; --color-item-text: ${escapeHTML(settings.custom_button_text_color)}; --color-item-bg-hover: ${pSBC(-0.10, settings.custom_button_color)}DD; --color-item-shadow: rgba(0, 0, 0, 0.2); --color-border: ${pSBC(-0.20, settings.custom_button_color)}55; } body.theme-custom .countdown-box { background-color: rgba(0, 0, 0, 0.1); } body.theme-custom .email-input { color: #111; } body.theme-custom .email-submit-button { background-color: var(--color-item-text); color: var(--color-item-bg); }`;
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
            loadGoogleFont(fontName);
            document.body.classList.add(`font-${settings.font_family}`);
        } else {
            // Support any Google Font by name
            const customFont = settings.font_family.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            loadGoogleFont(customFont);
            document.body.style.setProperty('--font-body', `'${customFont}', sans-serif`);
            document.body.style.fontFamily = `'${customFont}', sans-serif`;
        }
    }

    // Apply heading font if configured
    if (settings.heading_font) {
        const headingFont = settings.heading_font.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const existingHeadingLink = document.getElementById('google-heading-font-link');
        const href = `https://fonts.googleapis.com/css2?family=${headingFont.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`;
        if (existingHeadingLink) {
            existingHeadingLink.href = href;
        } else {
            const link = document.createElement('link');
            link.id = 'google-heading-font-link';
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
        document.body.style.setProperty('--font-heading', `'${headingFont}', sans-serif`);
    }

    // Apply font size if configured
    if (settings.font_size) {
        document.body.style.setProperty('--font-size-base', settings.font_size);
    }

    // Apply background pattern
    if (settings.bg_pattern && settings.bg_pattern !== 'none') {
        document.body.classList.add(`bg-pattern-${settings.bg_pattern}`);
    }
}
