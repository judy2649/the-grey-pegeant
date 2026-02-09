const nodemailer = require('nodemailer');

/**
 * Email utility for sending tickets
 */

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send a ticket confirmation email
 * @param {Object} details - Ticket and customer details
 */
const sendTicketEmail = async (details) => {
    const { email, name, ticketId, eventName, mpesaCode, amount, tierName } = details;

    if (!email) {
        console.log('⚠️ Email skipped: No email provided.');
        return { status: 'skipped' };
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email skipped: EMAIL_USER or EMAIL_PASS not configured in .env');
        return { status: 'skipped' };
    }

    console.log('📧 Email Attempt - To:', email);
    console.log('🔑 Email User:', process.env.EMAIL_USER);

    const googleMapsLink = 'https://www.google.com/maps/search/?api=1&query=Mombasa+Marine+Park';

    const mailOptions = {
        from: `"The Grey Pageant" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🎟️ Your Ticket for ${eventName} - ${ticketId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                    <h1>The Grey Pageant</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Hello <strong>${name || 'Guest'}</strong>,</p>
                    <p>Your payment has been verified successfully! Here are your ticket details:</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #333; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
                        <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                        <p style="margin: 5px 0;"><strong>Tier:</strong> ${tierName || 'Standard'}</p>
                        <p style="margin: 5px 0;"><strong>Amount Paid:</strong> KES ${amount}</p>
                        <p style="margin: 5px 0;"><strong>Reference:</strong> ${mpesaCode}</p>
                    </div>

                    <p>📍 <strong>Location:</strong> Marine Park</p>
                    <p>📍 <strong>Directions:</strong> <a href="${googleMapsLink}" style="color: #007bff; text-decoration: none;">View on Google Maps</a></p>

                    <p style="margin-top: 30px;">Please present this email or your SMS ticket at the entrance for verification.</p>
                    
                    <p>We look forward to seeing you there!</p>
                </div>
                <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    © 2026 The Grey Pageant. All rights reserved.
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Ticket email sent:', info.messageId);
        return { status: 'success', messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending ticket email:', error.message);
        return { status: 'failed', error: error.message };
    }
};

/**
 * Send an email notification to the Admin
 * @param {string} subject - Email subject
 * @param {string} message - Text or HTML message
 */
const sendAdminEmail = async (subject, message) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'judithoyoo64@gmail.com';

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Admin Email skipped: EMAIL_USER or EMAIL_PASS not configured.');
        return { status: 'skipped' };
    }

    const mailOptions = {
        from: `"The Grey Pageant Admin" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: subject,
        html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #ddd;">${message}</div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Admin email notification sent');
        return { status: 'success' };
    } catch (error) {
        console.error('❌ Error sending admin email:', error.message);
        return { status: 'failed', error: error.message };
    }
};

module.exports = { sendTicketEmail, sendAdminEmail };
