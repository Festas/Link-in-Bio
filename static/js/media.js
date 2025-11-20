import { apiFetch } from './utils.js';

export function initializeMediaManager() {
    const mediaContainer = document.getElementById('media-gallery-grid');
    const refreshButton = document.getElementById('refresh-media-button');

    if (!mediaContainer) return;

    if (refreshButton) {
        const newBtn = refreshButton.cloneNode(true);
        refreshButton.parentNode.replaceChild(newBtn, refreshButton);
        newBtn.addEventListener('click', loadMediaFiles);
    }

    loadMediaFiles();

    async function loadMediaFiles() {
        mediaContainer.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Lade Medien...</div>';
        
        try {
            const response = await apiFetch('/api/media/files');
            if (!response.ok) throw new Error('Konnte Medien nicht laden');
            
            const files = await response.json();
            renderGallery(files);
            
        } catch (error) {
            mediaContainer.innerHTML = `<div class="col-span-full text-center text-red-400 py-8">Fehler: ${error.message}</div>`;
        }
    }

    function renderGallery(files) {
        mediaContainer.innerHTML = '';
        
        if (files.length === 0) {
            mediaContainer.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Keine Bilder gefunden.</div>';
            return;
        }

        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'media-card bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow relative group';
            
            const imgContainer = document.createElement('div');
            imgContainer.className = 'aspect-square w-full overflow-hidden bg-gray-900 relative';
            
            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.name;
            img.className = 'w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity';
            
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700';
            copyBtn.title = 'URL kopieren';
            copyBtn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i>';
            copyBtn.onclick = () => copyToClipboard(file.url);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'p-2 bg-red-600 text-white rounded-full hover:bg-red-700';
            deleteBtn.title = 'Löschen';
            deleteBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
            deleteBtn.onclick = () => deleteFile(file.name);

            overlay.appendChild(copyBtn);
            overlay.appendChild(deleteBtn);
            imgContainer.appendChild(img);
            imgContainer.appendChild(overlay);
            
            const footer = document.createElement('div');
            footer.className = 'p-2 text-xs text-gray-400 truncate border-t border-gray-700';
            footer.textContent = file.name;
            
            card.appendChild(imgContainer);
            card.appendChild(footer);
            mediaContainer.appendChild(card);
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async function deleteFile(filename) {
        if (!confirm(`Möchtest du das Bild "${filename}" wirklich unwiderruflich löschen?`)) return;
        
        try {
            const response = await apiFetch(`/api/media/files/${filename}`, { 
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Löschen fehlgeschlagen');
            
            loadMediaFiles();
            
        } catch (error) {
            alert(`Fehler: ${error.message}`);
        }
    }

    function copyToClipboard(text) {
        const fullUrl = window.location.origin + text;
        if (navigator.clipboard && navigator.clipboard.writeText) {
             navigator.clipboard.writeText(fullUrl).then(() => {
                alert('Bild-URL in die Zwischenablage kopiert!');
            }).catch(err => {
                console.error('Konnte nicht kopieren', err);
                prompt("Kopiere diesen Link:", fullUrl);
            });
        } else {
             prompt("Kopiere diesen Link:", fullUrl);
        }
    }
}