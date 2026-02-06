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
    const fullEventName = `${eventName} (${tierName})`;

    document.getElementById('modal-event-name').textContent = fullEventName;
    document.getElementById('modal-event-price').textContent = `KES ${price}`;

    bookingForm.classList.remove('hidden');
    paymentStatus.classList.add('hidden');
    // Reset payment status UI
    document.querySelector('#payment-status .spinner').style.display = '';
    document.querySelector('#payment-status p').innerText = 'Check your phone! Enter PIN to pay.';
    document.querySelector('#payment-status .info').innerText = 'Ticket will be sent via SMS shortly.';
    payBtn.disabled = false;
    payBtn.textContent = 'Pay with M-Pesa';
    document.getElementById('card-errors').textContent = '';

    modal.classList.remove('hidden');
};

// Close Modal
closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
}

// Stripe Init
const stripe = Stripe('pk_test_51Sxw4eLRhlfVEwJw6BLjczqycD8bSHc02HUwleEQnAEkBOrdC6VawKzfyIeOGrBxvhoG0ogHBGtitRFoGpECeUbN00vkv12p8l');
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');

let selectedMethod = 'mpesa';

window.toggleMethod = (method) => {
    selectedMethod = method;
    document.getElementById('method-mpesa').classList.toggle('active', method === 'mpesa');
    document.getElementById('method-card').classList.toggle('active', method === 'card');

    const phoneInput = document.getElementById('phone');
    const cardPhoneInput = document.getElementById('card-phone');

    if (method === 'mpesa') {
        document.getElementById('mpesa-fields').classList.remove('hidden');
        document.getElementById('stripe-fields').classList.add('hidden');
        document.getElementById('pay-btn').textContent = 'Pay with M-Pesa';
        // Toggle required attributes
        phoneInput.setAttribute('required', '');
        cardPhoneInput.removeAttribute('required');
    } else {
        document.getElementById('mpesa-fields').classList.add('hidden');
        document.getElementById('stripe-fields').classList.remove('hidden');
        document.getElementById('pay-btn').textContent = 'Pay with Card';
        // Toggle required attributes
        phoneInput.removeAttribute('required');
        cardPhoneInput.setAttribute('required', '');
    }
    // Clear any previous errors
    document.getElementById('card-errors').textContent = '';
};

// Poll for M-Pesa payment status
async function pollPaymentStatus(checkoutRequestID, eventName, phone, name, eventId, amount) {
    const maxAttempts = 30; // Poll for up to ~60 seconds
    let attempts = 0;

    const poll = setInterval(async () => {
        attempts++;

        try {
            const res = await fetch(`${API_URL}/payment-status/${checkoutRequestID}`);
            const data = await res.json();

            if (data.status === 'PAID') {
                clearInterval(poll);
                document.querySelector('#payment-status .spinner').style.display = 'none';
                document.querySelector('#payment-status p').innerText = `Payment Confirmed! Ticket No: ${data.ticketId}`;
                document.querySelector('#payment-status .info').innerText = 'An SMS with your ticket details has been sent to your phone.';
            } else if (data.status === 'FAILED') {
                clearInterval(poll);
                document.querySelector('#payment-status .spinner').style.display = 'none';
                document.querySelector('#payment-status p').innerText = 'Payment failed or was cancelled.';
                document.querySelector('#payment-status .info').innerText = 'Please try again or use a different payment method.';
            } else if (attempts >= maxAttempts) {
                clearInterval(poll);
                document.querySelector('#payment-status .spinner').style.display = 'none';
                document.querySelector('#payment-status p').innerText = 'Payment is taking longer than expected.';
                document.querySelector('#payment-status .info').innerText = 'If you completed the payment, your ticket SMS will arrive shortly. Otherwise, please try again.';
            }
        } catch (err) {
            console.error('Poll error:', err);
        }
    }, 2000);
}

// Handle Payment Submission
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const eventId = document.getElementById('event-id').value;
    const name = document.getElementById('name').value;
    const nameWithTier = document.getElementById('modal-event-name').textContent;

    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';

    if (selectedMethod === 'mpesa') {
        // --- STK PUSH FLOW ---
        const phone = document.getElementById('phone').value;

        try {
            const res = await fetch(`${API_URL}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: phone,
                    amount: amount,
                    eventId: eventId,
                    eventName: nameWithTier,
                    name: name
                })
            });

            const data = await res.json();

            if (data.checkoutRequestID) {
                // Show waiting status
                bookingForm.classList.add('hidden');
                paymentStatus.classList.remove('hidden');
                document.querySelector('#payment-status .spinner').style.display = '';
                document.querySelector('#payment-status p').innerText = 'Check your phone! Enter your M-Pesa PIN to pay.';
                document.querySelector('#payment-status .info').innerText = 'Waiting for payment confirmation...';

                // Start polling for status
                pollPaymentStatus(data.checkoutRequestID, nameWithTier, phone, name, eventId, amount);
            } else {
                throw new Error(data.error || 'Failed to initiate payment');
            }
        } catch (error) {
            alert('Error: ' + error.message);
            payBtn.disabled = false;
            payBtn.textContent = 'Pay with M-Pesa';
        }

    } else {
        // --- STRIPE FLOW ---
        // Get the phone number from the card phone input field
        const cardPhone = document.getElementById('card-phone') ? document.getElementById('card-phone').value : '';

        try {
            const res = await fetch(`${API_URL}/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, eventName: nameWithTier, phoneNumber: cardPhone })
            });

            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }

            const result = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: {
                    card: card,
                    billing_details: { name: name }
                }
            });

            if (result.error) {
                document.getElementById('card-errors').textContent = result.error.message;
                payBtn.disabled = false;
                payBtn.textContent = 'Pay with Card';
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    // Format phone for SMS
                    let smsPhone = cardPhone;
                    if (smsPhone.startsWith('0')) {
                        smsPhone = '+254' + smsPhone.slice(1);
                    } else if (smsPhone && !smsPhone.startsWith('+')) {
                        smsPhone = '+' + smsPhone;
                    }

                    const confirmRes = await fetch(`${API_URL}/stripe-success`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paymentIntentId: result.paymentIntent.id,
                            eventName: nameWithTier,
                            amount,
                            phoneNumber: smsPhone
                        })
                    });
                    const confirmData = await confirmRes.json();

                    bookingForm.classList.add('hidden');
                    paymentStatus.classList.remove('hidden');
                    document.querySelector('#payment-status .spinner').style.display = 'none';
                    document.querySelector('#payment-status p').innerText = `Payment Successful! Ticket No: ${confirmData.ticketId}`;
                    document.querySelector('#payment-status .info').innerText = 'An SMS with your ticket details has been sent to your phone.';
                }
            }
        } catch (error) {
            console.error(error);
            document.getElementById('card-errors').textContent = error.message || 'Card payment failed. Please try again.';
            payBtn.disabled = false;
            payBtn.textContent = 'Pay with Card';
        }
    }
});
