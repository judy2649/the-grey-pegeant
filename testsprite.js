const axios = require('axios');
require('dotenv').config();

// Get the URL from the command line argument, or use the default
const TARGET_URL = process.argv[2] || 'http://localhost:3000';
const BASE_URL = TARGET_URL.endsWith('/api') ? TARGET_URL : `${TARGET_URL}/api`;

async function runTests() {
    console.log('🚀 --- Starting Event System Integration Test ---');
    console.log(`📡 Connecting to: ${BASE_URL}`);
    console.log(`🕐 Time: ${new Date().toISOString()}`);

    // Test 1: Health Check (Get Events)
    await testGetEvents();

    // Test 2: Submit Manual Payment
    const bookingId = await testManualPayment();

    if (bookingId) {
        // Test 3: Admin Verify Payment
        await testAdminVerify(bookingId);

        // Test 4: Admin Resend Ticket
        await testAdminResend(bookingId);
    }

    // Test 5: Admin Analytics
    await testAdminAnalytics();

    console.log('\n✅ --- All Tests Completed ---');
}

async function testGetEvents() {
    console.log('\n🔹 TEST 1: Check Website Health (Get Events)');
    try {
        const response = await axios.get(`${BASE_URL}/events`);
        console.log('✅ Success! Website is loading properly.');
        console.log(`   Found ${response.data.eventCount || response.data.length} event(s).`);
    } catch (error) {
        handleError(error, 'Get Events');
    }
}

async function testManualPayment() {
    console.log('\n🔹 TEST 2: Submit Manual Payment (with Admin Notification)');

    // Generate exactly 10 character M-Pesa code
    const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
    const mpesaCode = 'SPR' + randomPart;

    const payload = {
        mpesaCode: mpesaCode,
        phoneNumber: '0727037692',
        name: 'Sprite Test Runner',
        email: 'judithoyoo64@gmail.com', // Using admin email for testing
        eventName: 'The Grey Pageant',
        amount: 500,
        tierName: 'VIP'
    };

    console.log(`\n📤 Submitting Payment: ${mpesaCode} for ${payload.name}`);

    try {
        const response = await axios.post(`${BASE_URL}/manual-pay`, payload);
        console.log('✅ Submission Successful!');
        console.log('   Response Status:', response.data.message);

        if (response.data.success && response.data.bookingId) {
            console.log(`   🆔 Booking ID: ${response.data.bookingId}`);
            return response.data.bookingId;
        }
    } catch (error) {
        handleError(error, 'Manual Payment Submission');
    }
    return null;
}

async function testAdminVerify(bookingId) {
    console.log('\n🔹 TEST 3: Admin Verify Payment');
    try {
        const response = await axios.post(`${BASE_URL}/admin/verify-payment`, { bookingId });
        console.log('✅ Verification Successful!');
        console.log('   Notifications:', JSON.stringify(response.data.notifications, null, 2));
    } catch (error) {
        handleError(error, 'Admin Payment Verification');
    }
}

async function testAdminResend(bookingId) {
    console.log('\n🔹 TEST 4: Admin Resend Ticket');
    try {
        const response = await axios.post(`${BASE_URL}/admin/resend-ticket`, { bookingId });
        console.log('✅ Resend Successful!');
        console.log('   Message:', response.data.message);
    } catch (error) {
        handleError(error, 'Admin Ticket Resend');
    }
}

async function testAdminAnalytics() {
    console.log('\n🔹 TEST 5: Admin Analytics');
    try {
        const response = await axios.get(`${BASE_URL}/admin/analytics`);
        console.log('✅ Analytics Retrieved!');
        console.log('   Stats:', JSON.stringify(response.data.stats, null, 2));
    } catch (error) {
        handleError(error, 'Admin Analytics');
    }
}

function handleError(error, context) {
    console.error(`\n❌ Error during ${context}:`);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('   Message:', error.message);
    }
}

runTests();
