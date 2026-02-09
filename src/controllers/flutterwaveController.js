const axios = require('axios');
const dotenv = require('dotenv');
const { generateTicketId } = require('../utils/ticketGen');
const { sendSMS } = require('../utils/sms');
const { sendTicketEmail, sendAdminEmail } = require('../utils/email');
const { db } = require('../config/firebase');

dotenv.config();

/**
 * Verify Transaction after successful payment on frontend
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { transactionId, status, flwRef, amount, currency, customer, eventName, ticketDetails } = req.body;

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

            const tierName = ticketDetails?.tierName || 'Standard';
            let count = 1;
            if (db) {
                const snapshot = await db.collection('bookings')
                    .where('tierName', '==', tierName)
                    .get();
                count = snapshot.size + 1;
            }
            const ticketId = generateTicketId(tierName, count);
            const timestamp = new Date().toISOString();
            const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';

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
                eventName: eventName || 'The Grey Pageant',
                tierName: ticketDetails?.tierName || 'Standard',
                ticketId,
                status: 'PAID',
                timestamp
            };

            if (db) {
                await db.collection('bookings').add(bookingData);
            }

            // Send Notifications
            const userMessage = `✅ Payment Confirmed!\n🎫 Ticket: ${ticketId}\nEvent: ${eventName}\nAmt: ${currency} ${amount}\n📍 Location: Marine Park\n🗺 Direction: ${googleMapsLink}\n\nSee you there!`;
            const adminMessage = `🔔 New Flutterwave Payment!\nAmount: ${currency} ${amount}\nUser: ${customer.name} (${customer.phone})`;
            const ADMIN_PHONE = process.env.ADMIN_PHONE || '+254794173314';

            // Send SMS
            if (customer.phone) await sendSMS(customer.phone, userMessage);
            await sendSMS(ADMIN_PHONE, adminMessage);
            await sendAdminEmail('🔔 New Flutterwave Payment', `<p><strong>Success!</strong></p><p><strong>Amount:</strong> ${currency} ${amount}</p><p><strong>User:</strong> ${customer.name} (${customer.phone})</p><p><strong>Event:</strong> ${eventName}</p><p><strong>Ticket:</strong> ${ticketId}</p>`);

            // Send Email
            if (customer.email) {
                await sendTicketEmail({
                    email: customer.email,
                    name: customer.name,
                    ticketId,
                    eventName: eventName || 'The Grey Pageant',
                    mpesaCode: transactionId,
                    amount: verifiedData.amount,
                    tierName: bookingData.tierName
                });
            }

            res.json({
                status: 'success',
                message: 'Payment verified and ticket generated.',
                ticketId: ticketId
            });

        } else {
            res.status(400).json({ status: 'failed', message: 'Payment verification failed.' });
        }

    } catch (error) {
        console.error('Flutterwave Verification Error:', error.message);
        res.status(500).json({ error: 'Verification failed' });
    }
};
