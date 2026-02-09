const { db } = require('../config/firebase');
const { sendSMS } = require('../utils/sms');
const { sendTicketEmail, sendAdminEmail } = require('../utils/email');

/**
 * Admin Controller for Analytics and Booking Management
 */

/**
 * Get Ticket Sales Analytics
 */
exports.getAnalytics = async (req, res) => {
    try {
        if (!db) {
            console.warn('⚠️ DB not connected. Returning mock stats.');
            return res.json({
                success: true,
                stats: { totalTickets: 0, totalRevenue: 0, byTier: {}, byStatus: {}, note: 'Firebase not connected' }
            });
        }

        const snapshot = await db.collection('bookings').get();
        const bookings = [];
        snapshot.forEach(doc => bookings.push(doc.data()));

        const stats = {
            totalTickets: bookings.length,
            totalRevenue: bookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0),
            byTier: {},
            byStatus: {}
        };

        bookings.forEach(b => {
            const tier = b.tierName || 'Unknown';
            const status = b.status || 'Unknown';
            stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        });

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get All Bookings for Admin Dashboard
 */
exports.getBookings = async (req, res) => {
    try {
        if (!db) {
            return res.json({ success: true, bookings: [], note: 'DB not connected' });
        }

        const snapshot = await db.collection('bookings').orderBy('timestamp', 'desc').get();
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Get Bookings Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Verify Manual Payment (Admin Approves)
 */
exports.verifyManualPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!db) return res.status(500).json({ success: false, message: 'DB not connected' });

        const bookingRef = db.collection('bookings').doc(bookingId);
        const doc = await bookingRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const bookingData = doc.data();

        // Update status
        await bookingRef.update({
            status: 'CONFIRMED',
            verifiedAt: new Date().toISOString()
        });

        // Trigger notifications
        const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';
        const ticketMsg = `✅ Your Ticket for ${bookingData.eventName} is now VERIFIED!\n🎫 Ticket: ${bookingData.ticketId}\n📍 Location: Marine Park\n🗺 Direction: ${googleMapsLink}\n\nSee you there!`;

        let smsStatus = 'failed';
        if (bookingData.phoneNumber) {
            const smsResult = await sendSMS(bookingData.phoneNumber, ticketMsg);
            smsStatus = smsResult.status;
        }

        let emailStatus = 'failed';
        if (bookingData.email) {
            const emailResult = await sendTicketEmail({
                email: bookingData.email,
                name: bookingData.name,
                ticketId: bookingData.ticketId,
                eventName: bookingData.eventName,
                mpesaCode: bookingData.mpesaCode || bookingData.mpesaTransactionId,
                amount: bookingData.amount,
                tierName: bookingData.tierName
            });
            emailStatus = emailResult.status;
        }

        res.json({
            success: true,
            message: 'Payment verified and ticket sent!',
            notifications: { sms: smsStatus, email: emailStatus }
        });

    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Resend Ticket
 */
exports.resendTicket = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!db) return res.status(500).json({ success: false, message: 'DB not connected' });

        const doc = await db.collection('bookings').doc(bookingId).get();
        if (!doc.exists) return res.status(404).json({ success: false, message: 'Booking not found' });

        const bookingData = doc.data();
        const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';
        const ticketMsg = `🎫 RESENDING TICKET\nEvent: ${bookingData.eventName}\nTicket: ${bookingData.ticketId}\nLocation: Marine Park\nDirection: ${googleMapsLink}`;

        // Send notifications
        if (bookingData.phoneNumber) await sendSMS(bookingData.phoneNumber, ticketMsg);

        if (bookingData.email) {
            await sendTicketEmail({
                email: bookingData.email,
                name: bookingData.name,
                ticketId: bookingData.ticketId,
                eventName: bookingData.eventName,
                mpesaCode: bookingData.mpesaCode || bookingData.mpesaTransactionId,
                amount: bookingData.amount,
                tierName: bookingData.tierName
            });
        }

        res.json({ success: true, message: 'Ticket resent successfully!' });

    } catch (error) {
        console.error('Resend Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
