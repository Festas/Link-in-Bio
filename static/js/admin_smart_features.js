// Smart Features - AI-powered suggestions and optimizations
import * as API from './admin_api.js';

export async function initSmartFeatures() {
    console.log('Initializing smart features...');
    
    // Show smart suggestions in dashboard
    await loadSmartSuggestions();
    
    // Auto-refresh suggestions every 5 minutes
    setInterval(loadSmartSuggestions, 5 * 60 * 1000);
}

async function loadSmartSuggestions() {
    try {
        const analytics = await API.getAnalytics();
        const items = await API.getItems();
        
        const suggestions = generateSuggestions(analytics, items);
        displaySuggestions(suggestions);
        
    } catch (error) {
        console.error('Error loading smart suggestions:', error);
    }
}

function generateSuggestions(analytics, items) {
    const suggestions = [];
    
    // Analyze click patterns
    if (analytics.top_links && analytics.top_links.length > 0) {
        const topLink = analytics.top_links[0];
        const topLinkItem = items.find(i => i.title === topLink.title);
        
        if (topLinkItem && topLinkItem.display_order > 3) {
            suggestions.push({
                type: 'optimization',
                priority: 'high',
                icon: 'trending-up',
                title: 'Beliebten Link nach oben verschieben',
                description: `"${topLink.title}" hat ${topLink.clicks} Klicks, steht aber weit unten. Verschiebe es nach oben für bessere Sichtbarkeit.`,
                action: () => moveItemToTop(topLinkItem.id)
            });
        }
    }
    
    // Check for inactive featured items
    const inactiveFeatured = items.filter(i => i.is_featured && !i.is_active);
    if (inactiveFeatured.length > 0) {
        suggestions.push({
            type: 'warning',
            priority: 'medium',
            icon: 'alert-triangle',
            title: 'Inaktive Spotlight-Items',
            description: `${inactiveFeatured.length} Spotlight-Item(s) sind deaktiviert. Möchtest du sie aktivieren oder das Spotlight entfernen?`,
            action: () => showInactiveFeaturedItems(inactiveFeatured)
        });
    }
    
    // Check for items without images
    const itemsWithoutImages = items.filter(i => 
        ['link', 'product'].includes(i.item_type) && !i.image_url
    );
    if (itemsWithoutImages.length > 3) {
        suggestions.push({
            type: 'improvement',
            priority: 'low',
            icon: 'image',
            title: 'Bilder hinzufügen',
            description: `${itemsWithoutImages.length} Links haben kein Bild. Links mit Bildern bekommen durchschnittlich 40% mehr Klicks.`,
            action: () => highlightItemsWithoutImages(itemsWithoutImages)
        });
    }
    
    // Check for expired items
    const now = new Date();
    const expiredItems = items.filter(i => 
        i.expires_on && new Date(i.expires_on) < now && i.is_active
    );
    if (expiredItems.length > 0) {
        suggestions.push({
            type: 'action',
            priority: 'high',
            icon: 'clock',
            title: 'Abgelaufene Items',
            description: `${expiredItems.length} Item(s) sind abgelaufen und sollten deaktiviert werden.`,
            action: () => deactivateExpiredItems(expiredItems)
        });
    }
    
    // Check for low-performing links
    if (analytics.top_links && analytics.total_clicks > 100) {
        const avgClicks = analytics.total_clicks / items.length;
        const lowPerformers = items.filter(i => 
            ['link', 'video', 'product'].includes(i.item_type) &&
            i.is_active &&
            i.click_count < avgClicks * 0.2
        );
        
        if (lowPerformers.length > 2) {
            suggestions.push({
                type: 'insight',
                priority: 'medium',
                icon: 'bar-chart-2',
                title: 'Wenig genutzte Links',
                description: `${lowPerformers.length} Links performen schlecht. Erwäge sie zu entfernen oder neu zu positionieren.`,
                action: () => showLowPerformers(lowPerformers)
            });
        }
    }
    
    // Check for missing affiliate markers
    const potentialAffiliateLinks = items.filter(i => 
        i.url && (
            i.url.includes('amazon.') ||
            i.url.includes('amzn.') ||
            i.url.includes('affiliate') ||
            i.url.includes('ref=') ||
            i.url.includes('?tag=')
        ) && !i.is_affiliate
    );
    
    if (potentialAffiliateLinks.length > 0) {
        suggestions.push({
            type: 'compliance',
            priority: 'high',
            icon: 'shield-alert',
            title: 'Affiliate-Links markieren',
            description: `${potentialAffiliateLinks.length} Link(s) scheinen Affiliate-Links zu sein. Markiere sie für Transparenz.`,
            action: () => markAsAffiliate(potentialAffiliateLinks)
        });
    }
    
    // Seasonal suggestions
    const season = getCurrentSeason();
    if (season) {
        suggestions.push({
            type: 'idea',
            priority: 'low',
            icon: 'lightbulb',
            title: `${season.name}-Tipp`,
            description: season.suggestion,
            action: null
        });
    }
    
    return suggestions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

function displaySuggestions(suggestions) {
    let container = document.getElementById('smart-suggestions');
    
    if (!container) {
        // Create suggestions widget
        const dashboard = document.getElementById('tab-content-dashboard');
        if (!dashboard) return;
        
        const widget = document.createElement('div');
        widget.className = 'bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6';
        widget.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-white flex items-center">
                    <i data-lucide="sparkles" class="w-5 h-5 mr-2 text-yellow-400"></i>
                    Smart Suggestions
                </h3>
                <button id="refresh-suggestions" class="text-gray-400 hover:text-white transition-colors">
                    <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="smart-suggestions"></div>
        `;
        
        // Insert after welcome card
        const welcomeCard = dashboard.querySelector('.bg-gradient-to-r');
        if (welcomeCard) {
            welcomeCard.after(widget);
        } else {
            dashboard.prepend(widget);
        }
        
        container = document.getElementById('smart-suggestions');
        
        // Add refresh handler
        document.getElementById('refresh-suggestions')?.addEventListener('click', loadSmartSuggestions);
    }
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i data-lucide="check-circle" class="w-12 h-12 text-green-400 mx-auto mb-3"></i>
                <p class="text-gray-400">Alles sieht gut aus! Keine Verbesserungsvorschläge.</p>
            </div>
        `;
    } else {
        container.innerHTML = suggestions.map(s => createSuggestionCard(s)).join('');
    }
    
    // Re-render lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function createSuggestionCard(suggestion) {
    const priorityColors = {
        high: 'border-red-500 bg-red-500/5',
        medium: 'border-yellow-500 bg-yellow-500/5',
        low: 'border-blue-500 bg-blue-500/5'
    };
    
    const iconColors = {
        high: 'text-red-400',
        medium: 'text-yellow-400',
        low: 'text-blue-400'
    };
    
    const actionButton = suggestion.action ? `
        <button onclick="window.smartSuggestionAction_${escapeForId(suggestion.title)}" 
                class="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1">
            <span>Ausführen</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
        </button>
    ` : '';
    
    // Store action in window for onclick
    if (suggestion.action) {
        window[`smartSuggestionAction_${escapeForId(suggestion.title)}`] = suggestion.action;
    }
    
    return `
        <div class="border-l-4 ${priorityColors[suggestion.priority]} p-4 mb-3 rounded-r-lg">
            <div class="flex items-start space-x-3">
                <i data-lucide="${suggestion.icon}" class="w-5 h-5 ${iconColors[suggestion.priority]} flex-shrink-0 mt-0.5"></i>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-white mb-1">${escapeHTML(suggestion.title)}</h4>
                    <p class="text-sm text-gray-400 mb-2">${escapeHTML(suggestion.description)}</p>
                    ${actionButton}
                </div>
            </div>
        </div>
    `;
}

// Action handlers
async function moveItemToTop(itemId) {
    try {
        const items = await API.getItems();
        const itemIndex = items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
        
        // Move to position 0
        items.splice(itemIndex, 1);
        items.unshift(items[itemIndex]);
        
        const ids = items.map(i => i.id);
        await API.reorderItems(ids);
        
        alert('Item wurde nach oben verschoben! Seite wird neu geladen...');
        window.location.reload();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}

function showInactiveFeaturedItems(items) {
    alert(`Inaktive Spotlight-Items:\n\n${items.map(i => '• ' + i.title).join('\n')}\n\nBitte bearbeite diese Items manuell.`);
}

function highlightItemsWithoutImages(items) {
    alert(`Links ohne Bild:\n\n${items.map(i => '• ' + i.title).join('\n')}\n\nTipp: Füge Bilder hinzu für bessere Klickraten!`);
}

async function deactivateExpiredItems(items) {
    if (!confirm(`${items.length} abgelaufene(s) Item(s) deaktivieren?`)) return;
    
    try {
        for (const item of items) {
            await API.updateItem(item.id, { is_active: false });
        }
        alert('Abgelaufene Items wurden deaktiviert!');
        window.location.reload();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}

function showLowPerformers(items) {
    alert(`Wenig genutzte Links:\n\n${items.map(i => `• ${i.title} (${i.click_count} Klicks)`).join('\n')}\n\nÜberlege diese zu optimieren oder zu entfernen.`);
}

async function markAsAffiliate(items) {
    if (!confirm(`${items.length} Link(s) als Affiliate/Werbung markieren?`)) return;
    
    try {
        for (const item of items) {
            await API.updateItem(item.id, { is_affiliate: true });
        }
        alert('Links wurden als Affiliate markiert!');
        window.location.reload();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}

function getCurrentSeason() {
    const month = new Date().getMonth();
    const seasons = {
        winter: {
            name: 'Winter',
            months: [11, 0, 1],
            suggestion: 'Erstelle einen Link zu deiner Gaming-Setup-Wishlist oder Winter-Sale-Deals!'
        },
        spring: {
            name: 'Frühling',
            months: [2, 3, 4],
            suggestion: 'Perfekte Zeit für neue Projekte! Füge Links zu deinen neuesten Streams oder Videos hinzu.'
        },
        summer: {
            name: 'Sommer',
            months: [5, 6, 7],
            suggestion: 'Sommer-Events incoming! Promote deine Gaming-Turniere oder Live-Events.'
        },
        autumn: {
            name: 'Herbst',
            months: [8, 9, 10],
            suggestion: 'Black Friday kommt! Bereite Affiliate-Links für die Shopping-Season vor.'
        }
    };
    
    for (const [key, season] of Object.entries(seasons)) {
        if (season.months.includes(month)) {
            return season;
        }
    }
    return null;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeForId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '_');
}

// Performance analysis
export async function analyzePerformance() {
    const analytics = await API.getAnalytics();
    const items = await API.getItems();
    
    return {
        totalClicks: analytics.total_clicks || 0,
        avgClicksPerItem: items.length > 0 ? (analytics.total_clicks || 0) / items.length : 0,
        clickThroughRate: calculateCTR(analytics),
        topPerformer: analytics.top_links?.[0],
        underperformers: findUnderperformers(items, analytics),
        trends: analyzeTrends(analytics.clicks_by_day || [])
    };
}

function calculateCTR(analytics) {
    // Simplified CTR calculation
    // In a real scenario, you'd track page views vs clicks
    return analytics.total_clicks > 0 ? 
        ((analytics.total_clicks / (analytics.total_clicks + 1000)) * 100).toFixed(2) : 
        0;
}

function findUnderperformers(items, analytics) {
    if (!items.length) return [];
    
    const avgClicks = (analytics.total_clicks || 0) / items.length;
    return items.filter(i => 
        ['link', 'video', 'product'].includes(i.item_type) &&
        i.click_count < avgClicks * 0.5
    );
}

function analyzeTrends(clicksByDay) {
    if (clicksByDay.length < 2) return 'insufficient_data';
    
    const recent = clicksByDay.slice(-7);
    const older = clicksByDay.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.clicks, 0) / recent.length;
    const olderAvg = older.length > 0 ? 
        older.reduce((sum, d) => sum + d.clicks, 0) / older.length : 
        recentAvg;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'growing';
    if (change < -10) return 'declining';
    return 'stable';
}
