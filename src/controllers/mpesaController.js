const axios = require('axios');
const { getAccessToken, getStkPassword, getTimestamp } = require('../config/mpesa');
const { db } = require('../config/firebase'); // Will be null if no credentials
const { sendSMS } = require('../utils/sms');
const { generateTicketId } = require('../utils/ticketGen');

/**
 * Initiate STK Push
 */
exports.initiateSTKPush = async (req, res) => {
    try {
        const { phoneNumber, amount, eventId } = req.body;

        // Basic validation
        if (!phoneNumber || !amount || !eventId) {
            return res.status(400).json({ error: 'Missing phone number, amount, or event ID' });
        }

        // Format phone number (must be 254...)
        let formattedPhone = phoneNumber.replace('+', '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        }

        const accessToken = await getAccessToken();
        const url = process.env.MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const timestamp = getTimestamp();
        const password = getStkPassword();

        const transactionType = process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline';
        const businessShortCode = process.env.MPESA_SHORTCODE; // Initiator
        const partyB = transactionType === 'CustomerBuyGoodsOnline' ? (process.env.MPESA_TILL_NUMBER || businessShortCode) : businessShortCode;

        const data = {
            "BusinessShortCode": businessShortCode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": transactionType,
            "Amount": amount,
            "PartyA": formattedPhone,
            "PartyB": partyB,
            "PhoneNumber": formattedPhone,
            "CallBackURL": `${process.env.BASE_URL}/api/callback`,
            "AccountReference": "9821671",
            "TransactionDesc": "The Grey Pageant"
        };

        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // In a real app, save 'CheckoutRequestID' to DB to track this pending transaction
        console.log(`🚀 STK Push initiated for ${formattedPhone}. checkoutRequestID: ${response.data.CheckoutRequestID}`);

        res.json({
            message: 'STK Push initiated successfully',
            checkoutRequestID: response.data.CheckoutRequestID,
            responseCode: response.data.ResponseCode
        });

    } catch (error) {
        console.error('❌ STK Push Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to initiate M-Pesa payment' });
    }
};

/**
 * Handle M-Pesa Callback
 */
exports.handleCallback = async (req, res) => {
    try {
        console.log('🔔 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

        // SECURITY: Validate callback secret to prevent fake payments
        const callbackSecret = req.headers['x-callback-secret'];
        const expectedSecret = process.env.MPESA_CALLBACK_SECRET;

        if (expectedSecret && callbackSecret !== expectedSecret) {
            console.error('❌ Invalid callback secret. Possible fake payment attempt!');
            return res.status(403).json({ error: 'Forbidden' });
        }

        const body = req.body.Body.stkCallback;

        if (body.ResultCode !== 0) {
            console.log('❌ Payment Cancelled or Failed:', body.ResultDesc);
            // Update transaction status to 'FAILED' in DB
            return res.json({ result: 'fail' });
        }

        // --- PAYMENT SUCCESSFUL ---
        const meta = body.CallbackMetadata.Item;
        function getValue(name) {
            return meta.find(o => o.Name === name)?.Value;
        }

        const amount = getValue('Amount');
        const mpesaReceiptNumber = getValue('MpesaReceiptNumber');
        const phoneNumber = getValue('PhoneNumber');

        // In reality, you'd match CheckoutRequestID to find which event this is for.
        // For this demo, we'll assume a dummy event or pass it in via param if possible (not in callback).
        // Let's hardcode an event for the demo callback flow.
        // Use event name from request or default
        const eventName = req.body.eventName || 'The Grey Pageant';

        const ticketId = generateTicketId();

        console.log(`✅ Payment Success! Receipt: ${mpesaReceiptNumber}, Amount: ${amount}`);

        // 1. Save Booking to Firestore (if available)
        const bookingData = {
            mpesaReceiptNumber,
            phoneNumber,
            amount,
            eventId,
            eventName,
            ticketId,
            status: 'PAID',
            timestamp: new Date().toISOString()
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
            console.log('💾 Booking saved to Firestore');
        } else {
            console.log('⚠️ Firestore not configured. Booking data (Mock):', bookingData);
        }

        // 2. Send SMS Ticket
        const message = `✅ Payment Success! Your Ticket for ${eventName} at Marine Park is confirmed.\n🎫 Ticket No: ${ticketId}\nRef: ${mpesaReceiptNumber}\nSee you there!`;

        // Admin Notification Message
        const adminMessage = `🔔 New Booking Alert!\nEvent: ${eventName}\nTicket: ${ticketId}\nRef: ${mpesaReceiptNumber}\nUser: ${phoneNumber}`;
        const ADMIN_PHONE = '+254794173314';

        try {
            // Send to User
            await sendSMS(phoneNumber, message);
            // Send to Admin
            await sendSMS(ADMIN_PHONE, adminMessage);
            console.log('🔔 Admin notification sent.');
        } catch (smsError) {
            console.error('⚠️ Failed to send SMS:', smsError.message);
        }

        res.json({ result: 'success' });

    } catch (error) {
        console.error('❌ Callback Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
