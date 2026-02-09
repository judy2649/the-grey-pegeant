/**
 * Quick SMS Test Script
 * Run this to test if SMS is working
 * 
 * Usage:
 *   1. Start your server locally: npm start
 *   2. Run: node test_sms.js http://localhost:3000
 *   
 *   Or for Vercel:
 *   node test_sms.js https://your-vercel-url.vercel.app
 */

const https = require('https');
const http = require('http');
const url = require('url');

const TARGET_URL = process.argv[2] || 'http://localhost:3000';

// Generate valid 10-char M-Pesa code
const mpesaCode = 'SMS' + Math.random().toString(36).substring(2, 9).toUpperCase();

// Test data - CHANGE THE PHONE NUMBER TO YOUR REAL PHONE!
const testPayload = {
    mpesaCode: mpesaCode,
    phoneNumber: '0712369221', // <-- CHANGE THIS TO YOUR PHONE
    name: 'SMS Test User',
    email: 'test@test.com',
    eventName: 'The Grey Pageant',
    amount: 200,
    tierName: 'Normal'
};

console.log('🚀 Testing SMS Delivery');
console.log('========================');
console.log(`Target: ${TARGET_URL}`);
console.log(`M-Pesa Code: ${testPayload.mpesaCode}`);
console.log(`Phone: ${testPayload.phoneNumber}`);
console.log('');

const parsedUrl = new url.URL(`${TARGET_URL}/api/manual-pay`);
const isHttps = parsedUrl.protocol === 'https:';
const client = isHttps ? https : http;

const postData = JSON.stringify(testPayload);

const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = client.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('');

        try {
            const result = JSON.parse(data);
            console.log('📥 Response:');
            console.log(JSON.stringify(result, null, 2));
            console.log('');

            if (result.success) {
                console.log('✅ SUCCESS!');
                console.log(`🎫 Ticket ID: ${result.ticketId}`);
                console.log(`📱 SMS Status: ${result.smsStatus}`);

                if (result.smsStatus === 'success') {
                    console.log('');
                    console.log('📨 SMS should arrive at:', testPayload.phoneNumber);
                    console.log('   Check your phone in the next few seconds!');
                } else if (result.smsStatus === 'skipped') {
                    console.log('');
                    console.log('⚠️ SMS was SKIPPED!');
                    console.log('   This means OPEN_SMS_API_TOKEN is not set in environment.');
                    console.log('   Make sure your .env or Vercel env vars have:');
                    console.log('   OPEN_SMS_API_TOKEN=225|9IEK2W5gvZ...');
                } else {
                    console.log('');
                    console.log('❌ SMS may have failed - check server logs');
                }
            } else {
                console.log('❌ FAILED:', result.message);
            }
        } catch (e) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Connection Error:', e.message);
    console.log('');
    console.log('Make sure:');
    console.log('1. The server is running');
    console.log('2. The URL is correct');
    console.log(`3. Target URL: ${TARGET_URL}`);
});

req.write(postData);
req.end();
