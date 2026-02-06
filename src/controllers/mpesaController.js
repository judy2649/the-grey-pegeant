const axios = require('axios');
const { getAccessToken, getStkPassword, getTimestamp } = require('../config/mpesa');
const { db } = require('../config/firebase');
const { sendSMS } = require('../utils/sms');
const { generateTicketId } = require('../utils/ticketGen');

// In-memory store to track payment statuses by checkoutRequestID
// In production, use Redis or a database
const paymentTracker = {};

/**
 * Initiate STK Push
 */
exports.initiateSTKPush = async (req, res) => {
    try {
        const { phoneNumber, amount, eventId, eventName, name } = req.body;

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

        const transactionType = process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline';
        const businessShortCode = process.env.MPESA_SHORTCODE;
        const partyB = transactionType === 'CustomerBuyGoodsOnline'
            ? (process.env.MPESA_TILL_NUMBER || businessShortCode)
            : businessShortCode;

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

        const checkoutRequestID = response.data.CheckoutRequestID;

        // Track the payment with metadata for later use in the callback
        paymentTracker[checkoutRequestID] = {
            status: 'PENDING',
            phoneNumber: formattedPhone,
            originalPhone: phoneNumber,
            amount,
            eventId,
            eventName: eventName || 'The Grey Pageant',
            name: name || '',
            timestamp: new Date().toISOString()
        };

        console.log(`STK Push initiated for ${formattedPhone}. CheckoutRequestID: ${checkoutRequestID}`);

        res.json({
            message: 'STK Push initiated successfully. Check your phone.',
            checkoutRequestID: checkoutRequestID,
            responseCode: response.data.ResponseCode
        });

    } catch (error) {
        console.error('STK Push Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to initiate M-Pesa payment. Please try again.' });
    }
};

/**
 * Handle M-Pesa Callback
 */
