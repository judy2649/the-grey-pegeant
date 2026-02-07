const axios = require('axios');
const dotenv = require('dotenv');
const { generateTicketId } = require('../utils/ticketGen');
const { sendSMS } = require('../utils/sms');
const { db } = require('../config/firebase');

dotenv.config();

/**
 * Initiates a Flutterwave payment
 * Note: Flutterwave usually handles this client-side via Inline Modal or Standard Checkout
 * But we can verify transactions server-side here.
 */
exports.initiatePayment = async (req, res) => {
    // For Flutterwave, most logic happens on frontend with the Public Key.
    // The backend is mainly for verification after payment.
    res.json({
        publicKey: process.env.FLW_PUBLIC_KEY,
        message: 'Ready for Flutterwave Inline'
    });
};

/**
 * Verify Transaction after successful payment on frontend
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { transactionId, status, flwRef, amount, currency, customer, eventName, ticketDetails } = req.body;

        // 1. Verify transaction with Flutterwave API (Server-to-Server check)
        // This prevents users from faking success
        const flwSecretKey = process.env.FLW_SECRET_KEY;

        if (!flwSecretKey) {
            return res.status(500).json({ error: 'Flutterwave Secret Key not configured.' });
        }

        const verifyResponse = await axios.get(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
            headers: { Authorization: `Bearer ${flwSecretKey}` }
        });

        const verifiedData = verifyResponse.data.data;

        // Check if truly successful
        if (verifiedData.status === 'successful' && verifiedData.amount >= amount && verifiedData.currency === currency) {
            // Payment is valid!

            const ticketId = generateTicketId(); // Generate ticket
            const timestamp = new Date().toISOString();

            // Save booking
            const bookingData = {
                transactionId,
                flwRef,
                method: 'FLUTTERWAVE',
                amount: verifiedData.amount,
                currency: verifiedData.currency,
                customerName: customer.name,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                eventName: eventName || 'Event',
                tierName: ticketDetails?.tierName || 'Standard',
                ticketId,
                status: 'PAID',
                timestamp
            };

            if (db) {
                await db.collection('bookings').add(bookingData);
            }

            // Send SMS
            const userMessage = `✅ Payment Confirmed! Ticket: ${ticketId}\nEvent: ${eventName}\nAmt: ${currency} ${amount}\nEnjoy!`;
            const adminMessage = `🔔 New Flutterwave Payment!\nAmount: ${currency} ${amount}\nUser: ${customer.name} (${customer.phone})`;
            const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254712369221';

            // Send SMS (fails silently if key missing)
            if (customer.phone) await sendSMS(customer.phone, userMessage);
            await sendSMS(ADMIN_PHONE, adminMessage);

            res.json({
                status: 'success',
                message: 'Payment verified and ticket generated.',
                ticketId: ticketId
            });

        } else {
            res.status(400).json({ status: 'failed', message: 'Payment verification failed or amount mismatch.' });
        }

    } catch (error) {
        console.error('Flutterwave Verification Error:', error.message);
        res.status(500).json({ error: 'Verification failed' });
    }
};
