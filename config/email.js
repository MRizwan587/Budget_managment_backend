// backend/config/email.js (ES Module syntax)
import nodemailer from 'nodemailer';

// Use environment variables for production security!
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, 
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    },
});

export async function sendOtpEmail(email, otp) {
    try {
        const mailOptions = {
            from: `"Expense Tracker" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your 2FA Verification Code',
            html: `
                <h2>Two-Factor Authentication (2FA) Code</h2>
                <p>Use the following code to complete your login or setup:</p>
                <div style="font-size: 24px; font-weight: bold; padding: 10px; border: 1px solid #ccc; display: inline-block;">${otp}</div>
                <p>This code is valid for a short period.</p>
            `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email.');
    }
}