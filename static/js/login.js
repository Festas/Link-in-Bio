import { getCsrfToken } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('error-message');
    const button = e.target.querySelector('button');
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    const originalBtnText = button.textContent;
    button.textContent = 'Prüfe...';
    button.disabled = true;
    errorEl.textContent = '';

    try {
        const headers = { 'Content-Type': 'application/json' };
        const csrfToken = getCsrfToken();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ username, password, remember_me: true })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.href = '/admin';
        } else if (response.status === 429) {
            throw new Error('Zu viele Versuche. Bitte warten.');
        } else {
            throw new Error(data.message || 'Falscher Benutzername oder Passwort.');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Server nicht erreichbar.';
        button.textContent = originalBtnText;
        button.disabled = false;
    }
}