import { escapeHTML, requireAuth, apiFetch } from './utils.js';

if (requireAuth()) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAnalytics);
    } else {
        initializeAnalytics();
    }
}

async function initializeAnalytics() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const content = document.getElementById('analytics-content');
    
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#9CA3AF';
        Chart.defaults.borderColor = '#374151';
    }
    
    try {
        const response = await apiFetch('/api/analytics');
        const data = await response.json();
        
        document.getElementById('stat-total-clicks').textContent = data.total_clicks;
        document.getElementById('stat-total-subscribers').textContent = data.total_subscribers;
        
        renderChart(data.clicks_per_day);

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
        
        setupExportButton();

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

function renderChart(clicksDataArray) {
    const ctx = document.getElementById('clicksPerDayChart');
    if (!ctx) return;

    const labels = [...Array(30)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();
    
    const dataPoints = labels.map(label => {
        const dayData = clicksDataArray.find(d => d.day === label);
        return dayData ? dayData.clicks : 0;
    });
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar', 
        data: {
            labels: labels.map(l => new Date(l).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })),
            datasets: [{
                label: 'Klicks',
                data: dataPoints,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 4,
                tension: 0.1
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

function setupExportButton() {
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