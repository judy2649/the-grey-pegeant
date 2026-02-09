const axios = require('axios');
const {
    MPESA_CONFIG,
    generateBearerToken,
    generateTransactionRef,
    generateConversationId,
    formatPhoneNumber,
    makeOpenApiRequest
} = require('../config/mpesa');
const { db } = require('../config/firebase');
const { sendSMS } = require('../utils/sms');
const { sendTicketEmail, sendAdminEmail } = require('../utils/email');
const { generateTicketId } = require('../utils/ticketGen');

/**
 * Initiate C2B Single Stage Payment (STK Push equivalent)
 * Using M-Pesa Open API for Kenya
 */
exports.initiateSTKPush = async (req, res) => {
    try {
        const { phoneNumber, amount, eventId, eventName, tierName, name, email } = req.body;

        if (!phoneNumber || !amount || !eventId) {
            return res.status(400).json({ error: 'Missing phone number, amount, or event ID' });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        const transactionRef = generateTransactionRef();
        const conversationId = generateConversationId();

        console.log(`📱 Initiating C2B payment for ${formattedPhone}, Amount: ${amount} KES`);

        // C2B Single Stage Payment Payload
        const payload = {
            input_Amount: amount.toString(),
            input_Country: MPESA_CONFIG.country,
            input_Currency: MPESA_CONFIG.currency,
            input_CustomerMSISDN: formattedPhone,
            input_ServiceProviderCode: MPESA_CONFIG.serviceProviderCode,
            input_ThirdPartyConversationID: conversationId,
            input_TransactionReference: transactionRef,
            input_PurchasedItemsDesc: `Ticket: ${eventName || 'Event'} - ${tierName || 'Standard'}`
        };

        console.log('📤 Sending C2B request to M-Pesa Open API...');

        const response = await makeOpenApiRequest('/c2bPayment/singleStage/', payload);

        console.log('✅ M-Pesa Open API Response:', JSON.stringify(response));

        // Store pending transaction for callback matching
        const pendingTransaction = {
            conversationId,
            transactionRef,
            phoneNumber: formattedPhone,
            amount,
            eventId,
            eventName: eventName || 'The Grey Pageant',
            tierName: tierName || 'Standard',
            userName: name || 'Guest',
            email: email || '',
            status: 'PENDING',
            timestamp: new Date().toISOString()
        };

        if (db) {
            await db.collection('pending_transactions').doc(conversationId).set(pendingTransaction);
            console.log('💾 Pending transaction saved');
        }

        // Check response code
        if (response.output_ResponseCode === 'INS-0') {
            res.json({
                success: true,
                message: 'Payment initiated successfully. Check your phone for M-Pesa prompt.',
                conversationId: response.output_ConversationID,
                transactionId: response.output_TransactionID,
                responseCode: response.output_ResponseCode,
                responseDesc: response.output_ResponseDesc
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.output_ResponseDesc || 'Payment initiation failed',
                responseCode: response.output_ResponseCode
            });
        }

    } catch (error) {
        const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('❌ C2B Payment Error:', errorDetail);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate M-Pesa payment',
            detail: errorDetail
        });
    }
};

/**
 * Handle M-Pesa Open API Callback
 * Receives payment confirmation from M-Pesa
 */
