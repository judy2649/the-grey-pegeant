const axios = require('axios');
const { db } = require('../config/firebase');
const { sendSMS } = require('../utils/sms');
const { generateTicketId } = require('../utils/ticketGen');

/**
 * Verify IntaSend Payment and Generate Ticket
 */
exports.verifyIntaSendPayment = async (req, res) => {
    try {
        const { tracking_id, eventName, amount, phoneNumber } = req.body;

        if (!tracking_id) {
            return res.status(400).json({ error: 'Missing tracking ID' });
        }

        // Verify with IntaSend API
        const intasend_url = process.env.INTASEND_ENV === 'production'
            ? `https://payment.intasend.com/api/v1/payment/status/`
            : `https://sandbox.intasend.com/api/v1/payment/status/`;

        const response = await axios.post(intasend_url, {
            tracking_id: tracking_id
        }, {
            headers: {
                'X-IntaSend-Publishable-Key': process.env.INTASEND_PUBLISHABLE_KEY
            }
        });

        const paymentStatus = response.data.payment.status;

        if (paymentStatus === 'COMPLETE') {
            const ticketId = generateTicketId();
            const mpesaReceiptNumber = response.data.payment.mpesa_reference || tracking_id;

            const bookingData = {
                mpesaReceiptNumber,
                phoneNumber,
                amount,
                eventName,
                ticketId,
                status: 'PAID',
                method: 'INTASEND',
                timestamp: new Date().toISOString()
            };

            if (db) {
                await db.collection('bookings').add(bookingData);
                console.log('💾 IntaSend Booking saved to Firestore');
            }

            const message = `✅ Payment Success! Your Ticket for ${eventName} is confirmed.\n🎫 Ticket No: ${ticketId}\nRef: ${mpesaReceiptNumber}\nSee you there!`;
            const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254794173314';

            try {
                await sendSMS(phoneNumber, message);
                await sendSMS(ADMIN_PHONE, `🔔 New IntaSend Booking!\nEvent: ${eventName}\nTicket: ${ticketId}\nRef: ${mpesaReceiptNumber}`);
            } catch (smsError) {
                console.error('⚠️ SMS Notify Error:', smsError.message);
            }

            return res.json({ result: 'success', ticketId });
        } else {
            console.log('❌ IntaSend Payment not complete:', paymentStatus);
            return res.status(400).json({ error: 'Payment not completed' });
        }

    } catch (error) {
        console.error('❌ IntaSend Verify Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to verify IntaSend payment' });
    }
};

/**
 * IntaSend Webhook (Optional but recommended for robustness)
 */
exports.handleWebhook = async (req, res) => {
    // Implement webhook logic if needed for background processing
    console.log('🔔 IntaSend Webhook Received:', JSON.stringify(req.body, null, 2));
    res.json({ status: 'ok' });
};
