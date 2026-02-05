const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function testSTKPush() {
    console.log('🚀 Starting M-Pesa STK Push Test...');

    // Test Data
    const payload = {
        phoneNumber: '0794173314', // Using the number seen in the code as reference, or could be user's number
        amount: 1, // 1 KES for testing
        eventId: 'evt_grey_pageant'
    };

    console.log(`📡 Sending request to ${BASE_URL}/pay with payload:`, payload);

    try {
        const response = await axios.post(`${BASE_URL}/pay`, payload);
        console.log('\n✅ Response Received:');
        console.log('Status:', response.status);
        console.log('Data:', response.data);

        if (response.data.checkoutRequestID) {
            console.log('\n✨ STK Push successfully initiated!');
            console.log('Check your phone for the MPesa prompt.');
        } else {
            console.log('\n⚠️ Unexpected response structure.');
        }

    } catch (error) {
        console.error('\n❌ Error Testing STK Push:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received (Server likely down or unreachable).');
            console.error('Ensure the server is running on port ' + PORT);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testSTKPush();
