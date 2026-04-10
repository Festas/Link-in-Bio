import { escapeHTML, pSBC, apiFetch } from './utils.js';
import { socialIconSVG } from './icons.js';
import { trackClick, subscribeEmail } from './api.js';

const state = { countdownIntervals: [], delegationInitialized: false, swipers: [] };

// Safe URL hostname checker to prevent incomplete URL substring matching
function urlHostMatches(url, domain) {
    try {
        const hostname = new URL(url).hostname;
        return hostname === domain || hostname.endsWith('.' + domain);
    } catch {
        return false;
    }
}

function urlHostMatchesAny(url, domains) {
    try {
        const hostname = new URL(url).hostname;
        return domains.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}
const CountdownManager = {
    clearAll() { state.countdownIntervals.forEach(entry => clearInterval(entry.interval)); state.countdownIntervals = []; },
    register(id, interval) { state.countdownIntervals.push({ id, interval }); },
    remove(id) { state.countdownIntervals = state.countdownIntervals.filter(entry => entry.id !== id); }
};

function setupGlobalEventListeners() {
    if (state.delegationInitialized) return;
    document.addEventListener('mousedown', (e) => {
        const link = e.target.closest('a.track-click');
        if (link && link.dataset.itemId) trackClick(link.dataset.itemId);
    });
    document.addEventListener('click', (e) => {
        const groupHeader = e.target.closest('.group-header, .faq-header');
        if (groupHeader) {
            const container = groupHeader.closest('.group-container, .glass-card');
            const content = container.querySelector('.group-content, .faq-content');
            const icon = groupHeader.querySelector('svg');
            if (content) {
                content.classList.toggle('hidden');
                if (content.classList.contains('hidden')) {
                    icon.style.transform = 'rotate(-90deg)';
                    if (groupHeader.classList.contains('faq-header')) icon.style.transform = 'rotate(0deg)';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                    if (groupHeader.classList.contains('faq-header')) icon.style.transform = 'rotate(180deg)';
                }
            }
        }
    });
    state.delegationInitialized = true;
}

const ItemRenderers = {
    link: (item, isFeatured) => {
        const a = document.createElement('a'); a.href = escapeHTML(item.url); a.target = "_blank"; a.rel = "noopener noreferrer";
        a.className = `item-link glass-card track-click flex items-center p-4 w-full transition-all duration-200 text-center ${isFeatured ? 'spotlight-item' : ''}`; a.dataset.itemId = item.id;
        let affiliateHTML = item.is_affiliate ? `<span class="item-affiliate-label text-xs absolute bottom-1 right-3 opacity-70 flex items-center space-x-1"><i data-lucide="euro" class="w-3 h-3"></i><span>Anzeige</span></span>` : '';
        a.innerHTML = `<div class="flex-shrink-0 w-12 h-12 mr-4">${item.image_url ? `<img src="${escapeHTML(item.image_url)}" alt="Icon" class="w-full h-full object-cover rounded-md" onerror="this.style.display='none';">` : `<div class="w-full h-full rounded-md" style="background-color: rgba(255,255,255,0.1);"></div>`}</div><div class="flex-grow text-left relative"><p class="item-title font-semibold">${escapeHTML(item.title)}</p>${affiliateHTML}</div><div class="flex-shrink-0 ml-4"><i data-lucide="arrow-up-right" class="w-5 h-5" style="color: var(--color-item-text);"></i></div>`;
        return a;
    },
    header: (item) => { const h2 = document.createElement('h2'); h2.className = 'item-header text-lg text-center font-bold pt-4 pb-2 uppercase tracking-wide text-shadow-sm'; h2.textContent = escapeHTML(item.title); return h2; },
    video: (item) => {
        const div = document.createElement('div'); div.className = 'item-video-wrapper glass-card overflow-hidden';
        let iframeHTML = '';
        if(item.url.includes('spotify')) { iframeHTML = `<iframe src="${escapeHTML(item.url)}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media" class="style-rounded"></iframe>`; } 
        else { div.classList.add('aspect-video'); iframeHTML = `<iframe src="${escapeHTML(item.url)}" width="100%" height="100%" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen class="style-rounded"></iframe>`; }
        div.innerHTML = `<p class="item-title font-semibold p-4 pb-3">${escapeHTML(item.title)}</p>${iframeHTML}`; return div;
    },
    grid: (item) => {
        const cols = item.grid_columns || 2; 
        const wrapper = document.createElement('div'); 
        wrapper.className = 'group-container glass-card mb-4 overflow-hidden rounded-2xl';
        
        let headerHTML = item.title ? 
            `<div class="group-header flex justify-between items-center p-5 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors border-b border-white/10">
                <h3 class="text-xl font-bold text-white">${escapeHTML(item.title)}</h3>
                <i data-lucide="chevron-down" class="chevron-icon w-5 h-5 text-white transition-transform"></i>
            </div>` : '';
        
        let contentHTML = `<div class="group-content p-5 grid gap-4" style="grid-template-columns: repeat(${cols}, 1fr);">`;
        
        if (item.children) { 
            item.children.forEach(child => { 
                contentHTML += `
                    <a href="${escapeHTML(child.url)}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="glass-card track-click relative overflow-hidden block aspect-square group hover:scale-[1.03] transition-all duration-300 rounded-xl shadow-lg hover:shadow-2xl border border-white/10 hover:border-white/30" 
                       data-item-id="${child.id}">
                        ${child.image_url ? 
                            `<img src="${escapeHTML(child.image_url)}" 
                                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                  onerror="this.style.display='none'">` : 
                            `<div class="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                <i data-lucide="link" class="w-10 h-10 text-white opacity-50"></i>
                            </div>`
                        }
                        <div class="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-4 text-center z-10">
                            <span class="text-white text-base font-bold leading-tight block drop-shadow-lg whitespace-normal break-words">
                                ${escapeHTML(child.title)}
                            </span>
                        </div>
                    </a>`; 
            }); 
        }
        
        contentHTML += `</div>`; 
        wrapper.innerHTML = headerHTML + contentHTML; 
        return wrapper;
    },
    slider_group: (item) => {
        const wrapper = document.createElement('div'); 
        wrapper.className = 'group-container glass-card mb-4 overflow-hidden rounded-2xl';
        
        const titleHTML = item.title ? 
            `<div class="group-header flex justify-between items-center p-4 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                <h3 class="text-lg font-bold text-white">${escapeHTML(item.title)}</h3>
                <i data-lucide="chevron-down" class="chevron-icon w-5 h-5 text-white transition-transform"></i>
            </div>` : '';

        // Build slides
        let slidesHTML = '';
        if (item.children && item.children.length) {
            item.children.forEach(child => {
                // Each slide is a clickable card with image, overlay, and title
                const imgHTML = child.image_url ? 
                    `<img loading="lazy" src="${escapeHTML(child.image_url)}" alt="${escapeHTML(child.title)}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">` : 
                    `<div class="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <i data-lucide="image" class="w-12 h-12 text-gray-500"></i>
                    </div>`;
                
                slidesHTML += `
                    <div class="swiper-slide" role="group" aria-label="${escapeHTML(child.title)}">
                        <a href="${escapeHTML(child.url)}" target="_blank" rel="noopener noreferrer" 
                           class="slide-card block relative overflow-hidden rounded-xl h-full track-click group" 
                           data-item-id="${child.id}">
                            ${imgHTML}
                            <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                            <div class="absolute inset-x-0 bottom-0 p-4 z-10">
                                <p class="text-white text-sm font-bold drop-shadow-lg leading-tight line-clamp-2">
                                    ${escapeHTML(child.title)}
                                </p>
                            </div>
                        </a>
                    </div>`;
            });
        }

        // Unique ID for this slider instance
        const swiperId = `swiper-${item.id}`;
        
        wrapper.innerHTML = `
            ${titleHTML}
            <div class="group-content p-4">
                <div class="swiper swiper-slider-group relative" id="${swiperId}" aria-label="${escapeHTML(item.title || 'Slider')}">
                    <div class="swiper-wrapper">${slidesHTML}</div>
                    
                    <!-- Navigation Buttons -->
                    <div class="swiper-button-prev slider-nav-btn"></div>
                    <div class="swiper-button-next slider-nav-btn"></div>
                    
                    <!-- Pagination Dots -->
                    <div class="swiper-pagination"></div>
                </div>
            </div>`;

        return wrapper;
    },
    email_form: (item) => {
        const div = document.createElement('div'); 
        div.className = 'item-email-form glass-card p-5 text-center';
        
        const REDIRECT_DELAY_MS = 1500; // Time to show success message before redirect
        
        div.innerHTML = `
            <h3 class="email-form-title text-lg font-semibold mb-3">${escapeHTML(item.title)}</h3>
            <form class="subscribe-form space-y-3">
                <input type="email" class="email-input w-full p-2.5 rounded-md text-sm" placeholder="deine@email.com" required>
                <select class="redirect-page-select w-full p-2.5 rounded-md text-sm bg-white/10 border border-white/20 text-white">
                    <option value="">Nach Anmeldung zur Hauptseite</option>
                </select>
                <div class="text-xs text-left" style="color: var(--color-text-muted);">
                    <label class="flex items-start space-x-2">
                        <input type="checkbox" class="privacy-check form-checkbox mt-0.5" required>
                        <span>Ich stimme der <a href="/privacy" target="_blank" class="underline hover:opacity-75">Datenschutzerklärung</a> zu.</span>
                    </label>
                </div>
                <button type="submit" class="email-submit-button w-full p-2.5 rounded-md text-sm font-bold">Abonnieren</button>
                <p class="subscribe-status text-sm mt-2"></p>
            </form>`;
        
        const form = div.querySelector('.subscribe-form');
        const emailInput = form.querySelector('.email-input');
        const privacyCheck = form.querySelector('.privacy-check');
        const statusEl = form.querySelector('.subscribe-status');
        const pageSelect = form.querySelector('.redirect-page-select');
        
        // Load available pages for the dropdown
        apiFetch('/api/pages/public')
            .then(response => response.json())
            .then(pages => {
                pages.forEach(page => {
                    const option = document.createElement('option');
                    option.value = page.id;
                    option.textContent = `Nach Anmeldung zu: ${page.title}`;
                    pageSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Failed to load pages:', err));
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!privacyCheck.checked) {
                statusEl.textContent = 'Bitte die Datenschutzerklärung akzeptieren.';
                statusEl.style.color = 'var(--color-text-muted)';
                return;
            }
            
            statusEl.textContent = 'Sende...';
            statusEl.style.color = 'var(--color-text-muted)';
            
            try {
                const redirectPageId = pageSelect.value ? parseInt(pageSelect.value) : null;
                const result = await subscribeEmail(emailInput.value, privacyCheck.checked, redirectPageId);
                
                statusEl.textContent = result.message || 'Danke!';
                statusEl.style.color = 'var(--color-text)';
                emailInput.value = '';
                privacyCheck.checked = false;
                pageSelect.value = '';
                
                // Handle redirect if provided
                if (result.redirect_url) {
                    setTimeout(() => {
                        window.location.href = result.redirect_url;
                    }, REDIRECT_DELAY_MS);
                }
            } catch (error) {
                statusEl.textContent = error.message;
                statusEl.style.color = 'var(--color-text-muted)';
            }
        });
        
        return div;
    },
    countdown: (item) => {
        const div = document.createElement('div'); div.className = 'item-countdown-wrapper glass-card p-5';
        const targetDate = new Date(item.url).getTime(); const timerId = `countdown-timer-${item.id}`;
        div.innerHTML = `<h3 class="item-title text-lg font-semibold mb-4 text-center">${escapeHTML(item.title)}</h3><div id="${timerId}" class="countdown-grid"></div>`;
        const updateTimer = () => {
            const now = new Date().getTime(); const distance = targetDate - now; const timerEl = document.getElementById(timerId);
            if (!timerEl) { const entry = state.countdownIntervals.find(i => i.id === timerId); if (entry) clearInterval(entry.interval); CountdownManager.remove(timerId); return; }
            if (distance < 0) { timerEl.innerHTML = `<p class="item-title col-span-4 text-xl font-bold text-center">Jetzt verfügbar!</p>`; const entry = state.countdownIntervals.find(i => i.id === timerId); if (entry) clearInterval(entry.interval); CountdownManager.remove(timerId); } 
            else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24)); const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                timerEl.innerHTML = `<div class="countdown-box"><div class="countdown-value">${days}</div><div class="countdown-label">Tage</div></div><div class="countdown-box"><div class="countdown-value">${hours}</div><div class="countdown-label">Std</div></div><div class="countdown-box"><div class="countdown-value">${minutes}</div><div class="countdown-label">Min</div></div><div class="countdown-box"><div class="countdown-value">${seconds}</div><div class="countdown-label">Sek</div></div>`;
            }
        };
        updateTimer(); const interval = setInterval(updateTimer, 1000); CountdownManager.register(timerId, interval); return div;
    },
    faq: (item) => {
        const div = document.createElement('div'); div.className = 'glass-card mb-4 overflow-hidden rounded-lg';
        div.innerHTML = `<div class="faq-header flex justify-between items-center p-4 cursor-pointer bg-white bg-opacity-5 hover:bg-opacity-10 transition-colors"><span class="font-medium">${escapeHTML(item.title)}</span><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></div><div class="faq-content hidden p-4 border-t border-white border-opacity-10 text-sm text-gray-200 leading-relaxed">${escapeHTML(item.url)}</div>`; return div;
    },
    divider: (item) => {
        const div = document.createElement('div'); div.className = 'flex items-center py-4';
        if (item.title && item.title !== '---') { div.innerHTML = `<div class="flex-grow h-px bg-gray-600"></div><span class="flex-shrink-0 px-4 text-gray-400 text-xs uppercase tracking-widest">${escapeHTML(item.title)}</span><div class="flex-grow h-px bg-gray-600"></div>`; } 
        else { div.innerHTML = `<div class="w-full h-px bg-gray-600 my-2"></div>`; } return div;
    },
    testimonial: (item) => {
        const div = document.createElement('div'); div.className = 'glass-card p-5 mb-4 text-left relative';
        div.innerHTML = `<i data-lucide="quote" class="absolute top-3 right-4 text-gray-600 w-8 h-8 opacity-50"></i><div class="flex items-center mb-3">${item.image_url ? `<img src="${escapeHTML(item.image_url)}" class="w-10 h-10 rounded-full object-cover mr-3 border border-gray-600" alt="${escapeHTML(item.title)}">` : '<div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 border border-gray-600"><i data-lucide="user" class="w-5 h-5 text-gray-400"></i></div>'}<div><p class="font-bold text-sm text-white">${escapeHTML(item.title)}</p><div class="flex text-yellow-400 text-xs"><i data-lucide="star" class="w-3 h-3 fill-current"></i><i data-lucide="star" class="w-3 h-3 fill-current"></i><i data-lucide="star" class="w-3 h-3 fill-current"></i><i data-lucide="star" class="w-3 h-3 fill-current"></i><i data-lucide="star" class="w-3 h-3 fill-current"></i></div></div></div><p class="text-sm text-gray-300 italic leading-relaxed">"${escapeHTML(item.url)}"</p>`; return div;
    },
    contact_form: (item) => {
        const div = document.createElement('div'); div.className = 'item-contact-form glass-card p-5 text-center';
        div.innerHTML = `<h3 class="item-title text-lg font-semibold mb-3">${escapeHTML(item.title)}</h3><form class="contact-form space-y-3 text-left"><input type="text" name="name" class="email-input w-full p-2.5 rounded-md text-sm" placeholder="Dein Name" required><input type="email" name="email" class="email-input w-full p-2.5 rounded-md text-sm" placeholder="Deine E-Mail" required><textarea name="message" rows="3" class="email-input w-full p-2.5 rounded-md text-sm" placeholder="Deine Nachricht..." required></textarea><div class="text-xs text-left" style="color: var(--color-text-muted);"><label class="flex items-start space-x-2"><input type="checkbox" name="privacy" class="privacy-check form-checkbox mt-0.5" required><span>Ich stimme der <a href="/privacy" target="_blank" class="underline hover:opacity-75">Datenschutzerklärung</a> zu.</span></label></div><button type="submit" class="email-submit-button w-full p-2.5 rounded-md text-sm font-bold">Nachricht senden</button><p class="contact-status text-sm mt-2 text-center"></p></form>`;
        const form = div.querySelector('.contact-form'); const statusEl = div.querySelector('.contact-status');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const payload = { name: formData.get('name'), email: formData.get('email'), message: formData.get('message'), privacy_agreed: formData.get('privacy') === 'on' };
            statusEl.textContent = 'Sende...'; statusEl.style.color = 'var(--color-text-muted)';
            try { const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.detail || 'Fehler beim Senden'); statusEl.textContent = 'Danke für deine Nachricht!'; statusEl.style.color = 'var(--color-text)'; form.reset(); } catch (error) { statusEl.textContent = error.message; statusEl.style.color = 'red'; }
        }); return div;
    },
    product: (item, isFeatured) => {
        const a = document.createElement('a'); a.href = escapeHTML(item.url); a.target = "_blank"; a.rel = "noopener noreferrer";
        a.className = `item-product glass-card track-click flex p-4 w-full transition-all duration-200 hover:scale-[1.02] ${isFeatured ? 'spotlight-item' : ''}`; a.dataset.itemId = item.id;
        a.innerHTML = `<div class="flex-shrink-0 w-24 h-24 mr-4">${item.image_url ? `<img src="${escapeHTML(item.image_url)}" alt="Produktbild" class="w-full h-full object-cover rounded-lg shadow-sm" onerror="this.style.display='none';">` : `<div class="w-full h-full rounded-lg bg-white bg-opacity-10 flex items-center justify-center"><i data-lucide="shopping-bag" class="w-8 h-8 text-white opacity-50"></i></div>`}</div><div class="flex-grow flex flex-col justify-between text-left"><div><p class="item-title font-bold text-lg leading-tight mb-1">${escapeHTML(item.title)}</p><p class="text-sm text-gray-300 opacity-80">Jetzt ansehen</p></div><div class="flex items-center justify-between mt-2"><span class="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-bold text-white">${escapeHTML(item.price || 'Angebot')}</span><div class="bg-white text-black rounded-full p-1.5"><i data-lucide="arrow-right" class="w-4 h-4"></i></div></div></div>`;
        return a;
    },
    music_embed: (item) => {
        const div = document.createElement('div');
        div.className = 'item-music-embed glass-card overflow-hidden';
        const url = item.url || '';
        let embedHTML = '';
        if (urlHostMatchesAny(url, ['spotify.com', 'open.spotify.com'])) {
            // Convert Spotify URL to embed URL
            const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
            const isTrack = url.includes('/track/');
            const height = isTrack ? '152' : '352';
            embedHTML = `<iframe src="${escapeHTML(embedUrl)}" width="100%" height="${height}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 12px;"></iframe>`;
        } else if (urlHostMatchesAny(url, ['music.apple.com'])) {
            const embedUrl = url.replace('music.apple.com', 'embed.music.apple.com');
            embedHTML = `<iframe src="${escapeHTML(embedUrl)}" width="100%" height="175" frameborder="0" allow="autoplay; encrypted-media" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" loading="lazy" style="border-radius: 12px; overflow: hidden;"></iframe>`;
        } else if (urlHostMatchesAny(url, ['soundcloud.com'])) {
            embedHTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false" loading="lazy"></iframe>`;
        } else {
            embedHTML = `<div class="p-5 text-center"><i data-lucide="music" class="w-10 h-10 mx-auto mb-3 opacity-50"></i><p class="text-sm opacity-70">Unterstützter Link: Spotify, Apple Music, SoundCloud</p></div>`;
        }
        const titleHTML = item.title && item.title !== 'Music' ? `<p class="item-title font-semibold p-4 pb-2">${escapeHTML(item.title)}</p>` : '';
        div.innerHTML = `${titleHTML}<div class="px-4 pb-4">${embedHTML}</div>`;
        return div;
    },
    text_block: (item) => {
        const div = document.createElement('div');
        div.className = 'item-text-block glass-card p-5';
        const titleHTML = item.title ? `<h3 class="item-title text-lg font-bold mb-3">${escapeHTML(item.title)}</h3>` : '';
        const content = item.url || '';
        div.innerHTML = `${titleHTML}<div class="text-block-content text-sm leading-relaxed" style="color: var(--color-text-muted);">${escapeHTML(content).replace(/\n/g, '<br>')}</div>`;
        return div;
    },
    social_embed: (item) => {
        const div = document.createElement('div');
        div.className = 'item-social-embed glass-card overflow-hidden';
        const url = item.url || '';
        let embedHTML = '';
        if (urlHostMatchesAny(url, ['youtube.com', 'www.youtube.com']) && url.includes('/watch') || urlHostMatchesAny(url, ['youtu.be'])) {
            let videoId = '';
            if (urlHostMatchesAny(url, ['youtu.be'])) {
                videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] || '';
            } else {
                const match = url.match(/[?&]v=([^&#]+)/);
                videoId = match ? match[1] : '';
            }
            if (videoId) {
                embedHTML = `<div class="aspect-video"><iframe src="https://www.youtube.com/embed/${escapeHTML(videoId)}" width="100%" height="100%" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
            }
        } else if (urlHostMatchesAny(url, ['instagram.com', 'www.instagram.com']) && (url.includes('/p/') || url.includes('/reel/'))) {
            embedHTML = `<div class="p-4"><blockquote class="instagram-media" data-instgrm-permalink="${escapeHTML(url)}" style="max-width:100%;"></blockquote></div>`;
            // Load Instagram embed script if not already loaded
            if (!document.querySelector('script[src*="instagram.com/embed"]')) {
                const script = document.createElement('script');
                script.src = 'https://www.instagram.com/embed.js';
                script.async = true;
                document.body.appendChild(script);
            } else if (window.instgrm) {
                setTimeout(() => window.instgrm.Embeds.process(), 100);
            }
        } else if (urlHostMatchesAny(url, ['tiktok.com', 'www.tiktok.com'])) {
            embedHTML = `<div class="p-4 text-center"><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-3 rounded-lg transition-all" style="background: var(--color-item-bg-hover);"><i data-lucide="play" class="w-5 h-5"></i><span class="font-semibold">TikTok ansehen</span><i data-lucide="external-link" class="w-4 h-4 opacity-60"></i></a></div>`;
        } else {
            embedHTML = `<div class="p-5 text-center"><i data-lucide="share-2" class="w-10 h-10 mx-auto mb-3 opacity-50"></i><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="text-sm font-medium underline opacity-80 hover:opacity-100">Öffnen</a></div>`;
        }
        const titleHTML = item.title && item.title !== 'Social' ? `<p class="item-title font-semibold p-4 pb-2">${escapeHTML(item.title)}</p>` : '';
        div.innerHTML = `${titleHTML}${embedHTML}`;
        return div;
    },
    map_embed: (item) => {
        const div = document.createElement('div');
        div.className = 'item-map-embed glass-card overflow-hidden';
        const url = item.url || '';
        let embedHTML = '';
        if (urlHostMatchesAny(url, ['google.com', 'www.google.com', 'maps.google.com', 'goo.gl'])) {
            // Handle Google Maps embed URL or link to maps
            if (url.includes('maps/embed')) {
                embedHTML = `<div class="aspect-video"><iframe src="${escapeHTML(url)}" width="100%" height="100%" style="border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
            } else {
                embedHTML = `<div class="p-4 text-center"><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-3 rounded-lg transition-all" style="background: var(--color-item-bg-hover);"><i data-lucide="map-pin" class="w-5 h-5"></i><span class="font-semibold">Auf Karte ansehen</span><i data-lucide="external-link" class="w-4 h-4 opacity-60"></i></a></div>`;
            }
        } else {
            embedHTML = `<div class="p-4 text-center"><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-3 rounded-lg transition-all" style="background: var(--color-item-bg-hover);"><i data-lucide="map-pin" class="w-5 h-5"></i><span class="font-semibold">Standort ansehen</span><i data-lucide="external-link" class="w-4 h-4 opacity-60"></i></a></div>`;
        }
        const titleHTML = item.title && item.title !== 'Location' ? `<p class="item-title font-semibold p-4 pb-2">${escapeHTML(item.title)}</p>` : '';
        div.innerHTML = `${titleHTML}${embedHTML}`;
        return div;
    }
};

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

// KORRIGIERT: Render Profile Header mit Smart Links
export function renderProfileHeader(settings) {
    const header = document.getElementById('profile-header');
    let socialLinksHTML = '';
    const socialMap = [
        { key: 'social_youtube', icon: 'youtube', prefix: 'https://youtube.com/' },
        { key: 'social_instagram', icon: 'instagram', prefix: 'https://instagram.com/' },
        { key: 'social_tiktok', icon: 'tiktok', prefix: 'https://tiktok.com/@' },
        { key: 'social_twitch', icon: 'twitch', prefix: 'https://twitch.tv/' },
        { key: 'social_x', icon: 'twitter', prefix: 'https://x.com/' },
        { key: 'social_discord', icon: 'discord', prefix: 'https://discord.gg/' },
        { key: 'social_email', icon: 'mail', prefix: 'mailto:' }
    ];
    
    socialMap.forEach(social => {
        let val = settings[social.key];
        if (val && val.trim() !== "") {
            val = val.trim();
            let url = val;

            // Prüfen ob es schon ein voller Link ist (oder mailto)
            const isFull = val.startsWith('http') || val.startsWith('mailto:');

            if (!isFull && social.prefix) {
                // Bei Social Media (außer Email) das @ entfernen, um Dopplung zu vermeiden
                if (social.key !== 'social_email' && val.startsWith('@')) {
                    val = val.substring(1);
                }
                url = social.prefix + val;
            }

            // Use inline SVG for known logos, fallback to lucide icons
            const svg = socialIconSVG(social.icon, 'w-5 h-5');
            const iconHTML = svg ? svg : `<i data-lucide="${social.icon}" class="w-5 h-5" style="color: var(--color-text);"></i>`;

            socialLinksHTML += `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="social-icon hover:opacity-75 transition-opacity p-2 glass-card rounded-full bg-opacity-50 hover:bg-opacity-80" title="${social.icon}">${iconHTML}</a>`;
        }
    });

    header.style.position = 'relative'; 

    // Verified badge HTML
    const verifiedBadge = settings.verified_badge ? `<svg class="inline-block w-5 h-5 ml-1 align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent, #3b82f6);"/></svg>` : '';

    // Share button HTML
    const shareButtonHTML = settings.show_share_button !== false ? `<button id="share-btn" class="share-button p-2 glass-card rounded-full transition-all hover:scale-110" title="Teilen" style="background: var(--color-item-bg); border: 1px solid var(--color-border);"><i data-lucide="share-2" class="w-4 h-4"></i></button>` : '';

    // Render header with left-aligned profile image (no automatic centering)
    header.innerHTML = `<div class="animate-entry text-left" style="animation-delay: 0ms;"><div class="flex items-start justify-between"><div class="flex-grow"><img id="profile-image" src="${escapeHTML(settings.image_url || 'https://placehold.co/100x100/374151/FFFFFF?text=Bild')}" alt="Profilbild" class="w-24 h-24 rounded-full mb-4 object-cover border-4 shadow-lg" style="border-color: var(--color-border);" onerror="this.src='https://placehold.co/100x100/374151/FFFFFF?text=Bild'; this.onerror=null;"></div>${shareButtonHTML}</div><h1 id="profile-title" class="profile-title text-2xl text-shadow-md">${escapeHTML(settings.title || 'Titel')}${verifiedBadge}</h1><p id="profile-bio" class="profile-bio text-sm mt-2 opacity-90">${escapeHTML(settings.bio || 'Bio')}</p></div><div id="social-links" class="flex justify-start space-x-3 mt-5 animate-entry" style="animation-delay: 100ms;">${socialLinksHTML}</div><div id="page-stats" class="flex justify-start space-x-4 mt-3 animate-entry" style="animation-delay: 150ms;"></div>`;

    // Setup share button
    const shareBtn = header.querySelector('#share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => showShareModal(settings));
    }

    // Load and display page view count
    if (settings.show_views) {
        apiFetch('/api/pageviews/count')
            .then(r => r.json())
            .then(data => {
                const statsEl = document.getElementById('page-stats');
                if (statsEl && data.count > 0) {
                    statsEl.innerHTML = `<span class="text-xs flex items-center gap-1 opacity-60"><i data-lucide="eye" class="w-3 h-3"></i> ${data.count.toLocaleString()} Aufrufe</span>`;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            })
            .catch(() => {});
    }

    // Track pageview
    apiFetch('/api/pageview', { method: 'POST' }).catch(() => {});
    header.classList.remove('opacity-0');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function renderItems(items) {
    CountdownManager.clearAll();
    setupGlobalEventListeners(); 
    const spotlightContainer = document.getElementById('spotlight-section');
    const mainContainer = document.getElementById('items-container');
    spotlightContainer.innerHTML = '';
    mainContainer.innerHTML = '';
    let hasSpotlight = false;
    let delay = 200; 
    
    items.forEach(item => {
        const renderer = ItemRenderers[item.item_type];
        if (renderer) {
            const isFeatured = item.is_featured && item.item_type === 'link';
            const itemElement = renderer(item, isFeatured);
            if (itemElement) {
                itemElement.classList.add('animate-entry');
                itemElement.style.animationDelay = `${delay}ms`;
                delay += 50; 
                if (isFeatured) { spotlightContainer.appendChild(itemElement); hasSpotlight = true; } else { mainContainer.appendChild(itemElement); }
            }
        }
    });
    spotlightContainer.style.display = hasSpotlight ? 'block' : 'none';
    document.getElementById('loading-spinner').style.display = 'none';
    initSwipers(); 
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Initialize Swiper sliders present in the page. Destroys previous instances first.
export function initSwipers() {
    try {
        // If Swiper not available, skip silently
        if (typeof Swiper === 'undefined') return;

        // Destroy existing instances
        if (state.swipers && state.swipers.length > 0) {
            state.swipers.forEach(s => {
                try { s.destroy(true, true); } catch (_) {}
            });
            state.swipers = [];
        }

        document.querySelectorAll('.swiper-slider-group').forEach(swiperEl => {
            // Enhanced configuration inspired by beacons.ai
            const config = {
                // Core settings
                loop: false,
                centeredSlides: false,
                spaceBetween: 16,
                
                // Performance
                preloadImages: false,
                lazy: { 
                    enabled: true, 
                    loadPrevNext: true, 
                    loadOnTransitionStart: true 
                },
                watchOverflow: true,
                
                // Interactivity
                slideToClickedSlide: false,
                keyboard: { 
                    enabled: true, 
                    onlyInViewport: true 
                },
                
                // Accessibility
                a11y: { 
                    enabled: true,
                    prevSlideMessage: 'Vorheriger Slide',
                    nextSlideMessage: 'Nächster Slide',
                },
                
                // Responsive breakpoints - inspired by beacons.ai
                slidesPerView: 1.2,
                breakpoints: {
                    480: { 
                        slidesPerView: 1.5,
                        spaceBetween: 12
                    },
                    640: { 
                        slidesPerView: 2,
                        spaceBetween: 16
                    },
                    1024: { 
                        slidesPerView: 2.5,
                        spaceBetween: 16
                    },
                    1280: {
                        slidesPerView: 3,
                        spaceBetween: 20
                    }
                },
                
                // Navigation
                navigation: {
                    prevEl: swiperEl.querySelector('.swiper-button-prev'),
                    nextEl: swiperEl.querySelector('.swiper-button-next'),
                },
                
                // Pagination
                pagination: {
                    el: swiperEl.querySelector('.swiper-pagination'),
                    clickable: true,
                    dynamicBullets: true,
                },
                
                // Effects
                effect: 'slide',
                speed: 400,
                
                // Touch behavior
                touchRatio: 1,
                threshold: 5,
                longSwipesRatio: 0.5,
            };

            // Create instance and store it
            try {
                const instance = new Swiper(swiperEl, config);
                state.swipers.push(instance);
            } catch (err) {
                console.warn('Swiper init failed for', swiperEl, err);
            }
        });
    } catch (e) {
        console.error('initSwipers error', e);
    }
}

// Share Modal - QR Code + Social Sharing
function showShareModal(settings) {
    // Remove existing modal if any
    const existing = document.getElementById('share-modal');
    if (existing) existing.remove();

    const pageUrl = window.location.href;
    const pageTitle = settings.title || document.title;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageUrl)}&bgcolor=ffffff&color=000000&format=svg`;

    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
    modal.style.backdropFilter = 'blur(8px)';
    modal.innerHTML = `
        <div class="glass-card p-6 rounded-2xl max-w-sm w-full text-center relative animate-entry" style="background: var(--color-bg); border: 1px solid var(--color-border);">
            <button id="close-share-modal" class="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
            <h3 class="text-lg font-bold mb-4" style="color: var(--color-text);">Teilen</h3>
            <div class="mb-4 flex justify-center">
                <img src="${qrApiUrl}" alt="QR Code" class="w-40 h-40 rounded-lg" style="background: white; padding: 8px;">
            </div>
            <div class="flex items-center gap-2 mb-4 p-2 rounded-lg" style="background: var(--color-item-bg);">
                <input type="text" value="${escapeHTML(pageUrl)}" readonly class="flex-grow text-sm bg-transparent outline-none text-center" style="color: var(--color-text);" id="share-url-input">
                <button id="copy-url-btn" class="p-2 rounded-md hover:bg-white/10 transition-colors flex-shrink-0" title="Kopieren">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex justify-center gap-3">
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}" target="_blank" rel="noopener noreferrer" class="p-3 rounded-full hover:bg-white/10 transition-all hover:scale-110" title="X/Twitter">
                    <i data-lucide="twitter" class="w-5 h-5"></i>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener noreferrer" class="p-3 rounded-full hover:bg-white/10 transition-all hover:scale-110" title="Facebook">
                    <i data-lucide="facebook" class="w-5 h-5"></i>
                </a>
                <a href="https://wa.me/?text=${encodeURIComponent(pageTitle + ' ' + pageUrl)}" target="_blank" rel="noopener noreferrer" class="p-3 rounded-full hover:bg-white/10 transition-all hover:scale-110" title="WhatsApp">
                    <i data-lucide="message-circle" class="w-5 h-5"></i>
                </a>
                <a href="mailto:?subject=${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(pageUrl)}" class="p-3 rounded-full hover:bg-white/10 transition-all hover:scale-110" title="E-Mail">
                    <i data-lucide="mail" class="w-5 h-5"></i>
                </a>
            </div>
        </div>`;

    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Close modal handlers
    modal.querySelector('#close-share-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Copy URL handler
    modal.querySelector('#copy-url-btn').addEventListener('click', () => {
        const input = modal.querySelector('#share-url-input');
        navigator.clipboard.writeText(input.value).then(() => {
            const btn = modal.querySelector('#copy-url-btn');
            btn.innerHTML = '<i data-lucide="check" class="w-4 h-4" style="color: var(--color-accent);"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 2000);
        }).catch(() => {
            input.select();
            document.execCommand('copy');
        });
    });

    // Use native share if available on mobile
    if (navigator.share) {
        // Add native share button
        const nativeBtn = document.createElement('button');
        nativeBtn.className = 'w-full mt-3 p-3 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02]';
        nativeBtn.style.cssText = 'background: var(--color-accent); color: var(--color-bg);';
        nativeBtn.innerHTML = '<i data-lucide="share" class="w-4 h-4 inline mr-2"></i>Mehr Optionen...';
        nativeBtn.addEventListener('click', () => {
            navigator.share({ title: pageTitle, url: pageUrl }).catch(() => {});
        });
        modal.querySelector('.glass-card').appendChild(nativeBtn);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// Render footer with branding
export function renderFooter(settings) {
    const footerText = settings.footer_text;
    if (!footerText) return;

    const existingFooter = document.getElementById('page-footer');
    if (existingFooter) existingFooter.remove();

    const footer = document.createElement('footer');
    footer.id = 'page-footer';
    footer.className = 'text-center py-6 mt-8 animate-entry';
    footer.style.animationDelay = '500ms';
    footer.innerHTML = `<p class="text-xs opacity-40">${escapeHTML(footerText)}</p>`;
    
    const container = document.querySelector('.w-full.max-w-md') || document.querySelector('main') || document.body;
    container.appendChild(footer);
}
