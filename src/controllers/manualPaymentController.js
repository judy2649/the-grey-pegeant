const { generateTicketId } = require('../utils/ticketGen');
const { sendSMS } = require('../utils/sms');
const { db } = require('../config/firebase');

// Admin Phone for Notifications
const ADMIN_PHONE = '0794173314'; // Target admin for notifications

exports.processManualPayment = async (req, res) => {
    try {
        const { mpesaCode, phoneNumber, name, email, eventName, amount, tierName } = req.body;

        // 1. Validate M-Pesa Code Format (Simple Regex: 10 chars, typically alphanumeric)
        // Example: SDE23...
        const codePattern = /^[A-Z0-9]{10}$/i;
        if (!mpesaCode || !codePattern.test(mpesaCode)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid M-Pesa Code format. It should be 10 characters (e.g., SDE23...)'
            });
        }

        // 2. Check for Duplicate Code (if DB is connected)
        if (db) {
            const existing = await db.collection('bookings').where('mpesaCode', '==', mpesaCode).get();
            if (!existing.empty) {
                return res.status(400).json({
                    success: false,
                    message: 'This M-Pesa code has already been used!'
                });
            }
        }

        // 3. Generate Ticket
        const ticketId = generateTicketId();
        const timestamp = new Date().toISOString();

        // 4. Save Booking
        const bookingData = {
            mpesaCode: mpesaCode.toUpperCase(),
            method: 'MANUAL_MPESA',
            status: 'PENDING_ADMIN_VERIFICATION', // Admin can confirm properly later if needed
            name,
            email,
            phoneNumber,
            eventName,
            amount,
            tierName,
            ticketId,
            timestamp
        };

        if (db) {
            await db.collection('bookings').add(bookingData);
        }

        // 5. Send Notifications

        // A) To User (Ticket Info)
        const userMsg = `✅ Ticket Confirmed!\nRef: ${mpesaCode.toUpperCase()}\nTicket No: ${ticketId}\nEvent: ${eventName}\nAmt: KES ${amount}\n\nPlease keep this message for entry.`;
        if (phoneNumber) await sendSMS(phoneNumber, userMsg);

        // B) To Admin (Notification of Payment)
        const adminMsg = `💰 New Payment Received!\nCode: ${mpesaCode.toUpperCase()}\nUser: ${name} (${phoneNumber})\nAmt: KES ${amount}\nTicket: ${ticketId}`;
        await sendSMS(ADMIN_PHONE, adminMsg);

        // Success Response
        res.json({
            success: true,
            message: 'Payment recorded successfully!',
            ticketId: ticketId
        });

    } catch (error) {
        console.error('Manual Payment Error:', error);
        res.status(500).json({ success: false, message: 'Server error processing payment.' });
    }
};