exports.handleCallback = async (req, res) => {
    try {
        console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

        const callbackSecret = req.headers['x-callback-secret'];
        const expectedSecret = process.env.MPESA_CALLBACK_SECRET;

        if (expectedSecret && callbackSecret !== expectedSecret) {
            console.error('Invalid callback secret. Possible fake payment attempt!');
            return res.status(403).json({ error: 'Forbidden' });
        }

        const body = req.body.Body.stkCallback;
        const checkoutRequestID = body.CheckoutRequestID;

        if (body.ResultCode !== 0) {
            console.log('Payment Cancelled or Failed:', body.ResultDesc);
            // Update tracker
            if (paymentTracker[checkoutRequestID]) {
                paymentTracker[checkoutRequestID].status = 'FAILED';
                paymentTracker[checkoutRequestID].reason = body.ResultDesc;
            }
            return res.json({ result: 'fail' });
        }

        const meta = body.CallbackMetadata.Item;
        function getValue(name) {
            return meta.find(o => o.Name === name)?.Value;
        }

        const amount = getValue('Amount');
        const mpesaReceiptNumber = getValue('MpesaReceiptNumber');
        const phoneNumber = getValue('PhoneNumber');

        // Get metadata from tracker
        const tracked = paymentTracker[checkoutRequestID] || {};
        const eventId = tracked.eventId || 'evt_grey_pageant';
        const eventName = tracked.eventName || 'The Grey Pageant';

        const ticketId = generateTicketId();

        console.log(`Payment Success! Receipt: ${mpesaReceiptNumber}, Amount: ${amount}`);

        const bookingData = {
            mpesaReceiptNumber,
            phoneNumber,
            userName: tracked.name || '',
            amount,
            eventId,
            eventName,
            ticketId,
            status: 'PAID',
            timestamp: new Date().toISOString()
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
            console.log('Booking saved to Firestore');
        } else {
            console.log('Firestore not configured. Booking data (Mock):', bookingData);
        }

        // Update payment tracker so the frontend poll gets the result
        if (paymentTracker[checkoutRequestID]) {
            paymentTracker[checkoutRequestID].status = 'PAID';
            paymentTracker[checkoutRequestID].ticketId = ticketId;
            paymentTracker[checkoutRequestID].mpesaReceiptNumber = mpesaReceiptNumber;
        }

        // Format phone for SMS
        let smsPhone = String(phoneNumber);
        if (smsPhone.startsWith('254')) {
            smsPhone = '+' + smsPhone;
        } else if (!smsPhone.startsWith('+')) {
            smsPhone = '+' + smsPhone;
        }

        const userMessage = `Thank you for your payment! Your ticket for ${eventName} at Marine Park is confirmed.\nTicket No: ${ticketId}\nRef: ${mpesaReceiptNumber}\nSee you there!`;
        const adminMessage = `New Booking Alert!\nEvent: ${eventName}\nTicket: ${ticketId}\nRef: ${mpesaReceiptNumber}\nUser: ${smsPhone}\nAmount: ${amount}`;
        const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254712369221';

        try {
            await sendSMS(smsPhone, userMessage);
            console.log(`SMS sent to user ${smsPhone} with ticket ${ticketId}`);
        } catch (smsError) {
            console.error('Failed to send user SMS:', smsError.message);
        }

        try {
            await sendSMS(ADMIN_PHONE, adminMessage);
            console.log('Admin notification sent.');
        } catch (smsError) {
            console.error('Failed to send admin SMS:', smsError.message);
        }

        res.json({ result: 'success' });

    } catch (error) {
        console.error('Callback Error Detail:', error.message);
        console.error('Stack Trace:', error.stack);
        res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};

/**
 * Check Payment Status (polled by frontend)
 */
exports.getPaymentStatus = (req, res) => {
    const { checkoutRequestID } = req.params;
    const tracked = paymentTracker[checkoutRequestID];

    if (!tracked) {
        return res.json({ status: 'PENDING', message: 'Waiting for payment...' });
    }

    const response = {
        status: tracked.status,
        message: tracked.status === 'PAID'
            ? 'Payment confirmed!'
            : tracked.status === 'FAILED'
                ? (tracked.reason || 'Payment failed or was cancelled.')
                : 'Waiting for payment...'
    };

    if (tracked.status === 'PAID') {
        response.ticketId = tracked.ticketId;
        response.mpesaReceiptNumber = tracked.mpesaReceiptNumber;
    }

    res.json(response);
};

/**
 * Handle Manual Transaction Verification (fallback)
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
            console.log(`Manual verification submitted: ${transactionId} by ${phoneNumber}`);
        } else {
            console.log('db not configured. Mock booking:', bookingData);
        }

        // Send SMS confirmation to the user
        let formattedUserPhone = phoneNumber;
        if (formattedUserPhone.startsWith('0')) {
            formattedUserPhone = '+254' + formattedUserPhone.slice(1);
        } else if (!formattedUserPhone.startsWith('+')) {
            formattedUserPhone = '+' + formattedUserPhone;
        }

        const userMsg = `Thank you for your payment! Your ticket for ${eventName} at Marine Park is confirmed.\nTicket No: ${ticketId}\nRef: ${transactionId.toUpperCase()}\nSee you there!`;

        const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254712369221';
        const adminMsg = `New Booking!\nName: ${name}\nPhone: ${phoneNumber}\nAmount: ${amount}\nCode: ${transactionId}\nTicket: ${ticketId}\nVerify then approve in dashboard.`;

        try {
            await sendSMS(formattedUserPhone, userMsg);
            console.log(`SMS sent to user ${formattedUserPhone} with ticket ${ticketId}`);
        } catch (smsErr) {
            console.error('User SMS failed:', smsErr.message);
        }

        try {
            await sendSMS(ADMIN_PHONE, adminMsg);
        } catch (s) {
            console.log('Admin SMS notify failed');
        }

        res.json({
            message: 'Payment confirmed! Check your phone for ticket details.',
            status: 'confirmed',
            ticketId: ticketId
        });

    } catch (error) {
        console.error('Manual Verify Error:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
};
