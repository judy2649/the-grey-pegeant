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
    document.getElementById('proceed-payment-btn').classList.remove('hidden');

    // Hide Status/Success/Manual sections
    document.getElementById('payment-status').classList.add('hidden');
    document.getElementById('payment-success').classList.add('hidden');
    document.getElementById('manual-payment-container').classList.add('hidden');

    // Reset button states
    const proceedBtn = document.getElementById('proceed-payment-btn');
    if (proceedBtn) {
        proceedBtn.disabled = false;
        proceedBtn.textContent = 'Review & Pay with M-Pesa';
    }

    // Clear form
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('mpesa-code').value = ''; // Clear code input too
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

    // Switch to Manual Pay View
    document.getElementById('customer-info-section').classList.add('hidden');
    document.getElementById('proceed-payment-btn').classList.add('hidden');

    // Show Manual Payment Section
    const manualContainer = document.getElementById('manual-payment-container');
    manualContainer.classList.remove('hidden');
    manualContainer.style.display = 'block';

    // Update Price display in instructions
    document.getElementById('manual-price').textContent = currentBooking.priceKES;

    // Set up Confirm Button
    const confirmBtn = document.getElementById('confirm-manual-btn');
    confirmBtn.onclick = () => submitManualPayment(name, email, phone);
}

async function submitManualPayment(name, email, phone) {
    const mpesaCode = document.getElementById('mpesa-code').value.trim();

    if (!mpesaCode || mpesaCode.length < 10) {
        alert('Please enter a valid 10-character M-Pesa Code (e.g. SDE23...)');
        return;
    }

    const confirmBtn = document.getElementById('confirm-manual-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Verifying...';

    // Show status/progress if you have a status element
    const paymentStatus = document.getElementById('payment-status');
    if (paymentStatus) {
        paymentStatus.classList.remove('hidden');
        paymentStatus.querySelector('p').textContent = 'Recording Payment...';
    }

    try {
        const response = await fetch(`${API_URL}/manual-pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mpesaCode: mpesaCode,
                phoneNumber: phone,
                name: name,
                email: email,
                eventName: currentBooking.eventName,
                amount: currentBooking.priceKES,
                tierName: currentBooking.tierName
            })
        });

        const result = await response.json();

        if (result.success) {
            // Success!
            document.getElementById('manual-payment-container').classList.add('hidden'); // Hide form
            document.getElementById('manual-payment-container').style.display = 'none';
            if (paymentStatus) paymentStatus.classList.add('hidden');

            const successDiv = document.getElementById('payment-success');
            successDiv.classList.remove('hidden');
            successDiv.querySelector('h3').textContent = 'Payment Recorded!';
            document.getElementById('ticket-id-display').textContent = `🎫 Ticket ID: ${result.ticketId}`;

            // Show message about SMS & WhatsApp
            const msg = document.createElement('p');
            msg.className = 'success-message';
            msg.innerHTML = `
                ✅ Ticket sent to <strong>${phone}</strong> via SMS.<br><br>
                <div style="margin-top:15px">
                    Did not receive it? 
                    <a href="https://wa.me/254794173314?text=Hi,%20I%20paid%20for%20a%20ticket%20but%20did%20not%20receive%20the%20SMS.%20Ticket%20ID:%20${result.ticketId}" 
                       target="_blank" style="color: #25D366; font-weight: bold; text-decoration: none;">
                       WhatsApp Us
                    </a>
                </div>`;
            successDiv.appendChild(msg);

        } else {
            throw new Error(result.message || 'Validation failed');
        }

    } catch (error) {
        console.error('Payment Error:', error);
        alert('Error: ' + error.message);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Confirm Payment';
        if (paymentStatus) paymentStatus.classList.add('hidden');
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
