const { generateTicketId } = require('../utils/ticketGen');
const { sendSMS } = require('../utils/sms');
const { sendTicketEmail, sendAdminEmail } = require('../utils/email');
const { db } = require('../config/firebase');
const { makeOpenApiRequest, generateConversationId } = require('../config/mpesa');

// Admin Config for Notifications
const ADMIN_PHONE = process.env.ADMIN_PHONE || '0794173314';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'judithoyoo64@gmail.com';

// Tier Prices mapping
const TIER_PRICES = {
    'Normal': 200,
    'VIP': 500,
    'VVIP': 1000
};

exports.processManualPayment = async (req, res) => {
    try {
        const { mpesaCode, phoneNumber, name, email, eventName, amount, tierName } = req.body;

        console.log('📥 Manual Payment Request:', { mpesaCode, phoneNumber, name, amount, tierName });

        // 1. Validate M-Pesa Code Format
        const codePattern = /^[A-Z0-9]{10}$/i;
        if (!mpesaCode || !codePattern.test(mpesaCode)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid M-Pesa Code format. It should be 10 characters (e.g., SDE23ABCDE)'
            });
        }

        // 2. Strict Amount Validation
        const expectedPrice = TIER_PRICES[tierName] || 200;
        if (parseFloat(amount) < expectedPrice) {
            return res.status(400).json({
                success: false,
                message: `Insufficient amount for ${tierName}. Expected KES ${expectedPrice}, but found KES ${amount}.`
            });
        }

        // 3. Parallelize Checks: Duplicate Detection, API Verification, and Tier Count
        const safeTierName = tierName || 'Normal';
        const mpesaRef = mpesaCode.toUpperCase();

        console.log(`⚡ Parallelizing checks for ${mpesaRef}...`);

        const [duplicateCheck, apiVerify, tierCount] = await Promise.all([
            // A) Check for duplicates
            db ? db.collection('bookings').where('mpesaCode', '==', mpesaRef).limit(1).get() : Promise.resolve({ empty: true }),

            // B) Verify with Safaricom API (non-blocking if it fails or is slow)
            (async () => {
                try {
                    return await makeOpenApiRequest('/queryTransactionStatus/', {
                        input_QueryReference: mpesaRef,
                        input_ServiceProviderCode: process.env.MPESA_SP_CODE,
                        input_ThirdPartyConversationID: generateConversationId(),
                        input_Country: 'KEN'
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
            return res.status(400).json({ success: false, message: 'This M-Pesa code has already been used!' });
        }

        // 2. Validate API Result (Strict in production)
        if (process.env.MPESA_ENV === 'production' && apiVerify.output_ResponseCode !== 'INS-0') {
            return res.status(400).json({
                success: false,
                message: 'Invalid M-Pesa code: Transaction not found in Safaricom records.'
            });
        }

        // 3. Final Count
        const count = (tierCount.size || 0) + 1;

        // 4. Generate Ticket
        const ticketId = generateTicketId(safeTierName, count);
        const timestamp = new Date().toISOString();

        // 5. Save Booking
        const bookingData = {
            mpesaCode: mpesaCode.toUpperCase(),
            method: 'MANUAL_MPESA',
            status: 'CONFIRMED', // Changed to Auto-Approve
            name,
            email,
            phoneNumber,
            eventName,
            amount,
            tierName,
            ticketId,
            timestamp
        };

        let savedId = null;
        if (db) {
            const docRef = await db.collection('bookings').add(bookingData);
            savedId = docRef.id;
        }

        // 6. Format phone numbers
        let formattedUserPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (formattedUserPhone.startsWith('0')) formattedUserPhone = '254' + formattedUserPhone.substring(1);
        if (!formattedUserPhone.startsWith('254')) formattedUserPhone = '254' + formattedUserPhone;

        const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';

        // 7. Send Notifications (Immediate Delivery)
        const ticketMsg = `✅ Your Ticket for ${eventName} is CONFIRMED!\n🎫 Ticket: ${ticketId}\n📍 Location: Marine Park\n🗺 Direction: ${googleMapsLink}\n\nSee you there!`;

        try {
            console.log('📤 Sending parallel notifications...');
            const notifications = [];

            // 1. To User (SMS)
            notifications.push(sendSMS(formattedUserPhone, ticketMsg));

            // 2. To User (Email)
            if (email) {
                notifications.push(sendTicketEmail({
                    email,
                    name,
                    ticketId,
                    eventName,
                    mpesaCode: mpesaCode.toUpperCase(),
                    amount,
                    tierName
                }));
            }

            // 3. To Admin (SMS & Email)
            const adminMsg = `💰 New Payment Auto-Approved!\nCode: ${mpesaCode.toUpperCase()}\nUser: ${name} (${phoneNumber})\nAmt: KES ${amount}`;
            notifications.push(sendSMS(ADMIN_PHONE, adminMsg));
            notifications.push(sendAdminEmail('💰 New Payment Auto-Approved', `<p><strong>Manual Payment Auto-Approved!</strong></p><p><strong>Code:</strong> ${mpesaCode.toUpperCase()}</p><p><strong>User:</strong> ${name} (${phoneNumber})</p><p><strong>Amount:</strong> KES ${amount}</p>`));

            // Execute all notifications and WAIT for them (to prevent Vercel killing the process)
            const results = await Promise.allSettled(notifications);

            const failed = results.filter(r => r.status === 'rejected' || (r.value && r.value.status === 'failed'));
            if (failed.length > 0) console.warn(`⚠️ Some notifications failed: ${failed.length}`);
            else console.log('✅ All notifications sent successfully');

        } catch (error) {
            console.error('⚠️ Notification error:', error.message);
        }

        // 8. Success Response
        res.json({
            success: true,
            message: 'Payment details submitted for verification!',
            bookingId: savedId,
            ticketId: ticketId
        });

    } catch (error) {
        console.error('Manual Payment Error:', error);
        res.status(500).json({ success: false, message: 'Server error processing payment.' });
    }
};
