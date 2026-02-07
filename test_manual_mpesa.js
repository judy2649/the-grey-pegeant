const axios = require('axios');
const PORT = 3002; // Use your running server port
const BASE_URL = `http://localhost:${PORT}/api`;

async function testManualPayment() {
    console.log('🚀 Testing Manual M-Pesa Payment Flow...');

    // Simulate a user submitting a valid code
    const payload = {
        mpesaCode: 'SDE23KL90M', // 10 chars
        phoneNumber: '0712369221',
        name: 'Test Manual User',
        email: 'manual@test.com',
        eventName: 'The Grey Pageant',
        amount: 200,
        tierName: 'Normal'
    };

    console.log('📤 Submitting:', payload);

    try {
        const res = await axios.post(`${BASE_URL}/manual-pay`, payload);
        console.log('✅ Response:', res.json ? await res.json() : res.data);
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

testManualPayment();
