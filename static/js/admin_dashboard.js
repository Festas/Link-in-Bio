// Admin Dashboard - Overview & Quick Stats
import * as API from './admin_api.js';

let dashboardChart = null;

export async function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Load dashboard data
    await Promise.all([
        loadQuickStats(),
        loadRecentActivity(),
        loadTopPerformers()
    ]);
    
    // Refresh every 30 seconds
    setInterval(loadQuickStats, 30000);
}

async function loadQuickStats() {
    try {
        const stats = await API.getAnalytics();
        
        // Calculate trends from clicks by day
        const clicksByDay = stats.clicks_by_day || [];
        const todayIndex = clicksByDay.findIndex(d => d.date === new Date().toISOString().split('T')[0]);
        
        // Get yesterday and today for comparison
        const todayClicks = todayIndex >= 0 ? clicksByDay[todayIndex]?.clicks || 0 : 0;
        const yesterdayClicks = todayIndex > 0 ? clicksByDay[todayIndex - 1]?.clicks || 0 : 0;
        const clicksTrend = calculateTrend(todayClicks, yesterdayClicks);
        
        // Calculate 7-day average
        const last7Days = clicksByDay.slice(-7);
        const avgLast7Days = last7Days.length > 0 
            ? last7Days.reduce((sum, d) => sum + d.clicks, 0) / last7Days.length 
            : 0;
        
        // Update stat cards with trends
        updateStatCard('total-clicks', stats.total_clicks || 0, 'Klicks gesamt');
        updateStatCard('total-items', stats.total_items || 0, 'Aktive Items');
        updateStatCard('total-subscribers', stats.total_subscribers || 0, 'Abonnenten');
        updateStatCard('total-messages', stats.total_messages || 0, 'Nachrichten');
        updateStatCardWithTrend('today-clicks', todayClicks, 'Heute', clicksTrend);
        
        // Calculate conversion rate (example: newsletter signups per click)
        const conversionRate = stats.total_clicks > 0 
            ? ((stats.total_subscribers / stats.total_clicks) * 100).toFixed(2) 
            : 0;
        updateStatCard('conversion-rate', `${conversionRate}%`, 'Conversion');
        
        // Update chart
        updateClicksChart(clicksByDay);
        
        // Show performance insights
        showPerformanceInsights(stats, todayClicks, avgLast7Days);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatCard(id, value, label) {
    const card = document.getElementById(id);
    if (card) {
        const valueEl = card.querySelector('.stat-value');
        const labelEl = card.querySelector('.stat-label');
        if (valueEl) valueEl.textContent = value;
        if (labelEl) labelEl.textContent = label;
        
        // Remove any existing trend indicator
        const existingTrend = card.querySelector('.trend-indicator');
        if (existingTrend) existingTrend.remove();
    }
}

function updateStatCardWithTrend(id, value, label, trend) {
    const card = document.getElementById(id);
    if (card) {
        const valueEl = card.querySelector('.stat-value');
        const labelEl = card.querySelector('.stat-label');
        if (valueEl) valueEl.textContent = value;
        if (labelEl) labelEl.textContent = label;
        
        // Remove existing trend indicator
        const existingTrend = card.querySelector('.trend-indicator');
        if (existingTrend) existingTrend.remove();
        
        // Add trend indicator
        if (trend.icon) {
            const trendEl = document.createElement('span');
            trendEl.className = `trend-indicator text-xs ml-2 ${trend.color}`;
            trendEl.textContent = trend.icon;
            valueEl.appendChild(trendEl);
        }
    }
}

function calculateTrend(current, previous) {
    if (!previous || previous === 0) {
        return current > 0 
            ? { icon: '📈', direction: 'up', color: 'text-green-400' }
            : { icon: '', direction: 'stable', color: 'text-gray-400' };
    }
    
    const change = ((current - previous) / previous) * 100;
    
    if (change > 10) {
        return { icon: '📈', direction: 'up', color: 'text-green-400', change: `+${change.toFixed(0)}%` };
    } else if (change < -10) {
        return { icon: '📉', direction: 'down', color: 'text-red-400', change: `${change.toFixed(0)}%` };
    } else {
        return { icon: '➡️', direction: 'stable', color: 'text-gray-400', change: `${change > 0 ? '+' : ''}${change.toFixed(0)}%` };
    }
}

function showPerformanceInsights(stats, todayClicks, avgLast7Days) {
    const container = document.getElementById('performance-insights');
    if (!container) {
        // Create container if it doesn't exist
        const dashboardContent = document.getElementById('tab-content-dashboard');
        if (!dashboardContent) return;
        
        const insightsDiv = document.createElement('div');
        insightsDiv.id = 'performance-insights';
        insightsDiv.className = 'bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6 mb-6';
        
        // Insert after quick stats
        const quickStats = dashboardContent.querySelector('.grid');
        if (quickStats && quickStats.nextSibling) {
            quickStats.parentNode.insertBefore(insightsDiv, quickStats.nextSibling);
        }
    }
    
    const insights = [];
    
    // Check if top link is performing well
    if (stats.top_links && stats.top_links.length > 0) {
        const topLink = stats.top_links[0];
        const avgClicks = stats.total_clicks / (stats.total_items || 1);
        
        if (topLink.clicks > avgClicks * 1.5) {
            const improvement = ((topLink.clicks / avgClicks - 1) * 100).toFixed(0);
            insights.push({
                icon: '🚀',
                title: 'Top Performer!',
                message: `Dein Link "${topLink.title}" hat ${improvement}% mehr Klicks als der Durchschnitt!`,
                type: 'success'
            });
        }
    }
    
    // Check today's performance
    if (todayClicks > avgLast7Days * 1.2) {
        insights.push({
            icon: '⭐',
            title: 'Starker Tag!',
            message: `Heute läuft es super! Du hast ${Math.round((todayClicks / avgLast7Days - 1) * 100)}% mehr Klicks als üblich.`,
            type: 'success'
        });
    } else if (todayClicks < avgLast7Days * 0.5 && avgLast7Days > 0) {
        insights.push({
            icon: '💡',
            title: 'Tipp',
            message: `Heute sind die Klicks niedriger. Vielleicht ist es Zeit für einen neuen Post?`,
            type: 'info'
        });
    }
    
    // Check subscriber conversion
    const conversionRate = stats.total_clicks > 0 
        ? (stats.total_subscribers / stats.total_clicks) * 100 
        : 0;
    
    if (conversionRate > 5) {
        insights.push({
            icon: '🎯',
            title: 'Großartige Conversion!',
            message: `${conversionRate.toFixed(1)}% deiner Besucher abonnieren deinen Newsletter!`,
            type: 'success'
        });
    }
    
    // Render insights
    const insightsContainer = document.getElementById('performance-insights');
    if (insightsContainer && insights.length > 0) {
        insightsContainer.innerHTML = `
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
                <span class="mr-2">📊</span> Performance Insights
            </h3>
            <div class="space-y-3">
                ${insights.map(insight => `
                    <div class="bg-black bg-opacity-30 rounded-lg p-4 flex items-start space-x-3">
                        <span class="text-2xl">${insight.icon}</span>
                        <div class="flex-1">
                            <div class="font-semibold text-white mb-1">${insight.title}</div>
                            <div class="text-sm text-gray-200">${insight.message}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (insightsContainer) {
        insightsContainer.style.display = 'none';
    }
}

async function loadRecentActivity() {
    try {
        const activity = await API.getRecentActivity();
        const container = document.getElementById('recent-activity-list');
        if (!container) return;
        
        if (!activity || activity.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Keine Aktivität</p>';
            return;
        }
        
        container.innerHTML = activity.slice(0, 5).map(item => `
            <div class="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div class="flex items-center space-x-3">
                    <i data-lucide="${getActivityIcon(item.type)}" class="w-4 h-4 text-gray-400"></i>
                    <span class="text-sm text-gray-300">${item.description}</span>
                </div>
                <span class="text-xs text-gray-500">${formatTimeAgo(item.timestamp)}</span>
            </div>
        `).join('');
        
        // Re-render lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function loadTopPerformers() {
    try {
        const stats = await API.getAnalytics();
        const container = document.getElementById('top-performers-list');
        if (!container) return;
        
        const topLinks = (stats.top_links || []).slice(0, 5);
        
        if (topLinks.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Keine Daten</p>';
            return;
        }
        
        const maxClicks = Math.max(...topLinks.map(l => l.clicks), 1);
        
        container.innerHTML = topLinks.map(link => {
            const percentage = (link.clicks / maxClicks) * 100;
            return `
                <div class="py-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm text-gray-300 truncate flex-1">${escapeHTML(link.title)}</span>
                        <span class="text-sm font-medium text-blue-400 ml-2">${link.clicks}</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-1.5">
                        <div class="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-300" 
                             style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading top performers:', error);
    }
}

function updateClicksChart(clicksByDay) {
    const canvas = document.getElementById('clicks-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data - last 7 days
    const last7Days = clicksByDay.slice(-7);
    const labels = last7Days.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    });
    const data = last7Days.map(d => d.clicks);
    
    // Destroy existing chart
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    
    // Create new chart
    if (typeof Chart !== 'undefined') {
        dashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Klicks',
                    data: data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgb(156, 163, 175)'
                        },
                        grid: {
                            color: 'rgba(75, 85, 99, 0.2)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgb(156, 163, 175)'
                        },
                        grid: {
                            color: 'rgba(75, 85, 99, 0.2)'
                        }
                    }
                }
            }
        });
    }
}

function getActivityIcon(type) {
    const icons = {
        'link_added': 'plus-circle',
        'link_clicked': 'mouse-pointer-click',
        'subscriber_added': 'user-plus',
        'message_received': 'mail',
        'settings_changed': 'settings'
    };
    return icons[type] || 'activity';
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays}d`;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
