const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

/**
 * M-Pesa Open API Configuration for Kenya
 * Portal: https://openapiportal.m-pesa.com
 */

const MPESA_CONFIG = {
    // Environment: 'sandbox' or 'production'
    env: process.env.MPESA_ENV || 'sandbox',

    // Base URLs
    baseUrl: process.env.MPESA_ENV === 'production'
        ? 'https://openapi.m-pesa.com/production/ipg/v2/safaricomKEN'
        : 'https://openapi.m-pesa.com/sandbox/ipg/v2/safaricomKEN',

    // API Credentials (from Open API Portal)
    apiKey: process.env.MPESA_API_KEY,
    publicKey: process.env.MPESA_PUBLIC_KEY,

    // Business Details
    serviceProviderCode: process.env.MPESA_SP_CODE,

    // Country & Currency
    country: 'KEN',
    currency: 'KES'
};

/**
 * Generate Bearer Token for Open API
 * Encrypts API Key with RSA Public Key
 */
const generateBearerToken = () => {
    try {
        const apiKey = MPESA_CONFIG.apiKey;
        const publicKey = MPESA_CONFIG.publicKey;

        if (!apiKey || !publicKey) {
            throw new Error('Missing MPESA_API_KEY or MPESA_PUBLIC_KEY in environment');
        }

        // Format the public key properly
        let formattedKey = publicKey;
        if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
            formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
        }

        // Encrypt API key with RSA public key
        const buffer = Buffer.from(apiKey);
        const encrypted = crypto.publicEncrypt(
            {
                key: formattedKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            buffer
        );

        return encrypted.toString('base64');
    } catch (error) {
        console.error('❌ Bearer Token Generation Error:', error.message);
        throw error;
    }
};

/**
 * Generate unique transaction reference
 */
const generateTransactionRef = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN${timestamp}${random}`.toUpperCase();
};

/**
 * Generate unique conversation ID
 */
const generateConversationId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `CONV${timestamp}${random}`.toUpperCase();
};

/**
 * Format phone number for Kenya
 * Converts 07XX... or +254XX... to 254XXXXXXXXX
 */
const formatPhoneNumber = (phone) => {
    let formatted = phone.toString().replace(/\s+/g, '').replace(/[^0-9]/g, '');

    // Remove leading + if present
    if (formatted.startsWith('+')) {
        formatted = formatted.substring(1);
    }

    // Convert 07XX to 254XX
    if (formatted.startsWith('0')) {
        formatted = '254' + formatted.substring(1);
    }

    // Ensure it starts with 254
    if (!formatted.startsWith('254')) {
        formatted = '254' + formatted;
    }

    return formatted;
};

/**
 * Make authenticated request to M-Pesa Open API
 */
const makeOpenApiRequest = async (endpoint, payload) => {
    const bearerToken = generateBearerToken();
    const url = `${MPESA_CONFIG.baseUrl}${endpoint}`;

    console.log(`📡 Making Open API request to: ${url}`);

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
                'Origin': '*'
            },
            timeout: 30000 // 30 second timeout
        });

        return response.data;
    } catch (error) {
        const errorDetail = error.response
            ? JSON.stringify(error.response.data)
            : error.message;
        console.error('❌ Open API Request Error:', errorDetail);
        throw error;
    }
};

module.exports = {
    MPESA_CONFIG,
    generateBearerToken,
    generateTransactionRef,
    generateConversationId,
    formatPhoneNumber,
    makeOpenApiRequest
};
