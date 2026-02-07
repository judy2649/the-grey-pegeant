const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Generates the Password required for STK Push
 */
const getStkPassword = () => {
    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = getTimestamp();

    const buf = Buffer.from(shortCode + passkey + timestamp);
    return buf.toString('base64');
};

/**
 * Generates current timestamp in format YYYYMMDDHHmmss
 */
const getTimestamp = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hour = ('0' + date.getHours()).slice(-2);
    const minute = ('0' + date.getMinutes()).slice(-2);
    const second = ('0' + date.getSeconds()).slice(-2); // Fixed from getMinute to getSeconds

    return `${year}${month}${day}${hour}${minute}${second}`;
};

/**
 * Generates an OAuth Access Token from Safaricom
 */
const getAccessToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const url = process.env.MPESA_ENV === 'production'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');

    try {
        console.log('🔑 Fetching Safaricom Access Token...');
        const response = await axios.get(url, {
            headers: { Authorization: auth },
            timeout: 10000 // 10 second timeout
        });
        console.log('✅ Access Token obtained.');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ M-Pesa Access Token Error:', error.response ? JSON.stringify(error.response.data) : error.message);
        throw new Error('Failed to connect to Safaricom. Check your API Keys.');
    }
};

module.exports = { getStkPassword, getTimestamp, getAccessToken };
