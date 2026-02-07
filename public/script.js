const API_URL = '/api';

// --- CONFIGURATION ---
// Replace this with your actual IntaSend or Pesapal Payment Link
const PAYMENT_LINK = "https://intasend.com/pay/the-grey-pegeant";
// ---------------------

// DOM Elements
const eventsContainer = document.getElementById('events-container');
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const paymentStatus = document.getElementById('payment-status');

// Load Events on Start
document.addEventListener('DOMContentLoaded', loadEvents);

async function loadEvents() {
    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        renderEvents(events);
    } catch (error) {
        eventsContainer.innerHTML = '<p class="error">Failed to load events.</p>';
        console.error(error);
    }
}

function renderEvents(events) {
    eventsContainer.innerHTML = events.map(event => {
        const tierButtons = event.tiers.map(tier =>
            `<button class="btn-book" onclick="openBooking('${event.id}', '${event.name}', ${tier.price}, '${tier.name}')">
                ${tier.name} (KES ${tier.price})
            </button>`
        ).join('');

        return `
        <div class="event-card">
            <div class="event-image" style="background-image: url('${event.image}')">
                <span class="category-badge">Pageant</span>
            </div>
            <div class="event-details">
                <span class="event-meta" style="color: var(--primary); font-weight: 600; font-size: 0.8rem; margin-bottom: 2px;">Featured</span>
                <h2>${event.name}</h2>
                <div class="event-meta">
                    <span>📅 ${event.date} • ⏰ ${event.time}</span>
                </div>
                <div class="event-meta">
                     <span>📍 ${event.venue}</span>
                </div>
                <div class="event-meta" style="margin-top: 15px;">
                    <div style="font-weight: bold; color: var(--text-main); margin-bottom: 8px;">Select Ticket:</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${tierButtons}
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Global scope for onclick
window.openBooking = (id, eventName, price, tierName) => {
    const fullEventName = `${eventName} (${tierName})`;

    document.getElementById('summary-event-name').textContent = fullEventName;
    document.getElementById('summary-event-price').textContent = `KES ${price}`;

    paymentStatus.classList.add('hidden');
    modal.classList.remove('hidden');

    // Handle Confirm & Pay Button
    const confirmBtn = document.getElementById('confirm-pay-btn');
    confirmBtn.onclick = () => {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        if (!name || !email) {
            alert("Please provide your name and email to receive your ticket.");
            return;
        }

        // Show redirecting status
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Redirecting...';
        paymentStatus.classList.remove('hidden');

        // Construct the redirect URL (Add name/email as parameters if supported by the gateway)
        // Most hosted links allow passing details as query params
        const finalLink = `${PAYMENT_LINK}?amount=${price}&email=${encodeURIComponent(email)}&first_name=${encodeURIComponent(name)}`;

        // Wait a small delay for better UX
        setTimeout(() => {
            window.location.href = finalLink;
        }, 1200);
    };
};

// Close Modal
closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
}
