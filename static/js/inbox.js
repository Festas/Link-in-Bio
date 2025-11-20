import { apiFetch, escapeHTML } from './utils.js';

export function initializeInbox() {
    const container = document.getElementById('inbox-container');
    const refreshButton = document.getElementById('refresh-inbox-button');

    if (!container) return;

    if (refreshButton) {
        const newBtn = refreshButton.cloneNode(true);
        refreshButton.parentNode.replaceChild(newBtn, refreshButton);
        newBtn.addEventListener('click', loadMessages);
    }

    loadMessages();

    async function loadMessages() {
        container.innerHTML = '<div class="text-center py-8 text-gray-400">Lade Nachrichten...</div>';
        try {
            const response = await apiFetch('/api/messages');
            if (!response.ok) throw new Error('Nachrichten konnten nicht geladen werden.');
            
            const messages = await response.json();
            renderMessages(messages);
        } catch (error) {
            container.innerHTML = `<div class="text-center py-8 text-red-400">Fehler: ${error.message}</div>`;
        }
    }

    function renderMessages(messages) {
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">Keine Nachrichten vorhanden.</div>';
            return;
        }

        messages.forEach(msg => {
            const card = document.createElement('div');
            card.className = 'bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 mb-4';
            
            const date = new Date(msg.sent_at).toLocaleString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-white">${escapeHTML(msg.name)}</h3>
                        <a href="mailto:${escapeHTML(msg.email)}" class="text-xs text-blue-400 hover:underline">${escapeHTML(msg.email)}</a>
                    </div>
                    <div class="text-right flex flex-col items-end">
                        <span class="text-xs text-gray-500 block mb-1">${date}</span>
                        <button class="delete-btn text-red-400 hover:text-red-300 p-1 transition-colors" title="Löschen">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-300 bg-gray-900 p-3 rounded whitespace-pre-wrap mt-2 border border-gray-700">${escapeHTML(msg.message)}</div>
            `;
            
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteMessage(msg.id));
            
            container.appendChild(card);
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async function deleteMessage(id) {
        if (!confirm('Möchtest du diese Nachricht wirklich unwiderruflich löschen?')) return;
        
        try {
            const response = await apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Löschen fehlgeschlagen');
            loadMessages();
        } catch (error) {
            alert(`Fehler: ${error.message}`);
        }
    }
}