// Enhanced UI Interactions and Scroll Animations

// Scroll Reveal Animation
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe all elements with scroll-reveal class
    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
}

// Smooth Scroll for Anchor Links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Enhanced Click Tracking with Visual Feedback
function enhanceClickTracking() {
    document.querySelectorAll('.link-item, .product-card').forEach(item => {
        item.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Add ripple CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        width: 100px;
        height: 100px;
        margin-top: -50px;
        margin-left: -50px;
        animation: ripple-effect 0.6s;
        pointer-events: none;
    }
    
    @keyframes ripple-effect {
        from {
            opacity: 1;
            transform: scale(0);
        }
        to {
            opacity: 0;
            transform: scale(4);
        }
    }
`;
document.head.appendChild(rippleStyle);

// Parallax Background Effect
function initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    window.addEventListener('scroll', () => {
        parallaxElements.forEach(el => {
            const speed = el.dataset.parallax || 0.5;
            const yPos = -(window.pageYOffset * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Lazy Loading Images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Typing Animation for Bio or Headers
function initTypingAnimation() {
    const typingElements = document.querySelectorAll('[data-typing]');
    
    typingElements.forEach(el => {
        const text = el.textContent;
        const speed = parseInt(el.dataset.typingSpeed) || 50;
        el.textContent = '';
        el.style.display = 'inline-block';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                el.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        };
        
        // Start typing when element is visible
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                typeWriter();
                observer.disconnect();
            }
        });
        
        observer.observe(el);
    });
}

// Auto-play Videos on Scroll
function initAutoplayVideos() {
    const videos = document.querySelectorAll('video[data-autoplay]');
    
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            } else {
                video.pause();
            }
        });
    }, {
        threshold: 0.5
    });
    
    videos.forEach(video => videoObserver.observe(video));
}

// Enhanced Countdown Timer
function enhanceCountdowns() {
    const countdowns = document.querySelectorAll('[data-countdown]');
    
    countdowns.forEach(countdown => {
        const targetDate = new Date(countdown.dataset.countdown);
        
        function updateCountdown() {
            const now = new Date();
            const diff = targetDate - now;
            
            if (diff <= 0) {
                countdown.innerHTML = '<span class="text-xl font-bold">Event Started!</span>';
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            countdown.innerHTML = `
                <div class="flex justify-center gap-3 sm:gap-4">
                    <div class="countdown-digit">
                        <div class="text-2xl sm:text-3xl font-bold">${days}</div>
                        <div class="countdown-label">Tage</div>
                    </div>
                    <div class="countdown-digit">
                        <div class="text-2xl sm:text-3xl font-bold">${hours}</div>
                        <div class="countdown-label">Std</div>
                    </div>
                    <div class="countdown-digit">
                        <div class="text-2xl sm:text-3xl font-bold">${minutes}</div>
                        <div class="countdown-label">Min</div>
                    </div>
                    <div class="countdown-digit">
                        <div class="text-2xl sm:text-3xl font-bold">${seconds}</div>
                        <div class="countdown-label">Sek</div>
                    </div>
                </div>
            `;
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    });
}

// Copy to Clipboard with Feedback
function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
                
                // Show feedback
                const originalText = btn.textContent;
                btn.textContent = '✓ Kopiert!';
                btn.classList.add('bg-green-500');
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('bg-green-500');
                }, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });
    });
}

// Share API Integration
function initShareButtons() {
    if (navigator.share) {
        document.querySelectorAll('[data-share]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await navigator.share({
                        title: document.title,
                        text: document.querySelector('meta[name="description"]')?.content || '',
                        url: window.location.href
                    });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Share failed:', err);
                    }
                }
            });
        });
    } else {
        // Fallback: hide share buttons if API not supported
        document.querySelectorAll('[data-share]').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

// Mouse Cursor Trail Effect (optional, can be enabled)
function initCursorTrail() {
    if (window.matchMedia('(pointer: fine)').matches) {
        let trail = [];
        const trailLength = 10;
        
        document.addEventListener('mousemove', (e) => {
            // Only on special elements
            if (e.target.closest('.featured, .spotlight')) {
                const dot = document.createElement('div');
                dot.className = 'cursor-trail';
                dot.style.left = e.clientX + 'px';
                dot.style.top = e.clientY + 'px';
                document.body.appendChild(dot);
                
                trail.push(dot);
                
                if (trail.length > trailLength) {
                    const removed = trail.shift();
                    removed.remove();
                }
                
                setTimeout(() => dot.remove(), 1000);
            }
        });
    }
}

const trailStyle = document.createElement('style');
trailStyle.textContent = `
    .cursor-trail {
        position: fixed;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0, 217, 255, 0.8), transparent);
        pointer-events: none;
        animation: trail-fade 1s ease-out forwards;
        z-index: 9999;
    }
    
    @keyframes trail-fade {
        to {
            opacity: 0;
            transform: scale(0);
        }
    }
`;
document.head.appendChild(trailStyle);

// Performance Monitoring
function monitorPerformance() {
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // Log slow resources for optimization
                if (entry.duration > 1000) {
                    console.warn('Slow resource:', entry.name, entry.duration);
                }
            }
        });
        
        observer.observe({ entryTypes: ['resource', 'navigation'] });
    }
}

// Initialize all enhancements
function initEnhancements() {
    initScrollReveal();
    initSmoothScroll();
    enhanceClickTracking();
    initParallax();
    initLazyLoading();
    initTypingAnimation();
    initAutoplayVideos();
    enhanceCountdowns();
    initCopyButtons();
    initShareButtons();
    // initCursorTrail(); // Optional, can be uncommented
    
    // Performance monitoring only in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        monitorPerformance();
    }
    
    console.log('✨ Enhanced UI features loaded');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
    initEnhancements();
}

// Export for use in other modules
export {
    initScrollReveal,
    initSmoothScroll,
    enhanceClickTracking,
    initLazyLoading,
    enhanceCountdowns
};
