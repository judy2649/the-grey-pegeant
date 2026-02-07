const express = require('express');
const router = express.Router();

// Placeholder controllers (will be implemented next)
const mpesaController = require('../controllers/mpesaController');
const stripeController = require('../controllers/stripeController');

const eventController = {
    getEvents: (req, res) => {
        // Mock data for now until DB is connected
        const events = [
            {
                id: 'evt_grey_pageant',
                name: 'The Grey Pageant',
                date: '2026-02-13',
                time: '06:00 PM',
                venue: 'Marine Park',
                totalTickets: 600,
                image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop', // Beautiful event image
                tiers: [
                    { name: 'Normal', price: 200 },
                    { name: 'VIP', price: 500 },
                    { name: 'VVIP', price: 1000 }
                ]
            }
        ];
        res.json(events);
    }
};

// --- Routes ---

// 1. Get Events
router.get('/events', eventController.getEvents);

// 2. Initiate Payment (STK Push)
// POST /api/pay
// Body: { phoneNumber, amount, eventId }
router.post('/pay', mpesaController.initiateSTKPush);

// 3. M-Pesa Callback
// POST /api/callback
router.post('/callback', mpesaController.handleCallback);

// 4. Manual Verification
router.post('/verify-payment', mpesaController.submitManualVerification);

// 5. Stripe Routes
router.post('/create-payment-intent', stripeController.createPaymentIntent);
router.post('/stripe-success', stripeController.handlePaymentSuccess);
router.get('/conversion-rate', stripeController.getConversionRate);


// 6. Final module export
module.exports = router;
