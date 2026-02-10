let allBookings = [];
let salesChart = null;
let tierChart = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    fetchBookings();

    // Tab Switching Logic
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Event Listeners for Filters
    document.getElementById('ticket-search').addEventListener('input', renderBookings);
    document.getElementById('filter-status').addEventListener('change', renderBookings);
    document.getElementById('filter-tier').addEventListener('change', renderBookings);
    document.getElementById('export-btn').addEventListener('click', exportToCSV);
});

function switchTab(tabId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        }
    });

    // Update visibility of views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.style.display = 'none';
    });

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) {
        targetView.style.display = 'block';
    }

    // Update Header Title
    const titles = {
        'summary': 'Overview',
        'tickets': 'Ticket Management',
        'customers': 'Customers',
        'settings': 'Settings'
    };
    document.getElementById('current-view-title').innerText = titles[tabId] || 'Dashboard';

    // Refresh stats/bookings when switching to relevant tabs
    if (tabId === 'summary') fetchStats();
    if (tabId === 'tickets') fetchBookings();
}

function exportToCSV() {
    if (allBookings.length === 0) {
        showToast('❌ No data to export', 'error');
        return;
    }

    const headers = ['Date', 'Name', 'Phone', 'Email', 'Tier', 'Ticket ID', 'Status', 'Mpesa Code', 'Amount KES'];
    const escapeCSV = (str) => `"${String(str).replace(/"/g, '""')}"`;

    const rows = allBookings.map(b => [
        escapeCSV(new Date(b.timestamp).toLocaleString()),
        escapeCSV(b.name || ''),
        escapeCSV(b.phoneNumber || ''),
        escapeCSV(b.email || ''),
        escapeCSV(b.tierName || ''),
        escapeCSV(b.ticketId || ''),
        escapeCSV(b.status || ''),
        escapeCSV(b.mpesaCode || ''),
        escapeCSV(b.amount || '')
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.map(escapeCSV).join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `the_grey_pageant_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✅ CSV Exported successfully!', 'success');
}

async function fetchStats() {
    try {
        const response = await fetch('/api/admin/analytics');
        const data = await response.json();
        if (data.success) {
            const stats = data.stats;

            // Basic Stats
            document.getElementById('stat-total').innerText = stats.totalTickets;
            document.getElementById('stat-revenue').innerText = `KES ${stats.totalRevenue.toLocaleString()}`;
            document.getElementById('stat-pending').innerText = stats.pendingCount || 0;

            const capacityPercent = Math.min(100, (stats.totalTickets / 600) * 100).toFixed(1);
            document.getElementById('stat-capacity').innerText = `${capacityPercent}%`;

            // Initialize Charts
            initSalesChart(stats.salesTrend);
            initTierChart(stats.byTier);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function initSalesChart(salesTrend) {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Process trend data (sort by date)
    const sortedDates = Object.keys(salesTrend).sort();
    const values = sortedDates.map(date => salesTrend[date]);

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Tickets Sold',
                data: values,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#ec4899'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function initTierChart(byTier) {
    const ctx = document.getElementById('tierChart').getContext('2d');

    const labels = Object.keys(byTier);
    const values = labels.map(label => byTier[label]);

    if (tierChart) tierChart.destroy();

    tierChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#db2777', '#ec4899', '#f472b6', '#fda4af'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        }
    });
}

async function fetchBookings() {
    const tableBody = document.getElementById('bookings-table-body');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">Loading bookings...</td></tr>';

    try {
        const response = await fetch('/api/admin/bookings');
        const data = await response.json();

        if (data.success) {
            allBookings = data.bookings;
            renderBookings();
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load bookings.</td></tr>';
    }
}

function renderBookings() {
    const tableBody = document.getElementById('bookings-table-body');
    const searchTerm = document.getElementById('ticket-search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value.toLowerCase();
    const tierFilter = document.getElementById('filter-tier').value.toLowerCase();

    const filtered = allBookings.filter(b => {
        const matchesSearch =
            (b.name || '').toLowerCase().includes(searchTerm) ||
            (b.phoneNumber || '').toLowerCase().includes(searchTerm) ||
            (b.email || '').toLowerCase().includes(searchTerm) ||
            (b.mpesaCode || '').toLowerCase().includes(searchTerm) ||
            (b.ticketId || '').toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || (b.status || '').toLowerCase() === statusFilter;
        const matchesTier = tierFilter === 'all' || (b.tierName || '').toLowerCase() === tierFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesTier;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">No bookings found matching criteria.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    filtered.forEach(booking => {
        const tr = document.createElement('tr');
        const date = new Date(booking.timestamp).toLocaleDateString();

        tr.innerHTML = `
            <td style="color: var(--text-muted); font-size: 0.8rem;">${date}</td>
            <td>
                <div style="font-weight: 700;">${booking.name || 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${booking.phoneNumber || ''}</div>
            </td>
            <td><span style="font-weight: 500;">${booking.tierName || 'Normal'}</span></td>
            <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-weight:700; color:var(--primary);">${booking.ticketId || '---'}</code></td>
            <td>
                <span class="status-badge status-${(booking.status || 'PENDING').toLowerCase()}">
                    ${booking.status || 'PENDING'}
                </span>
            </td>
            <td>
                ${(booking.status || 'PENDING').toLowerCase() === 'pending' ? `
                    <button class="action-btn" title="Verify Payment" onclick="verifyPayment('${booking.id}', this)" style="background: #fdf2f8; color: #db2777; border-color: #fbcfe8; margin-right: 8px;">
                        <i data-lucide="check-circle"></i>
                    </button>
                ` : ''}
                <button class="action-btn" title="Resend Ticket" onclick="resendTicket('${booking.id}', this)">
                    <i data-lucide="send"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Refresh icons for new rows
    lucide.createIcons();
}

async function verifyPayment(bookingId, btn) {
    if (!confirm('Are you sure you want to manually verify this payment?')) return;

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '...';

    try {
        const response = await fetch('/api/admin/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        });

        const data = await response.json();
        if (data.success) {
            showToast('✅ Payment verified successfully!', 'success');
            // Refresh data
            fetchStats();
            fetchBookings();
        } else {
            showToast('❌ Failed: ' + data.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
            lucide.createIcons();
        }
    } catch (error) {
        showToast('❌ Server error occurred', 'error');
        btn.disabled = false;
        btn.innerHTML = originalContent;
        lucide.createIcons();
    }
}

async function resendTicket(bookingId, btn) {
    if (!confirm('Resend ticket SMS and Email to this user?')) return;

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '...';

    try {
        const response = await fetch('/api/admin/resend-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        });

        const data = await response.json();
        if (data.success) {
            showToast('✅ Ticket resent successfully!', 'success');
        } else {
            showToast('❌ Failed: ' + data.message, 'error');
        }
    } catch (error) {
        showToast('❌ Server error occurred', 'error');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        lucide.createIcons();
    }
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
