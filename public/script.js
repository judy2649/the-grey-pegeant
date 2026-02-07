const API_URL = '/api';

// Stripe configuration - will be initialized when needed
let stripe = null;
let elements = null;
let paymentElement = null;

// State for current booking
let currentBooking = {
    eventId: null,
    eventName: null,
    tierName: null,
    priceKES: 0,
    priceUSD: 0,
    clientSecret: null,
    paymentIntentId: null
};

// Conversion rate
let conversionRate = 155;

// DOM Elements
const eventsContainer = document.getElementById('events-container');
const modal = document.getElementById('booking-modal');
const closeBtn = document.querySelector('.close-btn');
const paymentStatus = document.getElementById('payment-status');
const paymentSuccess = document.getElementById('payment-success');

// Load Events on Start
document.addEventListener('DOMContentLoaded', async () => {
    loadEvents();
    await loadConversionRate();
});

async function loadConversionRate() {
    try {
        const res = await fetch(`${API_URL}/conversion-rate`);
        const data = await res.json();
        conversionRate = data.kesToUsdRate || 155;
        console.log(`💱 Conversion rate loaded: 1 USD = ${conversionRate} KES`);
    } catch (error) {
        console.error('Failed to load conversion rate, using default:', error);
    }
}

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

// Convert KES to USD
function kesToUsd(kes) {
    return (kes / conversionRate).toFixed(2);
}

// Open booking modal
window.openBooking = (eventId, eventName, priceKES, tierName) => {
    const priceUSD = kesToUsd(priceKES);
    const fullEventName = `${eventName} (${tierName})`;

    // Update current booking state
    currentBooking = {
        eventId,
        eventName,
        tierName,
        priceKES,
        priceUSD,
        clientSecret: null,
        paymentIntentId: null
    };

    // Update modal display
    document.getElementById('modal-event-name').textContent = eventName;
    document.getElementById('modal-event-price').textContent = `KES ${priceKES}`;
    document.getElementById('summary-event-name').textContent = fullEventName;
    document.getElementById('summary-price-kes').textContent = `KES ${priceKES}`;
    document.getElementById('summary-price-usd').textContent = `$${priceUSD}`;
    document.getElementById('conversion-note').textContent = `Rate: 1 USD = ${conversionRate} KES`;

    // Reset UI state
    resetModalState();
    modal.classList.remove('hidden');

    // Setup proceed button handler
    const proceedBtn = document.getElementById('proceed-payment-btn');
    proceedBtn.onclick = handleProceedToPayment;
};

function resetModalState() {
    // Show customer info, hide payment section
    document.getElementById('customer-info-section').classList.remove('hidden');
    document.getElementById('stripe-payment-section').classList.add('hidden');
    document.getElementById('proceed-payment-btn').classList.remove('hidden');
    document.getElementById('pay-btn').classList.add('hidden');
    document.getElementById('payment-status').classList.add('hidden');
    document.getElementById('payment-success').classList.add('hidden');
    document.getElementById('payment-message').classList.add('hidden');

    // Reset button states
    const proceedBtn = document.getElementById('proceed-payment-btn');
    proceedBtn.disabled = false;
    proceedBtn.textContent = '💳 Proceed to Payment';

    // Clear form
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
}

async function handleProceedToPayment() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!name || !email) {
        alert('Please enter your name and email address.');
        return;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    const proceedBtn = document.getElementById('proceed-payment-btn');
    proceedBtn.disabled = true;
    proceedBtn.textContent = 'Creating payment...';

    try {
        // Create payment intent
        const response = await fetch(`${API_URL}/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amountKES: currentBooking.priceKES,
                eventName: currentBooking.eventName,
                eventId: currentBooking.eventId,
                tierName: currentBooking.tierName,
                name,
                email,
                phoneNumber: phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create payment');
        }

        currentBooking.clientSecret = data.clientSecret;
        currentBooking.paymentIntentId = data.paymentIntentId;
        currentBooking.priceUSD = data.amountUSD;

        console.log('✅ Payment Intent created:', data.paymentIntentId);

        // Initialize Stripe Elements
        await initializeStripeElements(data.clientSecret);

        // Hide customer info, show payment section
        document.getElementById('customer-info-section').classList.add('hidden');
        document.getElementById('stripe-payment-section').classList.remove('hidden');
        proceedBtn.classList.add('hidden');
        document.getElementById('pay-btn').classList.remove('hidden');

        // Setup pay button
        const payBtn = document.getElementById('pay-btn');
        payBtn.onclick = handlePayment;

    } catch (error) {
        console.error('Payment setup error:', error);
        alert('Error: ' + error.message);
        proceedBtn.disabled = false;
        proceedBtn.textContent = '💳 Proceed to Payment';
    }
}

async function initializeStripeElements(clientSecret) {
    // Initialize Stripe with your publishable key
    // Using test key - replace with your actual publishable key
    if (!stripe) {
        // This should be your actual publishable key from Stripe dashboard
        stripe = Stripe('pk_test_51Sxw4eLRhlfVEwJw6BLjczqycD8bSHc02HUwleEQnAEkBOrdC6VawKzfyIeOGrBxvhoG0ogHBGtitRFoGpECeUbN00vkv12p8l');
    }

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#6366f1',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '8px',
        }
    };

    elements = stripe.elements({ appearance, clientSecret });

    paymentElement = elements.create('payment', {
        layout: 'tabs'
    });

    paymentElement.mount('#payment-element');
}

async function handlePayment() {
    const payBtn = document.getElementById('pay-btn');
    const messageDiv = document.getElementById('payment-message');

    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';
    document.getElementById('payment-status').classList.remove('hidden');
    messageDiv.classList.add('hidden');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    try {
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href,
                receipt_email: email,
            },
            redirect: 'if_required'
        });

        if (error) {
            throw new Error(error.message);
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Payment successful - notify server
            const successResponse = await fetch(`${API_URL}/stripe-success`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentIntentId: paymentIntent.id,
                    eventName: currentBooking.eventName,
                    eventId: currentBooking.eventId,
                    tierName: currentBooking.tierName,
                    phoneNumber: phone,
                    amountKES: currentBooking.priceKES,
                    amountUSD: currentBooking.priceUSD,
                    name,
                    email
                })
            });

            const result = await successResponse.json();

            // Show success message
            document.getElementById('payment-status').classList.add('hidden');
            document.getElementById('payment-success').classList.remove('hidden');
            document.getElementById('stripe-payment-section').classList.add('hidden');
            payBtn.classList.add('hidden');

            if (result.ticketId) {
                document.getElementById('ticket-id-display').textContent = `🎫 Ticket ID: ${result.ticketId}`;
            }

            console.log('🎉 Payment completed successfully!');
        }

    } catch (error) {
        console.error('Payment error:', error);
        messageDiv.textContent = error.message;
        messageDiv.classList.remove('hidden');
        payBtn.disabled = false;
        payBtn.textContent = '💳 Pay Now';
        document.getElementById('payment-status').classList.add('hidden');
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Close Modal
closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
}
