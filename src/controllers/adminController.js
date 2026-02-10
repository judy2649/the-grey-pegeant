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
            console.warn('⚠️ DB not connected. Returning MOCK stats for testing.');
            return res.json({
                success: true,
                stats: {
                    totalTickets: 15,
                    totalRevenue: 25000,
                    pendingCount: 2,
                    byTier: { 'Normal': 10, 'VIP': 4, 'VVIP': 1 },
                    byStatus: { 'CONFIRMED': 13, 'PENDING': 2 },
                    salesTrend: {
                        [new Date().toISOString().split('T')[0]]: 5,
                        [new Date(Date.now() - 86400000).toISOString().split('T')[0]]: 8
                    },
                    note: 'MOCK DATA (DB Disconnected)'
                }
            });
        }

        const snapshot = await db.collection('bookings').get();
        const bookings = [];
        snapshot.forEach(doc => bookings.push(doc.data()));

        const stats = {
            totalTickets: bookings.length,
            totalRevenue: bookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0),
            pendingCount: bookings.filter(b => (b.status || '').toLowerCase() === 'pending').length,
            byTier: {},
            byStatus: {},
            salesTrend: {}
        };

        bookings.forEach(b => {
            const tier = b.tierName || 'Unknown';
            const status = b.status || 'Unknown';
            const date = b.timestamp ? b.timestamp.split('T')[0] : 'Unknown';

            stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            stats.salesTrend[date] = (stats.salesTrend[date] || 0) + 1;
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
            return res.json({
                success: true,
                bookings: [
                    { id: 'mock1', name: 'John Doe', phoneNumber: '254712345678', email: 'john@example.com', tierName: 'VIP', ticketId: 'VIP-001', status: 'CONFIRMED', amount: 2000, timestamp: new Date().toISOString() },
                    { id: 'mock2', name: 'Jane Smith', phoneNumber: '254722111222', email: 'jane@example.com', tierName: 'Normal', ticketId: 'NRM-042', status: 'PENDING', amount: 1000, timestamp: new Date().toISOString() },
                    { id: 'mock3', name: 'Bob Wilson', phoneNumber: '254733444555', email: 'bob@example.com', tierName: 'VVIP', ticketId: 'VVP-007', status: 'PENDING', amount: 5000, timestamp: new Date(Date.now() - 86400000).toISOString() }
                ],
                note: 'MOCK DATA (DB Disconnected)'
            });
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

        if (!db) {
            console.log(`[MOCK] Verified payment for ${bookingId}`);
            return res.json({
                success: true,
                message: 'Payment verified (MOCK MODE)',
                notifications: { sms: 'queued', email: 'queued' }
            });
        }

        const bookingRef = db.collection('bookings').doc(bookingId);
        const doc = await bookingRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const bookingData = doc.data();

        // 0. Global Capacity Check (600 max)
        const globalSnapshot = await db.collection('bookings')
            .where('status', 'in', ['PAID', 'CONFIRMED', 'VERIFIED'])
            .get();

        if (globalSnapshot.size >= 600) {
            return res.status(400).json({
                success: false,
                message: 'Capacity reached (600 tickets). Cannot verify more bookings.'
            });
        }

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

        if (!db) {
            console.log(`[MOCK] Resending ticket for ${bookingId}`);
            return res.json({ success: true, message: 'Ticket resent successfully (MOCK MODE)!' });
        }

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

// 11. Seed Booking (Admin Only - for missing bookings)
exports.seedBooking = async (req, res) => {
    try {
        const { name, phoneNumber, email, tierName, amount, mpesaCode, ticketId, status } = req.body;

        if (!db) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }

        const booking = {
            name: name || 'Unknown',
            phoneNumber: phoneNumber || '',
            email: email || '',
            tierName: tierName || 'Normal',
            amount: amount || 200,
            mpesaCode: mpesaCode || '',
            ticketId: ticketId || 'NRM-001',
            status: status || 'CONFIRMED',
            timestamp: new Date().toISOString(),
            notes: 'Manually seeded via admin API'
        };

        const docRef = await db.collection('bookings').add(booking);

        res.json({
            success: true,
            message: 'Booking added successfully!',
            bookingId: docRef.id,
            booking
        });

    } catch (error) {
        console.error('Seed Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 12. Delete Booking (Admin Only - for duplicates)
exports.deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!db) {
            return res.status(500).json({ success: false, message: 'Database not connected' });
        }

        await db.collection('bookings').doc(bookingId).delete();

        res.json({ success: true, message: 'Booking deleted successfully!' });

    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
