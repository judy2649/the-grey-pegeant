/**
 * Direct Ticket Issue Script
 * Send ticket to a specific customer who has already paid
 */

const https = require('https');

// Customer Details
const CUSTOMER = {
    mpesaCode: 'UB97161VYD',
    phone: '254727037692', // Formatted from 0727037692
    name: 'Customer',
    eventName: 'The Grey Pageant',
    amount: 200
};

// Generate Ticket ID
const ticketId = 'GP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

// SMS API Configuration
const SMS_API_TOKEN = '225|9IEK2W5gvZNUKThuRQe5FYgntd9sWaXkURMGBUCx8ad61230';
const SMS_SENDER_ID = 'OpenSMS';

// Ticket Message
const ticketMessage = `✅ Ticket Confirmed!
Ref: ${CUSTOMER.mpesaCode}
Ticket No: ${ticketId}
Event: ${CUSTOMER.eventName}
Amount: KES ${CUSTOMER.amount}

Please keep this message for entry. See you there! 🎉`;

console.log('🎫 ========================================');
console.log('   ISSUING TICKET TO CUSTOMER');
console.log('========================================');
console.log('');
console.log('📋 Customer Details:');
console.log(`   M-Pesa Code: ${CUSTOMER.mpesaCode}`);
console.log(`   Phone: ${CUSTOMER.phone}`);
console.log(`   Event: ${CUSTOMER.eventName}`);
console.log('');
console.log(`🎫 Generated Ticket: ${ticketId}`);
console.log('');
console.log('📱 Sending SMS...');

// Send SMS via OpenSMS API
const smsPayload = JSON.stringify({
    recipient: CUSTOMER.phone,
    sender_id: SMS_SENDER_ID,
    type: 'plain',
    message: ticketMessage
});

const options = {
    hostname: 'api.opensms.co.ke',
    port: 443,
    path: '/v3/sms/send',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${SMS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(smsPayload)
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);

        try {
            const result = JSON.parse(data);
            console.log('   Response:', JSON.stringify(result, null, 2));

            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log('');
                console.log('✅ SMS SENT SUCCESSFULLY!');
                console.log(`   Customer ${CUSTOMER.phone} should receive their ticket shortly.`);
            } else {
                console.log('');
                console.log('⚠️ SMS may have failed. Check the response above.');
            }
        } catch (e) {
            console.log('   Raw response:', data);
        }

        console.log('');
        console.log('========================================');
        console.log('📲 WHATSAPP MESSAGE (Copy & Send):');
        console.log('========================================');
        console.log('');
        console.log(`Send to: +254727037692`);
        console.log('');
        console.log('--- Copy Below ---');
        console.log(ticketMessage);
        console.log('--- End Copy ---');
        console.log('');
        console.log(`WhatsApp Link: https://wa.me/254727037692?text=${encodeURIComponent(ticketMessage)}`);
    });
});

req.on('error', (e) => {
    console.error('❌ Error sending SMS:', e.message);
});

req.write(smsPayload);
req.end();
