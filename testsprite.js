const axios = require('axios');
require('dotenv').config();

// Get the URL from the command line argument, or use the default
const TARGET_URL = process.argv[2] || 'http://localhost:3002';
const BASE_URL = TARGET_URL.endsWith('/api') ? TARGET_URL : `${TARGET_URL}/api`;

async function runTests() {
    console.log('🚀 --- Starting Manual M-Pesa Integration Test ---');
    console.log(`📡 Connecting to: ${BASE_URL}`);

    // Test 1: Health Check (Get Events)
    await testGetEvents();

    // Test 2: Submit Manual Payment
    await testManualPayment();

    console.log('\n✅ --- All Tests Completed ---');
    console.log(`\n👉 Verify your live site at: ${TARGET_URL}`);
}

async function testGetEvents() {
    console.log('\n🔹 TEST 1: Check Website Health (Get Events)');
    try {
        const response = await axios.get(`${BASE_URL}/events`);
        console.log('✅ Success! Website is loading properly.');
        console.log(`   Found ${response.data.length} event(s).`);
    } catch (error) {
        handleError(error, 'Get Events');
    }
}

async function testManualPayment() {
    console.log('\n🔹 TEST 2: Submit Manual Payment');

    const payload = {
        mpesaCode: 'THT' + Math.floor(Math.random() * 10000000), // Random code for testing
        phoneNumber: '0712369221',
        name: 'Test Automatic User',
        email: 'test@example.com',
        eventName: 'The Grey Pageant - Test Run',
        amount: 200,
        tierName: 'Normal'
    };

    console.log(`📤 Sending Code: ${payload.mpesaCode} for ${payload.eventName}`);

    try {
        const response = await axios.post(`${BASE_URL}/manual-pay`, payload);
        console.log('✅ Payment Submission Successful!');
        console.log('   Ticket Generated:', response.data.ticketId);
        console.log('   Message:', response.data.message);

        if (response.data.success) {
            console.log('📧 Notification Triggered (check backend logs or phone for SMS)');
        }
    } catch (error) {
        handleError(error, 'Manual Payment');
    }
}

function handleError(error, context) {
    console.error(`\n❌ Error during ${context}:`);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
        console.error('   ⚠️ Target not reachable. Is the URL correct?');
        console.log(`   Attempted URL: ${BASE_URL}`);
    } else {
        console.error('   Message:', error.message);
    }
}

runTests();
