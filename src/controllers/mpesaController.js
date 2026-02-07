const axios = require('axios');
const { getAccessToken, getStkPassword, getTimestamp } = require('../config/mpesa');
const { db } = require('../config/firebase');
const { sendSMS } = require('../utils/sms');
const { generateTicketId } = require('../utils/ticketGen');

/**
 * Initiate STK Push
 */
exports.initiateSTKPush = async (req, res) => {
    try {
        const { phoneNumber, amount, eventId } = req.body;

        if (!phoneNumber || !amount || !eventId) {
            return res.status(400).json({ error: 'Missing phone number, amount, or event ID' });
        }

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

        const transactionType = process.env.MPESA_TRANSACTION_TYPE || 'CustomerBuyGoodsOnline'; // Switched to Buy Goods for Till
        const businessShortCode = process.env.MPESA_SHORTCODE || "99202854"; // Store Number as fallback
        const partyB = process.env.MPESA_TILL_NUMBER || "9821671"; // Till Number as fallback

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
            "AccountReference": partyB,
            "TransactionDesc": "The Grey Pageant Ticket Purchase"
        };

        const response = await axios.post(url, data, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        console.log(`🚀 STK Push initiated for ${formattedPhone}. checkoutRequestID: ${response.data.CheckoutRequestID}`);

        res.json({
            message: 'STK Push initiated successfully',
            checkoutRequestID: response.data.CheckoutRequestID,
            responseCode: response.data.ResponseCode
        });

    } catch (error) {
        const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('❌ STK Push Error:', errorDetail);
        res.status(500).json({
            error: 'Failed to initiate M-Pesa payment',
            detail: errorDetail
        });
    }
};

/**
 * Handle M-Pesa Callback
 */
exports.handleCallback = async (req, res) => {
    try {
        console.log('🔔 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

        const callbackSecret = req.headers['x-callback-secret'];
        const expectedSecret = process.env.MPESA_CALLBACK_SECRET;

        if (expectedSecret && callbackSecret !== expectedSecret) {
            console.error('❌ Invalid callback secret. Possible fake payment attempt!');
            return res.status(403).json({ error: 'Forbidden' });
        }

        const body = req.body.Body.stkCallback;

        if (body.ResultCode !== 0) {
            console.log('❌ Payment Cancelled or Failed:', body.ResultDesc);
            return res.json({ result: 'fail' });
        }

        const meta = body.CallbackMetadata.Item;
        function getValue(name) {
            return meta.find(o => o.Name === name)?.Value;
        }

        const amount = getValue('Amount');
        const mpesaReceiptNumber = getValue('MpesaReceiptNumber');
        const phoneNumber = getValue('PhoneNumber');

        const eventId = req.body.eventId || 'evt_grey_pageant';
        const eventName = req.body.eventName || 'The Grey Pageant';

        const ticketId = generateTicketId();

        console.log(`✅ Payment Success! Receipt: ${mpesaReceiptNumber}, Amount: ${amount}`);

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

        const message = `✅ Payment Success! Your Ticket for ${eventName} at Marine Park is confirmed.\n🎫 Ticket No: ${ticketId}\nRef: ${mpesaReceiptNumber}\nSee you there!`;
        const adminMessage = `🔔 New Booking Alert!\nEvent: ${eventName}\nTicket: ${ticketId}\nRef: ${mpesaReceiptNumber}\nUser: ${phoneNumber}`;
        const ADMIN_PHONE = '+254794173314';

        try {
            await sendSMS(phoneNumber, message);
            await sendSMS(ADMIN_PHONE, adminMessage);
            console.log('🔔 Admin notification sent.');
        } catch (smsError) {
            console.error('⚠️ Failed to send SMS:', smsError.message);
        }

        res.json({ result: 'success' });

    } catch (error) {
        console.error('❌ Callback Error Detail:', error.message);
        console.error('❌ Stack Trace:', error.stack);
        res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};

/**
 * Handle Manual Transaction Verification
 */
exports.submitManualVerification = async (req, res) => {
    try {
        const { phoneNumber, transactionId, amount, eventId, eventName, name } = req.body;

        if (!transactionId || !phoneNumber) {
            return res.status(400).json({ error: 'Missing transaction ID or phone number' });
        }

        const ticketId = generateTicketId();

        const bookingData = {
            mpesaReceiptNumber: transactionId.toUpperCase(),
            phoneNumber,
            userName: name,
            amount: parseFloat(amount),
            eventId,
            eventName,
            ticketId,
            status: 'PENDING_VERIFICATION',
            timestamp: new Date().toISOString(),
            method: 'MANUAL_POCHI'
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
            console.log(`📥 Manual verification submitted: ${transactionId} by ${phoneNumber}`);
        } else {
            console.log('⚠️ db not configured. Mock booking:', bookingData);
        }

        const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254794173314';
        const adminMsg = `🔔 New Manual Payment!\nName: ${name}\nPhone: ${phoneNumber}\nAmount: ${amount}\nCode: ${transactionId}\nTicket: ${ticketId}\nVerify then approve in dashboard.`;

        try {
            await sendSMS(ADMIN_PHONE, adminMsg);
        } catch (s) {
            console.log('Admin SMS notify failed');
        }

        res.json({
            message: 'Verification submitted successfully',
            status: 'pending',
            ticketId: ticketId
        });

    } catch (error) {
        console.error('❌ Manual Verify Error:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
};
