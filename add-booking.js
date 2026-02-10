// Script to add a missing booking to Firebase
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase with local service account
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-grey-pegeant'
});

const db = admin.firestore();

async function addMissingBooking() {
    const booking = {
        name: 'Renos Kimeto',
        phoneNumber: '254727037692',
        email: '',
        tierName: 'Normal',
        amount: 200,
        mpesaCode: 'UB97161VYD',
        ticketId: 'NRM-001',
        status: 'CONFIRMED',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        notes: 'Manually added - booking made before DB was connected'
    };

    try {
        const docRef = await db.collection('bookings').add(booking);
        console.log('✅ Booking added successfully!');
        console.log('📄 Document ID:', docRef.id);
        console.log('🎫 Ticket ID:', booking.ticketId);
        console.log('👤 Customer:', booking.name);
        console.log('📱 Phone:', booking.phoneNumber);
        console.log('💰 Amount: KES', booking.amount);
        console.log('🏷️ M-Pesa Code:', booking.mpesaCode);
    } catch (error) {
        console.error('❌ Error adding booking:', error.message);
    }

    process.exit(0);
}

addMissingBooking();
