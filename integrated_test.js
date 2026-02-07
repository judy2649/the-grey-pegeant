const app = require('./src/app');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables manually for the test process
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = 3002; // Use a different port for testing to avoid conflicts

async function runIntegratedTest() {
    console.log('🚀 --- Starting Integrated Stripe Test ---');

    // Start the server
    const server = app.listen(PORT, async () => {
        console.log(`📡 Test Server running on port ${PORT}`);
        const BASE_URL = `http://localhost:${PORT}/api`;

        try {
            // Test 1: Check Conversion Rate
            console.log('\n🔹 TEST 1: Checking Conversion Rate...');
            const rateRes = await axios.get(`${BASE_URL}/conversion-rate`);
            console.log(`   ✅ 1 USD = ${rateRes.data.kesToUsdRate} KES`);

            // Test 2: Create Payment Intent
            console.log('\n🔹 TEST 2: Creating Stripe Payment Intent...');
            const paymentPayload = {
                amountKES: 500, // VIP Ticket
                eventName: 'The Grey Pageant',
                eventId: 'evt_grey_pageant',
                tierName: 'VIP',
                name: 'Test Wrapper',
                email: 'test@integrated.com',
                phoneNumber: '0712369221'
            };

            const intentRes = await axios.post(`${BASE_URL}/create-payment-intent`, paymentPayload);
            console.log('   ✅ Payment Intent Created!');
            console.log(`   ID: ${intentRes.data.paymentIntentId}`);
            console.log(`   Amount: $${intentRes.data.amountUSD} (KES ${intentRes.data.amountKES})`);

            if (!intentRes.data.clientSecret) {
                throw new Error('No clientSecret returned from Stripe!');
            }

            // Test 3: Simulate Success (since we can't pay via API without UI)
            console.log('\n🔹 TEST 3: Simulating Payment Success...');
            const successPayload = {
                paymentIntentId: intentRes.data.paymentIntentId,
                eventName: paymentPayload.eventName,
                eventId: paymentPayload.eventId,
                tierName: paymentPayload.tierName,
                phoneNumber: paymentPayload.phoneNumber,
                amountKES: paymentPayload.amountKES,
                amountUSD: intentRes.data.amountUSD,
                name: paymentPayload.name,
                email: paymentPayload.email
            };

            const successRes = await axios.post(`${BASE_URL}/stripe-success`, successPayload);
            console.log('   ✅ Payment Success Handled!');
            console.log(`   Ticket ID: ${successRes.data.ticketId}`);
            console.log(`   Message: ${successRes.data.message}`);

            console.log('\n✨ --- ALL TESTS PASSED --- ✨');

        } catch (error) {
            console.error('\n❌ INTEGRATED TEST FAILED');
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Error data:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.error('   Error:', error.message);
            }
        } finally {
            console.log('\n🛑 Stopping Test Server...');
            server.close();
            process.exit(0);
        }
    });
}

runIntegratedTest();
