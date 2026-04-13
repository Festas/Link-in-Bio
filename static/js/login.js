import { getCsrfToken } from './utils.js';

const LOGIN_ICON_SVG = '<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    // Password visibility toggle
    const pwToggle = document.getElementById('pw-toggle');
    const pwInput = document.getElementById('password');
    const eyeOpen = document.getElementById('eye-open');
    const eyeClosed = document.getElementById('eye-closed');

    if (pwToggle && pwInput) {
        pwToggle.addEventListener('click', () => {
            const isPassword = pwInput.type === 'password';
            pwInput.type = isPassword ? 'text' : 'password';
            eyeOpen.style.display = isPassword ? 'none' : 'block';
            eyeClosed.style.display = isPassword ? 'block' : 'none';
        });
    }

    // Auto-focus the username field
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('remember-me');
    const errorEl = document.getElementById('error-message');
    const button = document.getElementById('login-btn');
    const card = document.getElementById('login-card');
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    const remember_me = rememberMe ? rememberMe.checked : false;
    
    // Show loading state
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Prüfe...';
    errorEl.textContent = '';

    try {
        const headers = { 'Content-Type': 'application/json' };
        const csrfToken = getCsrfToken();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ username, password, remember_me })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // On admin subdomain, go to dashboard; on main domain, go to editor
            const isAdminSubdomain = window.location.hostname.startsWith('admin.');
            window.location.href = isAdminSubdomain ? '/' : '/editor';
        } else if (response.status === 429) {
            throw new Error(data.detail || 'Zu viele Versuche. Bitte warten.');
        } else {
            throw new Error(data.message || 'Falscher Benutzername oder Passwort.');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Server nicht erreichbar.';
        
        // Shake the card on error
        if (card) {
            card.classList.remove('shake');
            void card.offsetWidth; // Force reflow to restart animation
            card.classList.add('shake');
        }
        
        button.disabled = false;
        button.innerHTML = `${LOGIN_ICON_SVG} Anmelden`;
    }
}