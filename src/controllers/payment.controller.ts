import type { Response } from 'express';
import httpStatus from 'http-status';
import type Stripe from 'stripe';
import catchAsync from '../utils/catchAsync.js';
import * as stripeService from '../services/payments/stripe.service.js';
import logger from '../config/logger.js';
import { Activity } from '../models/index.js';
import type { ActivityType } from '../models/activity.model.js';
import type { Request } from 'express';

type PaymentIntentBody = { amount: number; currency?: string; metadata?: Record<string, string> };
type PaymentIntentParams = { paymentIntentId: string };
type RefundBody = { amount?: number };

const recordActivity = async (
  req: Request<any, any, any, any>,
  userId: string,
  type: ActivityType,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  try {
    await Activity.create({
      user: userId,
      type,
      description,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata,
    });
  } catch (error) {
    logger.error('Failed to record activity:', error);
  }
};

const createPaymentIntent = catchAsync<Record<string, never>, unknown, PaymentIntentBody>(
  async (req, res: Response): Promise<void> => {
    const { amount, currency, metadata } = req.body;
    const result = await stripeService.createPaymentIntent({ amount, currency, metadata });
    if (req.user) {
      await recordActivity(
        req,
        String(req.user.id),
        'payment',
        `${req.user.email ?? 'User'} created payment intent`,
        { amount, currency: currency ?? 'usd', ...metadata, clientSecret: result.clientSecret, paymentIntentId: result.paymentIntentId }
      );
    }
    res.status(httpStatus.CREATED).send(result);
  }
);

const getPaymentIntent = catchAsync<PaymentIntentParams>(async (req, res: Response): Promise<void> => {
  const { paymentIntentId } = req.params;
  const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);
  res.send(paymentIntent);
});

const createRefund = catchAsync<PaymentIntentParams, unknown, RefundBody>(async (req, res: Response): Promise<void> => {
  const { paymentIntentId } = req.params;
  const { amount } = req.body;
  const refund = await stripeService.createRefund(paymentIntentId, amount);
  if (req.user) {
    await recordActivity(
      req,
      String(req.user.id),
      'payment',
      `${req.user.email ?? 'User'} created refund`,
      { paymentIntentId, amount: amount ?? null, refundId: refund.id }
    );
  }
  res.send(refund);
});

const handleWebhook = catchAsync(async (req, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'];
  const normalizedSignature = Array.isArray(signature) ? signature[0] : signature;

  if (!normalizedSignature) {
    res.status(httpStatus.BAD_REQUEST).send({ message: 'Missing Stripe signature' });
    return;
  }

  if (!Buffer.isBuffer(req.body)) {
    logger.error(`Stripe webhook body is not Buffer. Type: ${typeof req.body}`);
    res.status(httpStatus.BAD_REQUEST).send({ message: 'Webhook body must be raw Buffer' });
    return;
  }

  const event: Stripe.Event = stripeService.constructWebhookEvent(
    req.body,
    normalizedSignature
  );

  await stripeService.handleWebhookEvent(event);

  if (
    event.type === 'payment_intent.succeeded' ||
    event.type === 'payment_intent.payment_failed' ||
    event.type === 'charge.refunded'
  ) {
    logger.info(`Payment webhook recorded: ${event.type}`);
  }

  res.status(httpStatus.OK).send({ received: true });
});

export default { createPaymentIntent, getPaymentIntent, createRefund, handleWebhook };
export { createPaymentIntent, getPaymentIntent, createRefund, handleWebhook };
