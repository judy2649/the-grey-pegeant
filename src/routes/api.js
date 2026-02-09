const express = require('express');
const router = express.Router();

// Placeholder controllers (will be implemented next)
const mpesaController = require('../controllers/mpesaController');
const adminController = require('../controllers/adminController');
const manualPaymentController = require('../controllers/manualPaymentController');


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

// 5. Query Transaction Status
router.post('/transaction-status', mpesaController.queryTransactionStatus);




// 7. Manual M-Pesa Payment
router.post('/manual-pay', manualPaymentController.processManualPayment);

// --- Admin Endpoints ---

// 8. Admin Analytics
router.get('/admin/analytics', adminController.getAnalytics);

// 8b. Admin Get Bookings
router.get('/admin/bookings', adminController.getBookings);

// 9. Admin Verify Manual Payment
router.post('/admin/verify-payment', adminController.verifyManualPayment);

// 10. Admin Resend Ticket
router.post('/admin/resend-ticket', adminController.resendTicket);

module.exports = router;
