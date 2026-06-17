import nodemailer from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer';
import config from '../../config/config.js';
import logger from '../../config/logger.js';

// Create transporter
const transport = nodemailer.createTransport(config.email.smtp);

// Verify connection configuration
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Email service connected'))
    .catch((error) => logger.warn('Unable to connect to email service:', error.message));
}

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 * @returns {Promise<Object>}
 */
const sendEmail = async (to: string, subject: string, text?: string, html?: string): Promise<SentMessageInfo> => {
  const msg = {
    from: config.email.from,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transport.sendMail(msg);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @returns {Promise<void>}
 */
const sendResetPasswordEmail = async (to: string, token: string): Promise<void> => {
  const subject = 'Reset password';
  const resetPasswordUrl = `${config.clientUrl || 'http://localhost:3000'}/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, please ignore this email.`;
  const html = `<p>Dear user,</p>
<p>To reset your password, click on this link: <a href="${resetPasswordUrl}">Reset Password</a></p>
<p>If you did not request any password resets, please ignore this email.</p>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const subject = 'Email Verification';
  const verificationEmailUrl = `${config.clientUrl || 'http://localhost:3000'}/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, please ignore this email.`;
  const html = `<p>Dear user,</p>
<p>To verify your email, click on this link: <a href="${verificationEmailUrl}">Verify Email</a></p>
<p>If you did not create an account, please ignore this email.</p>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send welcome email
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @returns {Promise<void>}
 */
const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  const subject = 'Welcome to Our Platform';
  const text = `Dear ${name},
Welcome to our platform! We're excited to have you on board.
If you have any questions, feel free to reach out to our support team.`;
  const html = `<p>Dear ${name},</p>
<p>Welcome to our platform! We're excited to have you on board.</p>
<p>If you have any questions, feel free to reach out to our support team.</p>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send order confirmation email
 * @param {string} to - Recipient email
 * @param {Object} order - Order object
 * @returns {Promise<void>}
 */
const sendOrderConfirmationEmail = async (
  to: string,
  order: { orderNumber?: string | number; totalAmount: number }
): Promise<void> => {
  const subject = `Order Confirmation - ${order.orderNumber}`;
  const text = `Dear customer,
Thank you for your order! Your order number is ${order.orderNumber}.
Total Amount: $${order.totalAmount.toFixed(2)}
We'll send you another email when your order ships.`;
  const html = `<p>Dear customer,</p>
<p>Thank you for your order! Your order number is <strong>${order.orderNumber}</strong>.</p>
<p>Total Amount: <strong>$${order.totalAmount.toFixed(2)}</strong></p>
<p>We'll send you another email when your order ships.</p>`;
  await sendEmail(to, subject, text, html);
};

export {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
};
