import { escapeHTML, requireAuth, apiFetch } from './utils.js';

if (requireAuth()) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAnalytics);
    } else {
        initializeAnalytics();
    }
}

// State management
const state = {
    filters: {
        start_date: null,
        end_date: null,
        item_id: null,
        country: null,
        referer: null
    },
    charts: {
        clicksPerDay: null,
        clicksPerHour: null,
        clicksPerWeekday: null
    },
    allLinks: [],
    allCountries: [],
    allReferers: []
};

async function initializeAnalytics() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const content = document.getElementById('analytics-content');
    
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#9CA3AF';
        Chart.defaults.borderColor = '#374151';
    }
    
    try {
        // Load initial data and populate filters
        await loadBasicAnalytics();
        await populateFilterOptions();
        await loadAdvancedAnalytics();
        
        setupFilterHandlers();
        setupExportButtons();

        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (content) content.classList.remove('hidden');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        console.error(error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = `<p class="text-red-400 text-center">Fehler beim Laden der Analytics: ${error.message}</p>`;
        }
    }
}

async function loadBasicAnalytics() {
    const response = await apiFetch('/api/analytics');
    const data = await response.json();
    
    document.getElementById('stat-total-subscribers').textContent = data.total_subscribers;
}

async function loadAdvancedAnalytics() {
    // Build query parameters from filters
    const params = new URLSearchParams();
    if (state.filters.start_date) params.append('start_date', state.filters.start_date);
    if (state.filters.end_date) params.append('end_date', state.filters.end_date);
    if (state.filters.item_id) params.append('item_id', state.filters.item_id);
    if (state.filters.country) params.append('country', state.filters.country);
    if (state.filters.referer) params.append('referer', state.filters.referer);
    
    const response = await apiFetch(`/api/analytics/advanced?${params.toString()}`);
    const data = await response.json();
    
    // Update stats
    document.getElementById('stat-total-clicks').textContent = data.total_clicks;
    
    // Render charts
    renderDayChart(data.clicks_per_day);
    renderHourChart(data.clicks_per_hour);
    renderWeekdayChart(data.clicks_per_weekday);
    
    // Render lists
    renderList('top-links-list', data.top_links, (item) => `
        <span class="truncate" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</span>
        <span class="font-bold text-gray-200">${item.clicks} Klicks</span>
    `);
    
    renderList('top-referers-list', data.top_referers, (item) => `
        <span class="truncate" title="${escapeHTML(item.referer_domain)}">${escapeHTML(item.referer_domain)}</span>
        <span class="font-bold text-gray-200">${item.clicks} Klicks</span>
    `);

    renderList('top-countries-list', data.top_countries, (item) => `
        <span class="truncate" title="${escapeHTML(item.country)}">${escapeHTML(item.country)}</span>
        <span class="font-bold text-gray-200">${item.clicks} Klicks</span>
    `);
}

async function populateFilterOptions() {
    // Fetch all items for link filter
    const itemsResponse = await apiFetch('/api/items');
    state.allLinks = await itemsResponse.json();
    
    const linkSelect = document.getElementById('filter-link');
    state.allLinks.forEach(item => {
        if (item.item_type === 'link') {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.title;
            linkSelect.appendChild(option);
        }
    });
    
    // Get initial analytics to populate country and referer filters
    const analyticsResponse = await apiFetch('/api/analytics/advanced');
    const analyticsData = await analyticsResponse.json();
    
    const countrySelect = document.getElementById('filter-country');
    analyticsData.top_countries.forEach(item => {
        const option = document.createElement('option');
        option.value = item.country === 'Unbekannt' ? 'unknown' : item.country;
        option.textContent = item.country;
        countrySelect.appendChild(option);
    });
    
    const refererSelect = document.getElementById('filter-referer');
    analyticsData.top_referers.forEach(item => {
        const option = document.createElement('option');
        option.value = item.referer_domain === '(Direkt)' ? 'direct' : item.referer_domain;
        option.textContent = item.referer_domain;
        refererSelect.appendChild(option);
    });
}

