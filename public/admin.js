document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    fetchStats();
});

async function fetchStats() {
    try {
        const response = await fetch('/api/admin/analytics');
        const data = await response.json();
        if (data.success) {
            document.getElementById('stat-total').innerText = data.stats.totalTickets;
            document.getElementById('stat-revenue').innerText = `KES ${data.stats.totalRevenue.toLocaleString()}`;
            document.getElementById('stat-verified').innerText = data.stats.byStatus['CONFIRMED'] || 0;
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function fetchBookings() {
    const tableBody = document.getElementById('bookings-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading bookings...</td></tr>';

    try {
        const response = await fetch('/api/admin/bookings');
        const data = await response.json();

        if (data.success) {
            if (data.bookings.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No bookings found.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            data.bookings.forEach(booking => {
                const tr = document.createElement('tr');
                const date = new Date(booking.timestamp).toLocaleDateString();

                tr.innerHTML = `
                    <td>${date}</td>
                    <td><strong>${booking.name || 'N/A'}</strong></td>
                    <td>
                        <div style="font-size: 0.85rem; color: #64748b;">${booking.phoneNumber || ''}</div>
                        <div style="font-size: 0.85rem; color: #64748b;">${booking.email || ''}</div>
                    </td>
                    <td><span class="price-badge">${booking.tierName || 'Normal'}</span></td>
                    <td><code style="background:#f1f5f9; padding:2px 5px; border-radius:4px;">${booking.ticketId || 'Pending'}</code></td>
                    <td>
                        <span class="status-pill status-${(booking.status || 'PENDING').toLowerCase()}">
                            ${booking.status || 'PENDING'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-resend" onclick="resendTicket('${booking.id}', this)">
                            Resend Ticket
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Failed to load bookings.</td></tr>';
    }
}

async function resendTicket(bookingId, btn) {
    if (!confirm('Resend ticket SMS and Email to this user?')) return;

    const originalText = btn.innerText;
    btn.innerText = 'Sending...';
    btn.disabled = true;

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
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
