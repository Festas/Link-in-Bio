import { apiFetch, escapeHTML } from './utils.js';

export function initializeSubscribers() {
    const tableBody = document.getElementById('subscribers-table-body');
    const searchInput = document.getElementById('search-subscribers');
    
    if (!tableBody) return;
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterSubscribers(term);
        });
    }
    
    loadSubscribers();

    async function loadSubscribers() {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">Lade Abonnenten...</td></tr>';
        
        try {
            const response = await apiFetch('/api/subscribers');
            const subscribers = await response.json();
            
            tableBody.dataset.allData = JSON.stringify(subscribers);
            renderTable(subscribers);
            
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-400">Fehler: ${error.message}</td></tr>`;
        }
    }
    
    function renderTable(data) {
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Keine Abonnenten gefunden.</td></tr>';
            return;
        }
        
        data.forEach(sub => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-700 hover:bg-gray-800';
            
            const date = new Date(sub.subscribed_at).toLocaleDateString('de-DE', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit' 
            });
            
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm">${escapeHTML(sub.email)}</td>
                <td class="py-3 px-4 text-sm text-gray-400">${date}</td>
                <td class="py-3 px-4 text-right">
                    <button class="text-red-400 hover:text-red-300 p-1 delete-btn" title="Löschen">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            
            const deleteBtn = tr.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteSubscriber(sub.id, sub.email));
            
            tableBody.appendChild(tr);
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    function filterSubscribers(term) {
        const allData = JSON.parse(tableBody.dataset.allData || '[]');
        const filtered = allData.filter(sub => sub.email.toLowerCase().includes(term));
        renderTable(filtered);
    }
    
    async function deleteSubscriber(id, email) {
        if (!confirm(`Möchtest du "${email}" wirklich aus der Liste entfernen?`)) return;
        
        try {
            const response = await apiFetch(`/api/subscribers/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Löschen fehlgeschlagen');
            loadSubscribers();
        } catch (error) {
            alert(error.message);
        }
    }
}