const AfricasTalking = require('africastalking');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Africa's Talking
const africastalking = AfricasTalking({
    apiKey: process.env.AT_API_KEY || 'sandbox',
    username: process.env.AT_USERNAME || 'sandbox'
});

const sms = africastalking.SMS;

/**
 * Sends an SMS to a specific phone number.
 * @param {string} to - The phone number (e.g., +254712345678)
 * @param {string} message - The message content
 */
const sendSMS = async (to, message) => {
    try {
        const result = await sms.send({
            to: [to],
            message: message
        });
        console.log('📨 SMS Sent successfully:', result);
        return result;
    } catch (error) {
        console.error('❌ Error sending SMS:', error);
        throw error;
    }
};

module.exports = { sendSMS };
