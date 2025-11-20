import { setAuthToken, getAuthToken } from './utils.js';

if (getAuthToken()) {
    window.location.href = '/admin';
}

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
    
    const token = btoa(`${username}:${password}`);
    
    const originalBtnText = button.textContent;
    button.textContent = 'Prüfe...';
    button.disabled = true;
    errorEl.textContent = '';

    try {
        const response = await fetch('/api/auth/check', {
            headers: {
                'Authorization': `Basic ${token}`
            }
        });

        if (response.ok) {
            setAuthToken(token);
            window.location.href = '/admin';
        } else if (response.status === 429) {
            throw new Error('Zu viele Versuche. Bitte warten.');
        } else {
            throw new Error('Falscher Benutzername oder Passwort.');
        }
    } catch (error) {
        errorEl.textContent = error.message || 'Server nicht erreichbar.';
        button.textContent = originalBtnText;
        button.disabled = false;
        
        localStorage.removeItem('adminAuthToken');
    }
}