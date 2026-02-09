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

        // 3. Duplicate Detection
        if (db) {
            const existing = await db.collection('bookings')
                .where('mpesaCode', '==', mpesaCode.toUpperCase())
                .limit(1)
                .get();

            if (!existing.empty) {
                return res.status(400).json({
                    success: false,
                    message: 'This M-Pesa code has already been used to claim a ticket!'
                });
            }
        }

        // 2. Validate phone number
        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        // 4. Real M-Pesa Code Verification via API
        // Try to query the transaction status to ensure it's real
        try {
            console.log(`🔍 Verifying real-time status for: ${mpesaCode}`);
            const apiVerify = await makeOpenApiRequest('/queryTransactionStatus/', {
                input_QueryReference: mpesaCode.toUpperCase(),
                input_ServiceProviderCode: process.env.MPESA_SP_CODE,
                input_ThirdPartyConversationID: generateConversationId(),
                input_Country: 'KEN'
            });

            if (apiVerify.output_ResponseCode !== 'INS-0') {
                console.warn('⚠️ M-Pesa API could not verify code:', apiVerify.output_ResponseDesc);
                // In sandbox, we might allow it if API fails but format is correct,
                // but in production, we should strictly fail if code is not found.
                if (process.env.MPESA_ENV === 'production') {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid M-Pesa code: Transaction not found or failed in Safaricom records.'
                    });
                }
            } else {
                console.log('✅ M-Pesa API confirmed code is REAL.');
            }
        } catch (apiError) {
            console.error('⚠️ M-Pesa API Verification Error:', apiError.message);
            // Don't crash if API is down, but log it.
        }

        // 5. Query Tier Count for Sequential Numbering
        const safeTierName = tierName || 'Normal';
        let count = 1;
        if (db) {
            try {
                const snapshot = await db.collection('bookings')
                    .where('tierName', '==', safeTierName)
                    .get();
                count = snapshot.size + 1;
            } catch (dbError) {
                console.error('⚠️ DB Count Error:', dbError.message);
                // Fallback to 1 if DB fails
                count = 1;
            }
        }

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
            // A) To User
            await sendSMS(formattedUserPhone, ticketMsg);

            if (email) {
                await sendTicketEmail({
                    email,
                    name,
                    ticketId,
                    eventName,
                    mpesaCode: mpesaCode.toUpperCase(),
                    amount,
                    tierName
                });
            }

            // B) To Admin
            const adminMsg = `💰 New Payment Auto-Approved!\nCode: ${mpesaCode.toUpperCase()}\nUser: ${name} (${phoneNumber})\nAmt: KES ${amount}`;
            await sendSMS(ADMIN_PHONE, adminMsg);
            await sendAdminEmail('💰 New Payment Auto-Approved', `<p><strong>Manual Payment Auto-Approved!</strong></p><p><strong>Code:</strong> ${mpesaCode.toUpperCase()}</p><p><strong>User:</strong> ${name} (${phoneNumber})</p><p><strong>Amount:</strong> KES ${amount}</p>`);

            console.log('✅ Auto-approval notifications sent');
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
