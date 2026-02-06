const Stripe = require('stripe');
const dotenv = require('dotenv');
const { generateTicketId } = require('../utils/ticketGen');
const { sendSMS } = require('../utils/sms');
const { db } = require('../config/firebase');

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'kes', eventName, phoneNumber } = req.body;

        if (!stripe) {
            return res.status(500).json({ error: 'Stripe is not configured on the server. Please add STRIPE_SECRET_KEY to environment variables.' });
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe expects amounts in cents (approx. for KES)
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                eventName,
                phoneNumber
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.handlePaymentSuccess = async (req, res) => {
    // In a real app, this should be a Webhook. 
    // For this simple demo, we call this endpoint from client after confirmation.
    try {
        const { paymentIntentId, eventName, phoneNumber, amount } = req.body;

        const ticketId = generateTicketId();
        const timestamp = new Date().toISOString();

        console.log(`✅ Stripe Payment Success! Ref: ${paymentIntentId}`);

        // 1. Save Booking
        const bookingData = {
            paymentRef: paymentIntentId,
            method: 'STRIPE',
            phoneNumber,
            amount,
            eventName,
            ticketId,
            status: 'PAID',
            timestamp
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
        }

        // 2. Send SMS
        // 2. Send SMS
        const message = `✅ Payment Success (Card)! Your Ticket for ${eventName} at Marine Park is confirmed.\n🎫 Ticket No: ${ticketId}\nRef: ${paymentIntentId}\nSee you there!`;

        // Admin Notification Message
        const adminMessage = `🔔 New Booking Alert (Stripe)!\nEvent: ${eventName}\nTicket: ${ticketId}\nAmount: ${amount}\nUser Phone: ${phoneNumber || 'N/A'}`;
        const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254712369221';

        try {
            if (phoneNumber) await sendSMS(phoneNumber, message);
            await sendSMS(ADMIN_PHONE, adminMessage);
            console.log('🔔 Admin notification sent.');
        } catch (e) {
            console.error('SMS fail', e);
        }

        res.json({ result: 'success', ticketId });

    } catch (error) {
        console.error('Stripe Success Handler Error:', error);
        res.status(500).json({ error: error.message });
    }
};