exports.handleCallback = async (req, res) => {
    try {
        console.log('🔔 M-Pesa Open API Callback Received:', JSON.stringify(req.body, null, 2));

        const callback = req.body;

        // Open API callback structure
        const conversationId = callback.output_ConversationID;
        const transactionId = callback.output_TransactionID;
        const responseCode = callback.output_ResponseCode;
        const responseDesc = callback.output_ResponseDesc;

        // Check if payment was successful
        if (responseCode !== 'INS-0') {
            console.log('❌ Payment Failed:', responseDesc);

            // Update pending transaction if exists
            if (db && conversationId) {
                await db.collection('pending_transactions').doc(conversationId).update({
                    status: 'FAILED',
                    failureReason: responseDesc,
                    updatedAt: new Date().toISOString()
                });
            }

            return res.json({ result: 'fail', reason: responseDesc });
        }

        // Payment successful - retrieve pending transaction
        let pendingTxn = null;
        if (db && conversationId) {
            const doc = await db.collection('pending_transactions').doc(conversationId).get();
            if (doc.exists) {
                pendingTxn = doc.data();
            }
        }

        const tierName = pendingTxn?.tierName || 'Normal';
        let count = 1;
        if (db) {
            const snapshot = await db.collection('bookings')
                .where('tierName', '==', tierName)
                .where('status', 'in', ['PAID', 'CONFIRMED', 'VERIFIED'])
                .get();
            count = snapshot.size + 1;
        }
        const ticketId = generateTicketId(tierName, count);
        const eventName = pendingTxn?.eventName || 'The Grey Pageant';
        const phoneNumber = pendingTxn?.phoneNumber || callback.input_CustomerMSISDN;
        const amount = pendingTxn?.amount || callback.input_Amount;
        const email = pendingTxn?.email || '';
        const name = pendingTxn?.userName || 'Guest';

        console.log(`✅ Payment Success! Transaction: ${transactionId}, Amount: ${amount} KES`);

        const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';

        // Create booking record
        const bookingData = {
            mpesaTransactionId: transactionId,
            conversationId,
            phoneNumber,
            amount,
            email,
            eventId: pendingTxn?.eventId || 'evt_grey_pageant',
            eventName,
            tierName: pendingTxn?.tierName || 'Standard',
            userName: name,
            ticketId,
            status: 'PAID',
            paymentMethod: 'MPESA_OPEN_API',
            timestamp: new Date().toISOString()
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
            console.log('💾 Booking saved to Firestore');

            // Update pending transaction status
            await db.collection('pending_transactions').doc(conversationId).update({
                status: 'COMPLETED',
                ticketId,
                completedAt: new Date().toISOString()
            });
        }

        // Send SMS notifications
        const userMessage = `✅ Payment Confirmed!\n🎫 Ticket: ${ticketId}\nEvent: ${eventName}\nAmt: KES ${amount}\n📍 Location: Marine Park\n🗺 Direction: ${googleMapsLink}\nRef: ${transactionId}\n\nSee you there!`;
        const adminMessage = `🔔 New Booking!\nEvent: ${eventName}\nTicket: ${ticketId}\nRef: ${transactionId}\nUser: ${phoneNumber}\nAmount: KES ${amount}`;
        const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254794173314';

        try {
            console.log('📤 Sending parallel notifications...');
            const notifications = [];

            // 1. To User (SMS)
            notifications.push(sendSMS(phoneNumber, userMessage));

            // 2. To Admin (SMS)
            notifications.push(sendSMS(ADMIN_PHONE, adminMessage));

            // 3. To Admin (Email)
            notifications.push(sendAdminEmail('🔔 New M-Pesa Booking', `<p><strong>New Booking Confirmed!</strong></p><p><strong>Event:</strong> ${eventName}</p><p><strong>Ticket:</strong> ${ticketId}</p><p><strong>User:</strong> ${phoneNumber}</p><p><strong>Amount:</strong> KES ${amount}</p><p><strong>Ref:</strong> ${transactionId}</p>`));

            // 4. To User (Email)
            if (email) {
                notifications.push(sendTicketEmail({
                    email,
                    name,
                    ticketId,
                    eventName,
                    mpesaCode: transactionId,
                    amount,
                    tierName: bookingData.tierName
                }));
            }

            // Execute all notifications and WAIT for them (to prevent Vercel killing the process)
            await Promise.allSettled(notifications);
            console.log('✅ All callback notifications processed');

        } catch (notifyError) {
            console.error('⚠️ Notification error in callback:', notifyError.message);
        }

        res.json({ result: 'success', ticketId });

    } catch (error) {
        console.error('❌ Callback Error:', error.message);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};

/**
 * Query Transaction Status
 */
exports.queryTransactionStatus = async (req, res) => {
    try {
        const { conversationId, transactionId } = req.body;

        if (!conversationId && !transactionId) {
            return res.status(400).json({ error: 'Missing conversationId or transactionId' });
        }

        const payload = {
            input_QueryReference: transactionId || conversationId,
            input_ServiceProviderCode: MPESA_CONFIG.serviceProviderCode,
            input_ThirdPartyConversationID: generateConversationId(),
            input_Country: MPESA_CONFIG.country
        };

        const response = await makeOpenApiRequest('/queryTransactionStatus/', payload);

        res.json({
            success: true,
            status: response.output_ResponseCode === 'INS-0' ? 'completed' : 'pending',
            data: response
        });

    } catch (error) {
        console.error('❌ Transaction Query Error:', error.message);
        res.status(500).json({ error: 'Failed to query transaction status' });
    }
};

/**
 * Handle Manual Transaction Verification
 */
exports.submitManualVerification = async (req, res) => {
    try {
        const { phoneNumber, transactionId, amount, eventId, eventName, name, email } = req.body;

        if (!transactionId || !phoneNumber) {
            return res.status(400).json({ error: 'Missing transaction ID or phone number' });
        }

        // 1. Parallelize Checks: Duplicate Detection, API Verification, and Tier Count
        const mpesaRef = transactionId.toUpperCase();
        const safeTierName = amount >= 1000 ? 'VVIP' : (amount >= 500 ? 'VIP' : 'Normal');

        console.log(`⚡ Parallelizing checks for ${mpesaRef}...`);

        const [duplicateCheck, apiVerify, tierCount] = await Promise.all([
            // A) Check for duplicates
            db ? db.collection('bookings').where('mpesaTransactionId', '==', mpesaRef).limit(1).get() : Promise.resolve({ empty: true }),

            // B) Verify with Safaricom API
            (async () => {
                try {
                    return await makeOpenApiRequest('/queryTransactionStatus/', {
                        input_QueryReference: mpesaRef,
                        input_ServiceProviderCode: MPESA_CONFIG.serviceProviderCode,
                        input_ThirdPartyConversationID: generateConversationId(),
                        input_Country: MPESA_CONFIG.country
                    });
                } catch (e) {
                    console.error('⚠️ Safaricom API error:', e.message);
                    return { error: true };
                }
            })(),

            // C) Count bookings for sequential numbering
            db ? db.collection('bookings').where('tierName', '==', safeTierName).get() : Promise.resolve({ size: 0 })
        ]);

        // --- Post-Check Validation ---

        // 1. Validate Duplicate
        if (!duplicateCheck.empty) {
            return res.status(400).json({ error: 'This M-Pesa code has already been used!' });
        }

        // 2. Validate API Result (Strict in production)
        if (process.env.MPESA_ENV === 'production' && apiVerify.output_ResponseCode !== 'INS-0') {
            return res.status(400).json({ error: 'Invalid M-Pesa code: Transaction not found in Safaricom records.' });
        }

        const count = (tierCount.size || 0) + 1;
        const ticketId = generateTicketId(safeTierName, count);
        const formattedPhone = formatPhoneNumber(phoneNumber);

        const bookingData = {
            mpesaTransactionId: transactionId.toUpperCase(),
            phoneNumber: formattedPhone,
            userName: name,
            email: email || '',
            amount: parseFloat(amount),
            eventId,
            eventName,
            ticketId,
            status: 'PAID', // Auto-approved
            timestamp: new Date().toISOString(),
            method: 'MANUAL_VERIFICATION'
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
            console.log(`✅ Manual verification auto-approved: ${transactionId}`);
        }

        const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';
        const ticketMsg = `✅ Your Ticket for ${eventName} is CONFIRMED!\n🎫 Ticket: ${ticketId}\n📍 Location: Marine Park\n🗺 Direction: ${googleMapsLink}\n\nSee you there!`;

        try {
            console.log('📤 Sending parallel notifications...');
            const notifications = [];

            // 1. To User (SMS)
            notifications.push(sendSMS(formattedPhone, ticketMsg));

            // 2. To User (Email)
            if (email) {
                notifications.push(sendTicketEmail({
                    email,
                    name,
                    ticketId,
                    eventName,
                    mpesaCode: transactionId.toUpperCase(),
                    amount,
                    tierName: 'Confirmed'
                }));
            }

            // 3. To Admin (SMS & Email)
            const ADMIN_PHONE = process.env.ADMIN_PHONE || '0794173314';
            const adminMsg = `🔔 New Manual Payment Auto-Approved!\nCode: ${transactionId}\nUser: ${name} (${formattedPhone})\nAmt: KES ${amount}`;
            notifications.push(sendSMS(ADMIN_PHONE, adminMsg));
            notifications.push(sendAdminEmail('🔔 Manual Payment Auto-Approved', `<p><strong>Manual Payment Auto-Approved!</strong></p><p><strong>Code:</strong> ${transactionId}</p><p><strong>User:</strong> ${name} (${formattedPhone})</p><p><strong>Amount:</strong> KES ${amount}</p>`));

            // Execute all notifications and WAIT for them (to prevent Vercel killing the process)
            await Promise.allSettled(notifications);
            console.log('✅ All manual verification notifications sent successfully');

        } catch (error) {
            console.error('⚠️ Notification error:', error.message);
        }

        res.json({
            success: true,
            message: 'Everything is Set! Your ticket has been sent via SMS and Email.',
            status: 'confirmed',
            ticketId: ticketId
        });

    } catch (error) {
        console.error('❌ Manual Verify Error:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
};
