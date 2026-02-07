const API_URL = '/api';

// --- CONFIGURATION ---
// IMPORTANT: Replace this with your actual IntaSend Publishable Key
// You can find it in your IntaSend Dashboard -> Settings -> API Keys
const INTASEND_PUBLISHABLE_KEY = "IS_REPLACE_WITH_YOUR_KEY";
// ---------------------

let intasend_instance;
if (window.IntaSend) {
    intasend_instance = new window.IntaSend({
        publicAPIKey: INTASEND_PUBLISHABLE_KEY,
        live: false // Set to true for production
    });
}

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
        const phone = document.getElementById('phone').value;

        if (!name || !email || !phone) {
            alert("Please provide your name, phone, and email to receive your ticket.");
            return;
        }

        if (!intasend_instance) {
            alert("Payment gateway not initialized. Check your Publishable Key.");
            return;
        }

        // Show status on button
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Triggering STK Push...';

        // Direct STK Push via Inline SDK (No Redirect)
        intasend_instance.run({
            amount: price,
            currency: "KES",
            comment: `Ticket for ${fullEventName}`,
            customer: {
                first_name: name,
                email: email,
                phone_number: phone
            },
            method: "M-PESA" // This forces M-PESA STK flow
        })
            .on("COMPLETE", (results) => {
                confirmBtn.textContent = 'Payment Complete!';
                paymentStatus.classList.remove('hidden');
                document.querySelector('#payment-status p').innerText = "Payment Successful! Your ticket is being generated.";
                console.log("Payment complete:", results);
            })
            .on("FAILED", (results) => {
                confirmBtn.disabled = false;
                confirmBtn.textContent = '🚀 Confirm & Pay Now';
                alert("Payment failed. Please try again.");
                console.error("Payment failed:", results);
            })
            .on("IN-PROGRESS", (results) => {
                confirmBtn.textContent = 'Checking STK Status...';
                console.log("Payment in progress...");
            });
    };
};

// Close Modal
closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target == modal) modal.classList.add('hidden');
}
