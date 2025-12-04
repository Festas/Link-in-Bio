/**
 * Reactions Module
 * Handles link reactions for social engagement on the public page.
 */

// Reaction emoji mapping
const REACTION_EMOJIS = {
    like: '👍',
    love: '❤️',
    fire: '🔥',
    laugh: '😂',
    wow: '😮',
    sad: '😢'
};

// Cache for reaction stats
let reactionStatsCache = {};

/**
 * Initialize reactions for all items on the page.
 */
export async function initReactions() {
    // Load initial reaction stats
    await loadAllReactionStats();
    
    // Add reaction buttons to items
    addReactionButtonsToItems();
}

/**
 * Load all reaction stats from the API.
 */
async function loadAllReactionStats() {
    try {
        const response = await fetch('/api/reactions/stats/all');
        if (response.ok) {
            reactionStatsCache = await response.json();
        } else {
            console.warn('Failed to load reaction stats:', response.status);
        }
    } catch (error) {
        console.error('Error loading reaction stats:', error);
        // Continue without stats - reactions will still work, just without initial counts
    }
}

/**
 * Add reaction buttons to all items on the page.
 */
function addReactionButtonsToItems() {
    const items = document.querySelectorAll('[data-item-id]');
    
    items.forEach(item => {
        const itemId = item.getAttribute('data-item-id');
        if (itemId && !item.querySelector('.reactions-container')) {
            const reactionsContainer = createReactionsContainer(itemId);
            item.appendChild(reactionsContainer);
        }
    });
}

/**
 * Create a reactions container for an item.
 */
function createReactionsContainer(itemId) {
    const container = document.createElement('div');
    container.className = 'reactions-container mt-2 flex items-center gap-1 flex-wrap';
    
    // Add reaction buttons
    Object.entries(REACTION_EMOJIS).forEach(([type, emoji]) => {
        const button = document.createElement('button');
        button.className = 'reaction-btn px-2 py-1 rounded-full text-sm transition-all duration-200 hover:scale-110';
        button.setAttribute('data-reaction-type', type);
        button.setAttribute('data-item-id', itemId);
        
        const count = reactionStatsCache[itemId]?.[type] || 0;
        button.innerHTML = `<span class="reaction-emoji">${emoji}</span><span class="reaction-count ml-1 text-xs">${count > 0 ? count : ''}</span>`;
        
        button.addEventListener('click', (e) => handleReactionClick(e, itemId, type));
        
        container.appendChild(button);
    });
    
    return container;
}

/**
 * Handle reaction button click.
 */
async function handleReactionClick(event, itemId, reactionType) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    
    try {
        const response = await fetch(`/api/reactions/${itemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reaction_type: reactionType })
        });
        
        if (response.ok) {
            const data = await response.json();
            updateReactionUI(itemId, data);
        } else if (response.status === 429) {
            showToast('Bitte warte einen Moment...', 'warning');
        } else {
            // Handle other HTTP errors
            console.error('Failed to add reaction:', response.status);
            showToast('Reaktion konnte nicht gespeichert werden.', 'error');
        }
    } catch (error) {
        console.error('Error adding reaction:', error);
        showToast('Netzwerkfehler. Bitte versuche es erneut.', 'error');
    }
}

/**
 * Update the reaction UI after a reaction is added/removed.
 */
function updateReactionUI(itemId, data) {
    const container = document.querySelector(`[data-item-id="${itemId}"] .reactions-container`);
    if (!container) return;
    
    // Update all reaction buttons
    Object.entries(REACTION_EMOJIS).forEach(([type, emoji]) => {
        const button = container.querySelector(`[data-reaction-type="${type}"]`);
        if (button) {
            const count = data.reactions[type] || 0;
            const isUserReaction = data.user_reaction === type;
            
            // Update count
            const countSpan = button.querySelector('.reaction-count');
            countSpan.textContent = count > 0 ? count : '';
            
            // Update styling for user's reaction
            if (isUserReaction) {
                button.classList.add('active', 'bg-white/20', 'scale-110');
            } else {
                button.classList.remove('active', 'bg-white/20', 'scale-110');
            }
        }
    });
    
    // Update cache
    reactionStatsCache[itemId] = data.reactions;
}

/**
 * Show a toast notification.
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColors = {
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        success: 'bg-green-500'
    };
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white ${bgColors[type] || bgColors.info}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * Get reaction stats for a specific item.
 */
export async function getItemReactions(itemId) {
    try {
        const response = await fetch(`/api/reactions/${itemId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting reactions:', error);
    }
    return null;
}

// Add CSS for reactions
const style = document.createElement('style');
style.textContent = `
    .reactions-container {
        opacity: 0.7;
        transition: opacity 0.3s ease;
    }
    
    .reactions-container:hover {
        opacity: 1;
    }
    
    .reaction-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        cursor: pointer;
        user-select: none;
    }
    
    .reaction-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
    }
    
    .reaction-btn.active {
        background: rgba(255, 255, 255, 0.25);
        border-color: var(--color-accent, #00e5ff);
    }
    
    .reaction-emoji {
        font-size: 1rem;
    }
    
    .reaction-count {
        color: var(--color-text-muted, #a0aec0);
    }
`;
document.head.appendChild(style);