function setupFilterHandlers() {
    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');
    
    applyBtn.addEventListener('click', async () => {
        // Read filter values
        state.filters.start_date = document.getElementById('filter-start-date').value || null;
        state.filters.end_date = document.getElementById('filter-end-date').value || null;
        state.filters.item_id = document.getElementById('filter-link').value || null;
        state.filters.country = document.getElementById('filter-country').value || null;
        state.filters.referer = document.getElementById('filter-referer').value || null;
        
        // Reload analytics with filters
        await loadAdvancedAnalytics();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
    
    resetBtn.addEventListener('click', async () => {
        // Clear all filters
        state.filters = {
            start_date: null,
            end_date: null,
            item_id: null,
            country: null,
            referer: null
        };
        
        document.getElementById('filter-start-date').value = '';
        document.getElementById('filter-end-date').value = '';
        document.getElementById('filter-link').value = '';
        document.getElementById('filter-country').value = '';
        document.getElementById('filter-referer').value = '';
        
        // Reload analytics without filters
        await loadAdvancedAnalytics();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
}

function renderDayChart(clicksDataArray) {
    const ctx = document.getElementById('clicksPerDayChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (state.charts.clicksPerDay) {
        state.charts.clicksPerDay.destroy();
    }

    const labels = clicksDataArray.map(d => {
        const date = new Date(d.day);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    });
    
    const dataPoints = clicksDataArray.map(d => d.clicks);
    
    state.charts.clicksPerDay = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Klicks',
                data: dataPoints,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9CA3AF' }, grid: { color: '#374151' } },
                x: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1F2937', titleColor: '#F9FAFB', bodyColor: '#F9FAFB' }
            }
        }
    });
}

function renderHourChart(clicksDataArray) {
    const ctx = document.getElementById('clicksPerHourChart');
    if (!ctx) return;

    // Destroy existing chart
    if (state.charts.clicksPerHour) {
        state.charts.clicksPerHour.destroy();
    }

    // Create array for all 24 hours
    const hourData = Array(24).fill(0);
    clicksDataArray.forEach(d => {
        hourData[d.hour] = d.clicks;
    });
    
    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    
    state.charts.clicksPerHour = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Klicks',
                data: hourData,
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9CA3AF' }, grid: { color: '#374151' } },
                x: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1F2937', titleColor: '#F9FAFB', bodyColor: '#F9FAFB' }
            }
        }
    });
}

function renderWeekdayChart(clicksDataArray) {
    const ctx = document.getElementById('clicksPerWeekdayChart');
    if (!ctx) return;

    // Destroy existing chart
    if (state.charts.clicksPerWeekday) {
        state.charts.clicksPerWeekday.destroy();
    }

    // Create array for all 7 days (0 = Sunday, 6 = Saturday)
    const weekdayData = Array(7).fill(0);
    clicksDataArray.forEach(d => {
        weekdayData[d.day_of_week] = d.clicks;
    });
    
    const labels = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    
    state.charts.clicksPerWeekday = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Klicks',
                data: weekdayData,
                backgroundColor: 'rgba(245, 158, 11, 0.5)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9CA3AF' }, grid: { color: '#374151' } },
                x: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1F2937', titleColor: '#F9FAFB', bodyColor: '#F9FAFB' }
            }
        }
    });
}

function renderList(elementId, items, templateFn) {
    const list = document.getElementById(elementId);
    if (!list) return;
    
    list.innerHTML = '';
    if (items && items.length > 0) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center text-sm';
            li.innerHTML = templateFn(item);
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<p class="text-sm text-gray-500">Keine Daten verfügbar.</p>';
    }
}

function setupExportButtons() {
    const csvBtn = document.getElementById('export-csv-button');
    const excelBtn = document.getElementById('export-excel-button');
    
    if (csvBtn) {
        csvBtn.addEventListener('click', async () => {
            await downloadExport('/api/subscribers/export', 'csv');
        });
    }
    
    if (excelBtn) {
        excelBtn.addEventListener('click', async () => {
            await downloadExport('/api/subscribers/export/excel', 'xlsx');
        });
    }
}

async function downloadExport(url, type) {
    try {
        const response = await apiFetch(url);
        if (!response.ok) throw new Error('Export fehlgeschlagen.');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        
        let filename = `subscribers_export_${new Date().toISOString().split('T')[0]}.${type}`;
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        
    } catch (error) {
        alert(`Export-Fehler: ${error.message}`);
    }
}
