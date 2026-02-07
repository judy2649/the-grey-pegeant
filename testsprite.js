const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 3002;
const BASE_URL = process.env.PRODUCTION_URL
    ? `${process.env.PRODUCTION_URL}/api`
    : `http://localhost:${PORT}/api`;

async function runTests() {
    console.log('🚀 --- Starting Stripe Payment Test Suite ---');
    console.log(`📡 Target BASE_URL: ${BASE_URL}`);

    // Diagnostics - Check Environment Variables
    console.log('\n🔍 Checking Environment Variables:');
    console.log(`   STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`   STRIPE_PUBLISHABLE_KEY: ${process.env.STRIPE_PUBLISHABLE_KEY ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`   KES_TO_USD_RATE: ${process.env.KES_TO_USD_RATE || '155 (default)'}`);
    console.log(`   ADMIN_PHONE: ${process.env.ADMIN_PHONE || '❌ MISSING'}`);
    console.log(`   AT_API_KEY: ${process.env.AT_API_KEY && process.env.AT_API_KEY !== 'YOUR_AFRICAS_TALKING_API_KEY' ? '✅ FOUND' : '⚠️ Not configured (SMS won\'t work)'}`);

    // Test 1: Get Conversion Rate
    await testConversionRate();

    // Test 2: Get Events
    await testGetEvents();

    // Test 3: Create Payment Intent
    await testCreatePaymentIntent();

    console.log('\n✅ --- All Tests Completed ---');
}

async function testConversionRate() {
    console.log('\n🔹 TEST 1: Get Conversion Rate');

    try {
        const response = await axios.get(`${BASE_URL}/conversion-rate`);
        console.log('✅ Conversion Rate Response:', response.data);
        console.log(`   1 USD = ${response.data.kesToUsdRate} KES`);
    } catch (error) {
        handleError(error, 'Conversion Rate');
    }
}

async function testGetEvents() {
    console.log('\n🔹 TEST 2: Get Events');

    try {
        const response = await axios.get(`${BASE_URL}/events`);
        console.log('✅ Events Response:');
        response.data.forEach(event => {
            console.log(`   📅 ${event.name} - ${event.date} @ ${event.venue}`);
            event.tiers.forEach(tier => {
                console.log(`      💰 ${tier.name}: KES ${tier.price}`);
            });
        });
    } catch (error) {
        handleError(error, 'Get Events');
    }
}

async function testCreatePaymentIntent() {
    console.log('\n🔹 TEST 3: Create Payment Intent (Stripe)');

    const payload = {
        amountKES: 200,  // KES 200 for Normal ticket
        eventName: 'The Grey Pageant',
        eventId: 'evt_grey_pageant',
        tierName: 'Normal',
        name: 'Test User',
        email: 'test@example.com',
        phoneNumber: '0712369221'
    };

    console.log('📤 Sending payment request:', payload);

    try {
        const response = await axios.post(`${BASE_URL}/create-payment-intent`, payload);
        console.log('✅ Payment Intent Created Successfully!');
        console.log('   Payment Intent ID:', response.data.paymentIntentId);
        console.log(`   Amount: KES ${response.data.amountKES} → USD ${response.data.amountUSD}`);
        console.log(`   Conversion Rate: 1 USD = ${response.data.conversionRate} KES`);
        console.log('   Client Secret:', response.data.clientSecret ? '✅ Received' : '❌ Missing');

        return response.data;
    } catch (error) {
        handleError(error, 'Create Payment Intent');
        return null;
    }
}

function handleError(error, context) {
    console.error(`\n❌ Error during ${context}:`);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
        console.error('   ⚠️ No response received from server.');
        console.error('   Make sure the server is running: npm start');
    } else {
        console.error('   Error Message:', error.message);
    }
}

runTests();
