const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.PRODUCTION_URL
    ? `${process.env.PRODUCTION_URL}/api`
    : `http://localhost:${PORT}/api`;

async function runTests() {
    console.log('🚀 --- Starting M-Pesa Test Suite ---');
    console.log(`📡 Target BASE_URL: ${BASE_URL}`);

    // Diagnostics
    console.log('🔍 Checking Environment Variables:');
    console.log(`   MPESA_SHORTCODE: ${process.env.MPESA_SHORTCODE || 'MISSING'}`);
    console.log(`   MPESA_TILL_NUMBER: ${process.env.MPESA_TILL_NUMBER || 'MISSING'}`);
    console.log(`   MPESA_CONSUMER_KEY: ${process.env.MPESA_CONSUMER_KEY ? 'FOUND' : 'MISSING'}`);

    const checkoutRequestID = await testSTKPush();

    if (checkoutRequestID && !process.env.PRODUCTION_URL) {
        console.log('\n--- Local environment detected. Testing Callback... ---');
        await testCallback(checkoutRequestID);
    }

    console.log('\n✅ --- Tests Completed ---');
}

async function testSTKPush() {
    console.log('\n🔹 STEP 1: Initiating STK Push...');

    const payload = {
        phoneNumber: '0712369221',
        amount: 1,
        eventId: 'evt_grey_pageant'
    };

    try {
        const response = await axios.post(`${BASE_URL}/pay`, payload);
        console.log('✅ STK Push Response:', response.data);

        if (response.data.checkoutRequestID) {
            console.log('✨ STK Push successfully initiated!');
            return response.data.checkoutRequestID;
        }
        return null;
    } catch (error) {
        handleError(error, 'STK Push');
        return null;
    }
}

async function testCallback(checkoutRequestID) {
    console.log('\n🔹 STEP 2: Simulating M-Pesa Callback...');

    const callbackPayload = {
        Body: {
            stkCallback: {
                MerchantRequestID: "29115-34620561-1",
                CheckoutRequestID: checkoutRequestID,
                ResultCode: 0,
                ResultDesc: "The service was accepted successfully",
                CallbackMetadata: {
                    Item: [
                        { Name: "Amount", Value: 1.00 },
                        { Name: "MpesaReceiptNumber", Value: "NLJ7RT6P9Z" },
                        { Name: "Balance", Value: 0 },
                        { Name: "TransactionDate", Value: 20260205173411 },
                        { Name: "PhoneNumber", Value: 254794173314 }
                    ]
                }
            }
        }
    };

    try {
        const response = await axios.post(`${BASE_URL}/callback`, callbackPayload, {
            headers: {
                'x-callback-secret': process.env.MPESA_CALLBACK_SECRET || 'ef88e74c25e2b5e5e6061d8d6485e3ea170e0426ff2266fc090e306e82f14'
            }
        });
        console.log('✅ Callback Response:', response.status, response.data);
    } catch (error) {
        handleError(error, 'Callback Simulation');
    }
}

function handleError(error, context) {
    console.error(`\n❌ Error during ${context}:`);
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
        console.error('No response received from server. Is it running?');
    } else {
        console.error('Error Message:', error.message);
    }
}

runTests();
