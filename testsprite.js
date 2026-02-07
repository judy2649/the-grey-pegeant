const axios = require('axios');
require('dotenv').config();

const PORT = 3002; // Change this to your running server port if needed
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
    console.log('🚀 --- Starting Manual M-Pesa Integration Test ---');
    console.log(`📡 Connecting to: ${BASE_URL}`);

    // Test 1: Health Check (Get Events)
    await testGetEvents();

    // Test 2: Submit Manual Payment
    await testManualPayment();

    console.log('\n✅ --- All Tests Completed ---');
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

    // Simulate user entering a payment code
    const payload = {
        mpesaCode: 'SDE23KL90M', // 10-char code
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
            console.log('📧 Notification Triggered (check backend logs for SMS output)');
        }
    } catch (error) {
        handleError(error, 'Manual Payment');
    }
}

function handleError(error, context) {
    console.error(`\n❌ Error during ${context}:`);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error:', error.response.data);
    } else if (error.request) {
        console.error('   ⚠️ Server not reachable. Is it running? (node start_alternate.js)');
    } else {
        console.error('   Message:', error.message);
    }
}

runTests();
