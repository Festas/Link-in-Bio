// Scheduling & Automation Features
import * as API from './admin_api.js';

export function initScheduling() {
    console.log('Initializing scheduling features...');
    
    // Check for items that need to be published/expired
    checkScheduledItems();
    
    // Check every 5 minutes
    setInterval(checkScheduledItems, 5 * 60 * 1000);
    
    // Add scheduling UI to item edit forms
    enhanceEditFormsWithScheduling();
}

async function checkScheduledItems() {
    try {
        const items = await API.getItems();
        const now = new Date();
        
        let changes = 0;
        
        for (const item of items) {
            // Check if item should be published
            if (item.publish_on && !item.is_active) {
                const publishDate = new Date(item.publish_on);
                if (publishDate <= now) {
                    await API.updateItem(item.id, { is_active: true });
                    changes++;
                    console.log(`Published scheduled item: ${item.title}`);
                }
            }
            
            // Check if item should expire
            if (item.expires_on && item.is_active) {
                const expireDate = new Date(item.expires_on);
                if (expireDate <= now) {
                    await API.updateItem(item.id, { is_active: false });
                    changes++;
                    console.log(`Expired item: ${item.title}`);
                }
            }
        }
        
        if (changes > 0) {
            showSchedulingNotification(`${changes} Item(s) wurden automatisch aktualisiert.`);
            // Reload items list if on items tab
            const event = new CustomEvent('itemsScheduled', { detail: { count: changes } });
            document.dispatchEvent(event);
        }
        
    } catch (error) {
        console.error('Error checking scheduled items:', error);
    }
}

function enhanceEditFormsWithScheduling() {
    // Add scheduling presets
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('schedule-preset')) {
            const preset = e.target.dataset.preset;
            const container = e.target.closest('.edit-container');
            if (!container) return;
            
            const publishInput = container.querySelector('.edit-publish-on');
            const expiresInput = container.querySelector('.edit-expires-on');
            
            const now = new Date();
            
            switch (preset) {
                case '1hour':
                    publishInput.value = formatDateTime(new Date(now.getTime() + 60 * 60 * 1000));
                    break;
                case '1day':
                    publishInput.value = formatDateTime(new Date(now.getTime() + 24 * 60 * 60 * 1000));
                    break;
                case '1week':
                    publishInput.value = formatDateTime(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
                    break;
                case 'expire-1day':
                    expiresInput.value = formatDateTime(new Date(now.getTime() + 24 * 60 * 60 * 1000));
                    break;
                case 'expire-1week':
                    expiresInput.value = formatDateTime(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
                    break;
                case 'expire-1month':
                    expiresInput.value = formatDateTime(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
                    break;
            }
        }
    });
}

function formatDateTime(date) {
    // Format for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function showSchedulingNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in';
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i data-lucide="clock" class="w-5 h-5"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Quick scheduling templates
export function createSchedulingTemplate(type) {
    const now = new Date();
    const templates = {
        'weekend-promo': {
            name: 'Weekend Promotion',
            publish: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()), 0, 0), // Next Saturday
            expire: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()) + 1, 23, 59) // Sunday end
        },
        'limited-time': {
            name: '24h Flash Deal',
            publish: now,
            expire: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        },
        'weekly-update': {
            name: 'Weekly Update',
            publish: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (1 - now.getDay() + 7) % 7, 9, 0), // Next Monday 9am
            expire: new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay() + 7) % 7, 23, 59) // Next Sunday
        },
        'monthly-feature': {
            name: 'Monthly Feature',
            publish: new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0), // First of next month
            expire: new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59) // Last day of next month
        }
    };
    
    return templates[type] || null;
}

// Bulk scheduling
export async function bulkSchedule(itemIds, publishDate, expireDate) {
    try {
        const updates = [];
        
        for (const id of itemIds) {
            const payload = {};
            if (publishDate) payload.publish_on = publishDate.toISOString();
            if (expireDate) payload.expires_on = expireDate.toISOString();
            
            updates.push(API.updateItem(id, payload));
        }
        
        await Promise.all(updates);
        
        showSchedulingNotification(`${itemIds.length} Item(s) geplant!`);
        return true;
    } catch (error) {
        console.error('Bulk scheduling error:', error);
        return false;
    }
}

