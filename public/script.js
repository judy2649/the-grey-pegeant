const API_URL = '/api';

// State for current booking
let currentBooking = {
    eventId: null,
    eventName: null,
    tierName: null,
    priceKES: 0,
    priceUSD: 0
};

// Conversion rate (1 USD = X KES) - simplified
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
});

async function loadEvents() {
    try {
        const res = await fetch(`${API_URL}/events`);
        if (!res.ok) throw new Error('Failed to fetch events');
        const events = await res.json();
        renderEvents(events);
    } catch (error) {
        if (eventsContainer) {
            eventsContainer.innerHTML = '<p class="error" style="color: white; text-align: center;">Unable to load events at the moment.</p>';
        }
        console.error('loadEvents error:', error);
    }
}

function renderEvents(events) {
    if (!eventsContainer) return;

    eventsContainer.innerHTML = events.map(event => {
        const tierButtons = event.tiers.map(tier =>
            `<button class="btn-book" onclick="openBooking('${event.id}', '${event.name.replace(/'/g, "\\'")}', ${tier.price}, '${tier.name.replace(/'/g, "\\'")}')">
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
    console.log('Opening booking for:', eventName, tierName);

    const priceUSD = kesToUsd(priceKES);

    // Update current booking state
    currentBooking = {
        eventId,
        eventName,
        tierName,
        priceKES,
        priceUSD
    };

    // Update modal display
    try {
        if (document.getElementById('modal-event-name')) document.getElementById('modal-event-name').textContent = eventName;
        if (document.getElementById('modal-event-price')) document.getElementById('modal-event-price').textContent = `KES ${priceKES}`;
        if (document.getElementById('summary-event-name')) document.getElementById('summary-event-name').textContent = `${eventName} (${tierName})`;
        if (document.getElementById('summary-price-kes')) document.getElementById('summary-price-kes').textContent = `KES ${priceKES}`;
        if (document.getElementById('summary-price-usd')) document.getElementById('summary-price-usd').textContent = `$${priceUSD}`;
        if (document.getElementById('conversion-note')) document.getElementById('conversion-note').textContent = `Rate: 1 USD = ${conversionRate} KES`;
    } catch (e) {
        console.warn('Modal update partial fail:', e);
    }

    resetModalState();

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Ensure it shows
    }

    // Setup proceed button handler
    const proceedBtn = document.getElementById('proceed-payment-btn');
    if (proceedBtn) {
        proceedBtn.onclick = handleProceedToReview;
    }
};

function resetModalState() {
    const idsToHide = ['manual-payment-container', 'payment-status', 'payment-success'];
    const idsToShow = ['customer-info-section', 'proceed-payment-btn'];

    idsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
        }
    });

    idsToShow.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hidden');
            el.style.display = 'block';
        }
    });

    // Reset button text
    const proceedBtn = document.getElementById('proceed-payment-btn');
    if (proceedBtn) {
        proceedBtn.disabled = false;
        proceedBtn.textContent = 'Review & Pay with M-Pesa';
    }

    // Clear inputs safely
    ['name', 'email', 'phone', 'mpesa-code'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function handleProceedToReview() {
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
    if (document.getElementById('customer-info-section')) document.getElementById('customer-info-section').classList.add('hidden');
    if (document.getElementById('customer-info-section')) document.getElementById('customer-info-section').style.display = 'none';

    if (document.getElementById('proceed-payment-btn')) document.getElementById('proceed-payment-btn').classList.add('hidden');
    if (document.getElementById('proceed-payment-btn')) document.getElementById('proceed-payment-btn').style.display = 'none';

    // Show Manual Payment Section
    const manualContainer = document.getElementById('manual-payment-container');
    if (manualContainer) {
        manualContainer.classList.remove('hidden');
        manualContainer.style.display = 'block';
    }

    // Update Price display in instructions
    if (document.getElementById('manual-price')) document.getElementById('manual-price').textContent = currentBooking.priceKES;

    // Set up Confirm Button
    const confirmBtn = document.getElementById('confirm-manual-btn');
    if (confirmBtn) {
        confirmBtn.onclick = () => submitManualPayment(name, email, phone);
    }
}

async function submitManualPayment(name, email, phone) {
    const mpesaCodeInput = document.getElementById('mpesa-code');
    const mpesaCode = mpesaCodeInput ? mpesaCodeInput.value.trim() : '';

    if (!mpesaCode || mpesaCode.length < 10) {
        alert('Please enter a valid 10-character M-Pesa Code (e.g. SDE23...)');
        return;
    }

    const confirmBtn = document.getElementById('confirm-manual-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Verifying...';
    }

    if (paymentStatus) {
        paymentStatus.classList.remove('hidden');
        paymentStatus.style.display = 'block';
        const p = paymentStatus.querySelector('p');
        if (p) p.textContent = 'Recording Payment...';
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
            const manualContainer = document.getElementById('manual-payment-container');
            if (manualContainer) {
                manualContainer.classList.add('hidden');
                manualContainer.style.display = 'none';
            }

            if (paymentStatus) {
                paymentStatus.classList.add('hidden');
                paymentStatus.style.display = 'none';
            }

            if (paymentSuccess) {
                paymentSuccess.classList.remove('hidden');
                paymentSuccess.style.display = 'block';
                const h3 = paymentSuccess.querySelector('h3');
                if (h3) h3.textContent = 'Payment Recorded!';
                const ticketIdDisp = document.getElementById('ticket-id-display');
                if (ticketIdDisp) ticketIdDisp.textContent = `🎫 Ticket ID: ${result.ticketId}`;

                // Remove any existing success message
                const oldMsg = paymentSuccess.querySelector('.success-message');
                if (oldMsg) oldMsg.remove();

                // Show message about SMS & WhatsApp
                const msg = document.createElement('p');
                msg.className = 'success-message';
                msg.style.color = '#065f46';
                msg.style.marginTop = '15px';
                msg.innerHTML = `
                    ✅ Your payment was recorded. A confirmation SMS with your ticket has been sent to <strong>${phone}</strong>.<br><br>
                    <div style="margin-top:10px; font-weight: normal;">
                        Did not receive it? 
                        <a href="https://wa.me/254794173314?text=Hi,%20I%20paid%20for%20a%20ticket%20but%20did%20not%20receive%20the%20SMS.%20Ticket%20ID:%20${result.ticketId}" 
                           target="_blank" style="color: #25D366; font-weight: bold; text-decoration: underline;">
                           WhatsApp Support
                        </a>
                    </div>`;
                paymentSuccess.appendChild(msg);
            }

        } else {
            throw new Error(result.message || 'Validation failed');
        }

    } catch (error) {
        console.error('Payment Error:', error);
        alert('Error: ' + error.message);
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✅ Confirm Payment';
        }
        if (paymentStatus) {
            paymentStatus.classList.add('hidden');
            paymentStatus.style.display = 'none';
        }
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Global Close Modal Logic
if (closeBtn) {
    closeBtn.onclick = () => {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    };
}

window.onclick = (e) => {
    if (modal && e.target == modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
