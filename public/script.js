const API_URL = '/api';

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
    // Update price in instructions
    document.querySelectorAll('.summary-price').forEach(el => el.textContent = price);

    paymentStatus.classList.add('hidden');
    modal.classList.remove('hidden');

    // Handle Confirm & Pay Button
    const confirmBtn = document.getElementById('confirm-pay-btn');
    confirmBtn.onclick = async () => {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const transactionId = document.getElementById('transaction-id').value;

        if (!name || !email || !phone || !transactionId) {
            alert("Please fill in all fields and provide your M-Pesa transaction code.");
            return;
        }

        // Show loading status
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Submitting...';
        paymentStatus.classList.remove('hidden');

        try {
            // Call Manual Verification API
            const response = await fetch(`${API_URL}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: phone,
                    transactionId: transactionId,
                    amount: price,
                    eventId: id,
                    eventName: eventName,
                    name: name,
                    email: email
                })
            });

            const result = await response.json();

            if (response.ok) {
                confirmBtn.textContent = 'Submitted!';
                document.querySelector('#payment-status p').innerText = "✅ Submitted! We will verify your payment and send the ticket to your email shortly.";
                console.log("Verification submitted:", result);
            } else {
                throw new Error(result.error || "Failed to submit verification");
            }
        } catch (error) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✅ Submit for Verification';
            paymentStatus.classList.add('hidden');
            alert("Error: " + error.message);
            console.error("Verification error:", error);
        }
    };
};

// Close Modal
closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
}
