const app = require('./src/app');
const axios = require('axios');
require('dotenv').config();

const PORT = 3001; // Use different port for test

async function runIntegratedTest() {
    const server = app.listen(PORT, async () => {
        console.log(`Server started on port ${PORT}`);

        try {
            // 1. Pay
            console.log('Testing /api/pay...');
            const payRes = await axios.post(`http://localhost:${PORT}/api/pay`, {
                phoneNumber: '0794173314',
                amount: 1,
                eventId: 'test_event'
            });
            const checkoutRequestID = payRes.data.checkoutRequestID;
            console.log('CheckoutRequestID:', checkoutRequestID);

            // 2. Callback
            console.log('Testing /api/callback...');
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
                                { Name: "MpesaReceiptNumber", Value: "TESTRECEIPT" },
                                { Name: "Balance", Value: 0 },
                                { Name: "TransactionDate", Value: 20260205173411 },
                                { Name: "PhoneNumber", Value: 254794173314 }
                            ]
                        }
                    }
                }
            };

            const callbackRes = await axios.post(`http://localhost:${PORT}/api/callback`, callbackPayload, {
                headers: {
                    'x-callback-secret': process.env.MPESA_CALLBACK_SECRET || 'ef88e74c25e2b5e5e6061d8d6485e3ea170e0426ff2266fc090e306e82f14'
                }
            });
            console.log('Callback Response:', callbackRes.status, callbackRes.data);

        } catch (error) {
            console.error('Test Failed!');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.error(error.message);
            }
        } finally {
            server.close();
            process.exit(0);
        }
    });
}

runIntegratedTest();
