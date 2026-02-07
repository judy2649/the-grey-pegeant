const Stripe = require('stripe');
const dotenv = require('dotenv');
const { generateTicketId } = require('../utils/ticketGen');
const { sendSMS } = require('../utils/sms');
const { db } = require('../config/firebase');

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Currency conversion rate (1 USD = X KES)
const KES_TO_USD_RATE = parseFloat(process.env.KES_TO_USD_RATE) || 155;

/**
 * Convert KES to USD cents (Stripe requires amounts in smallest currency unit)
 * @param {number} amountKES - Amount in Kenyan Shillings
 * @returns {number} - Amount in USD cents
 */
const convertKesToUsdCents = (amountKES) => {
    const amountUSD = amountKES / KES_TO_USD_RATE;
    // Round to 2 decimal places, then convert to cents
    return Math.round(amountUSD * 100);
};

/**
 * Get USD amount from KES (for display purposes)
 * @param {number} amountKES - Amount in Kenyan Shillings
 * @returns {number} - Amount in USD (2 decimal places)
 */
const getUsdFromKes = (amountKES) => {
    return (amountKES / KES_TO_USD_RATE).toFixed(2);
};

/**
 * Create a Stripe Payment Intent
 * Accepts amount in KES, converts to USD for processing
 */
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amountKES, eventName, eventId, phoneNumber, name, email, tierName } = req.body;

        if (!stripe) {
            return res.status(500).json({
                error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.'
            });
        }

        if (!amountKES || amountKES < 1) {
            return res.status(400).json({ error: 'Invalid amount provided' });
        }

        // Convert KES to USD cents
        const amountUsdCents = convertKesToUsdCents(amountKES);
        const amountUsd = getUsdFromKes(amountKES);

        console.log(`💱 Converting KES ${amountKES} → USD ${amountUsd} (${amountUsdCents} cents)`);

        // Create payment intent in USD
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountUsdCents,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                eventName,
                eventId,
                tierName,
                originalAmountKES: amountKES.toString(),
                convertedAmountUSD: amountUsd,
                customerName: name || '',
                customerEmail: email || '',
                customerPhone: phoneNumber || '',
                conversionRate: KES_TO_USD_RATE.toString()
            }
        });

        console.log(`✅ Payment Intent created: ${paymentIntent.id}`);

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amountKES: amountKES,
            amountUSD: amountUsd,
            conversionRate: KES_TO_USD_RATE
        });

    } catch (error) {
        console.error('❌ Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Handle successful Stripe payment
 */
exports.handlePaymentSuccess = async (req, res) => {
    try {
        const { paymentIntentId, eventName, eventId, phoneNumber, amountKES, amountUSD, name, email, tierName } = req.body;

        const ticketId = generateTicketId();
        const timestamp = new Date().toISOString();

        console.log(`✅ Stripe Payment Success! Ref: ${paymentIntentId}`);

        // Save booking to database
        const bookingData = {
            paymentRef: paymentIntentId,
            method: 'STRIPE',
            phoneNumber: phoneNumber || '',
            name: name || '',
            email: email || '',
            amountKES: amountKES,
            amountUSD: amountUSD,
            eventName,
            eventId,
            tierName: tierName || '',
            ticketId,
            status: 'PAID',
            timestamp
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
            console.log('📝 Booking saved to database');
        }

        // Send SMS notifications
        const userMessage = `✅ Payment Successful!\n\n🎫 Your Ticket for ${eventName} (${tierName}) is confirmed.\n\nTicket No: ${ticketId}\nAmount: KES ${amountKES} (USD ${amountUSD})\nVenue: Marine Park\n\nSee you there! 🎉`;

        const adminMessage = `🔔 New Booking!\nEvent: ${eventName}\nTier: ${tierName}\nTicket: ${ticketId}\nKES ${amountKES} (USD ${amountUSD})\nName: ${name || 'N/A'}\nPhone: ${phoneNumber || 'N/A'}\nEmail: ${email || 'N/A'}`;

        const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254712369221';

        try {
            if (phoneNumber) await sendSMS(phoneNumber, userMessage);
            await sendSMS(ADMIN_PHONE, adminMessage);
            console.log('📱 SMS notifications sent');
        } catch (smsError) {
            console.error('SMS failed:', smsError);
        }

        res.json({
            success: true,
            ticketId,
            message: 'Payment successful! Your ticket has been confirmed.'
        });

    } catch (error) {
        console.error('❌ Payment Success Handler Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get conversion info endpoint
 */
exports.getConversionRate = (req, res) => {
    res.json({
        kesToUsdRate: KES_TO_USD_RATE,
        description: `1 USD = ${KES_TO_USD_RATE} KES`
    });
};