// Schedule calendar view
export function showScheduleCalendar() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-6 border-b border-gray-700 flex items-center justify-between">
                <h2 class="text-2xl font-bold text-white flex items-center">
                    <i data-lucide="calendar" class="w-6 h-6 mr-3 text-blue-400"></i>
                    Geplante Items
                </h2>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1">
                <div id="schedule-calendar-content">
                    <p class="text-gray-400 text-center py-8">Lade Kalender...</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load scheduled items
    loadScheduleCalendarContent();
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function loadScheduleCalendarContent() {
    try {
        const items = await API.getItems();
        const scheduled = items.filter(i => i.publish_on || i.expires_on);
        
        if (scheduled.length === 0) {
            document.getElementById('schedule-calendar-content').innerHTML = `
                <div class="text-center py-12">
                    <i data-lucide="calendar-x" class="w-16 h-16 text-gray-600 mx-auto mb-4"></i>
                    <p class="text-gray-400">Keine geplanten Items</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        // Group by date
        const byDate = {};
        const now = new Date();
        
        for (const item of scheduled) {
            if (item.publish_on) {
                const date = new Date(item.publish_on).toISOString().split('T')[0];
                if (!byDate[date]) byDate[date] = { publish: [], expire: [] };
                byDate[date].publish.push(item);
            }
            if (item.expires_on) {
                const date = new Date(item.expires_on).toISOString().split('T')[0];
                if (!byDate[date]) byDate[date] = { publish: [], expire: [] };
                byDate[date].expire.push(item);
            }
        }
        
        // Sort dates
        const sortedDates = Object.keys(byDate).sort();
        
        let html = '<div class="space-y-4">';
        
        for (const date of sortedDates) {
            const dateObj = new Date(date);
            const isPast = dateObj < now;
            const isToday = date === now.toISOString().split('T')[0];
            
            let dateLabel = isToday ? 'Heute' : dateObj.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            html += `
                <div class="bg-gray-700 rounded-lg p-4 ${isPast ? 'opacity-60' : ''}">
                    <h3 class="font-semibold text-white mb-3 flex items-center">
                        ${isPast ? '<i data-lucide="check-circle" class="w-4 h-4 mr-2 text-green-400"></i>' : ''}
                        ${isToday ? '<i data-lucide="calendar-check" class="w-4 h-4 mr-2 text-blue-400"></i>' : ''}
                        ${dateLabel}
                    </h3>
            `;
            
            if (byDate[date].publish.length > 0) {
                html += '<div class="mb-3"><p class="text-xs text-green-400 font-semibold uppercase mb-2">Veröffentlichen</p>';
                html += byDate[date].publish.map(item => `
                    <div class="text-sm text-gray-300 pl-4 py-1 border-l-2 border-green-400">
                        ${escapeHTML(item.title)} 
                        <span class="text-gray-500">um ${new Date(item.publish_on).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                `).join('');
                html += '</div>';
            }
            
            if (byDate[date].expire.length > 0) {
                html += '<div><p class="text-xs text-red-400 font-semibold uppercase mb-2">Ablaufen</p>';
                html += byDate[date].expire.map(item => `
                    <div class="text-sm text-gray-300 pl-4 py-1 border-l-2 border-red-400">
                        ${escapeHTML(item.title)}
                        <span class="text-gray-500">um ${new Date(item.expires_on).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                `).join('');
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        
        document.getElementById('schedule-calendar-content').innerHTML = html;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error('Error loading schedule calendar:', error);
        document.getElementById('schedule-calendar-content').innerHTML = `
            <p class="text-red-400 text-center py-8">Fehler beim Laden des Kalenders</p>
        `;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Export schedule calendar function
window.showScheduleCalendar = showScheduleCalendar;

// Add CSS for slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    .animate-slide-in {
        animation: slide-in 0.3s ease;
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);
