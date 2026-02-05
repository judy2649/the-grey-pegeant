const API_URL = '/api';

// DOM Elements
const eventsContainer = document.getElementById('events-container');
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const bookingForm = document.getElementById('booking-form');
const paymentStatus = document.getElementById('payment-status');
const payBtn = document.getElementById('pay-btn');

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
        // Generate buttons for each tier
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
                <div class="event-meta">
                     <span>🎟️ ${event.totalTickets} Tickets Available</span>
                </div>
                
                <div class="card-footer" style="flex-direction: column; gap: 10px; align-items: stretch;">
                    <div style="font-weight: bold; color: var(--text-main); margin-bottom: 5px;">Select Ticket:</div>
                    ${tierButtons}
                </div>
            </div>
        </div>
    `}).join('');
}

// Global scope for onclick
window.openBooking = (id, eventName, price, tierName) => {
    document.getElementById('event-id').value = id;
    document.getElementById('amount').value = price;
    // We can append tier name to event name for clarity in modal/sms
    const fullEventName = `${eventName} (${tierName})`;

    document.getElementById('modal-event-name').textContent = fullEventName;
    document.getElementById('modal-event-price').textContent = `KES ${price}`;
    document.getElementById('instruction-amount').textContent = `KES ${price}`;

    // Add hidden input for tier if you want to track it separately, 
    // but for now we'll just use the Price/Amount to differentiate in STK

    bookingForm.classList.remove('hidden');
    paymentStatus.classList.add('hidden');
    payBtn.disabled = false;
    payBtn.textContent = 'Pay with M-Pesa';

    modal.classList.remove('hidden');
};

// Close Modal
closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
}

// Handle Payment Submission
// Stripe Init
const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); // Replace with your Publishable Key
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');

let selectedMethod = 'mpesa';

window.toggleMethod = (method) => {
    selectedMethod = method;
    document.getElementById('method-mpesa').classList.toggle('active', method === 'mpesa');
    document.getElementById('method-card').classList.toggle('active', method === 'card');

    if (method === 'mpesa') {
        document.getElementById('mpesa-fields').classList.remove('hidden');
        document.getElementById('stripe-fields').classList.add('hidden');
        document.getElementById('pay-btn').textContent = 'Pay with M-Pesa';
    } else {
        document.getElementById('mpesa-fields').classList.add('hidden');
        document.getElementById('stripe-fields').classList.remove('hidden');
        document.getElementById('pay-btn').textContent = 'Pay with Card';
    }
};

// Handle Payment Submission
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const eventId = document.getElementById('event-id').value;
    const name = document.getElementById('name').value;
    // Get the full name displayed in modal (includes Tier)
    const nameWithTier = document.getElementById('modal-event-name').textContent;

    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';

    if (selectedMethod === 'mpesa') {
        // --- MANUAL POCHI VERIFICATION FLOW ---
        const phone = document.getElementById('phone').value;
        const transactionId = document.getElementById('transaction-id').value;

        try {
            const res = await fetch(`${API_URL}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: phone,
                    transactionId,
                    amount,
                    eventId,
                    eventName: nameWithTier,
                    name: name
                })
            });

            const data = await res.json();
            if (data.status === 'pending') {
                bookingForm.classList.add('hidden');
                paymentStatus.classList.remove('hidden');
                document.querySelector('#payment-status p').innerText = "Verification Submitted!";
                document.querySelector('#payment-status .info').innerText = "Admin is verifying your code. Ticket will be sent shortly.";
            } else {
                throw new Error(data.error || 'Verification failed');
            }
        } catch (error) {
            alert('Error: ' + error.message);
            payBtn.disabled = false;
        }

    } else {
        // --- STRIPE FLOW ---
        try {
            // 1. Create Payment Intent
            const res = await fetch(`${API_URL}/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, eventName: nameWithTier, phoneNumber: 'N/A' })
            });

            const { clientSecret } = await res.json();

            // 2. Confirm Card Payment
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: card,
                    billing_details: { name: name }
                }
            });

            if (result.error) {
                // Show error to your customer (e.g., insufficient funds)
                document.getElementById('card-errors').textContent = result.error.message;
                payBtn.disabled = false;
                payBtn.textContent = 'Pay with Card';
            } else {
                // The payment has been processed!
                if (result.paymentIntent.status === 'succeeded') {
                    // 3. Notify Backend to Generate Ticket
                    const confirmRes = await fetch(`${API_URL}/stripe-success`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paymentIntentId: result.paymentIntent.id,
                            eventName: nameWithTier,
                            amount,
                            phoneNumber: '0000000000' // Or collect phone for Card users too
                        })
                    });
                    const confirmData = await confirmRes.json();

                    // Show success
                    bookingForm.classList.add('hidden');
                    paymentStatus.classList.remove('hidden');
                    document.querySelector('#payment-status p').innerText = `Payment Successful! Ticket ID: ${confirmData.ticketId}`;
                }
            }
        } catch (error) {
            console.error(error);
            alert('Card Error: ' + error.message);
            payBtn.disabled = false;
        }
    }
});
