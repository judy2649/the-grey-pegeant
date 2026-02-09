const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Sends an SMS to a specific phone number using OpenSMS (opensms.co.ke).
 * @param {string} to - The phone number (e.g., 254712345678)
 * @param {string} message - The message content
 */
const sendSMS = async (to, message) => {
    const apiToken = process.env.OPEN_SMS_API_TOKEN;
    const senderId = process.env.OPEN_SMS_SENDER_ID || 'OpenSMS';

    if (!apiToken || apiToken.includes('YOUR_')) {
        console.warn('⚠️ SMS skipped: OpenSMS API Token not configured.');
        return { status: 'skipped' };
    }

    // Ensure phone number format is correct (Remove + if present, many Kenyan gateways prefer 254...)
    let formattedPhone = to.replace('+', '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
    }

    console.log('📱 SMS Attempt - To:', formattedPhone, 'SenderId:', senderId);
    console.log('🔑 SMS Token Configured:', !!apiToken);

    try {
        const response = await axios.post('https://api.opensms.co.ke/v3/sms/send', {
            recipient: formattedPhone,
            sender_id: senderId,
            type: 'plain',
            message: message
        }, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('📨 OpenSMS Sent successfully:', response.data);
        return {
            status: 'success',
            data: response.data
        };
    } catch (error) {
        console.error('❌ Error sending OpenSMS:', error.response ? error.response.data : error.message);
        // Don't throw to prevent crashing the order flow, just log it
        return {
            status: 'failed',
            error: error.response ? error.response.data : error.message
        };
    }
};

module.exports = { sendSMS };
