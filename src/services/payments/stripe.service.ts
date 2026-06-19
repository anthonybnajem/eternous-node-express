import Stripe from 'stripe';
import httpStatus from 'http-status';
import config from '../../config/config.ts';
import logger from '../../config/logger.ts';
import ApiError from '../../utils/ApiError.ts';
import subscriptionService from '../subscription.service.ts';
import { grantPlanCreditsFromInvoice } from './stripeCredits.service.ts';

const stripe = new Stripe(config.stripe.secretKey);

export interface CreatePaymentIntentInput {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  clientSecret: string | null;
  paymentIntentId: string;
}

export interface CreateSubscriptionCheckoutSessionInput {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
  userId?: string;
  name?: string;
  quantity?: number;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionCheckoutSessionResult {
  sessionId: string;
  url: string | null;
}

const createPaymentIntent = async ({
  amount,
  currency = 'usd',
  metadata = {},
}: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    logger.error('Stripe payment intent creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to create payment intent');
  }
};

const createSubscriptionCheckoutSession = async ({
  priceId,
  successUrl,
  cancelUrl,
  customerEmail,
  customerName,
  userId,
  name,
  quantity = 1,
  metadata = {},
}: CreateSubscriptionCheckoutSessionInput): Promise<CreateSubscriptionCheckoutSessionResult> => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          userId: userId ?? '',
          name: name ?? '',
          ...metadata,
        },
      },
      metadata: {
        userId: userId ?? '',
        name: name ?? '',
        customerName: customerName ?? '',
        ...metadata,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    logger.error('Stripe checkout session creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to create subscription checkout session');
  }
};

const confirmPaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    return await stripe.paymentIntents.confirm(paymentIntentId);
  } catch (error) {
    logger.error('Stripe payment confirmation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to confirm payment');
  }
};

const getPaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    logger.error('Failed to retrieve payment intent:', error);
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment intent not found');
  }
};

const createRefund = async (paymentIntentId: string, amount?: number): Promise<Stripe.Refund> => {
  try {
    const refundData: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    return await stripe.refunds.create(refundData);
  } catch (error) {
    logger.error('Stripe refund failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to process refund');
  }
};

const handlePaymentSuccess = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  try {
    logger.info(`Payment succeeded for payment intent: ${paymentIntent.id}`);
    logger.info(`Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
  } catch (error) {
    logger.error('Error handling payment success:', error);
  }
};

const handlePaymentFailure = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  try {
    logger.info(`Payment failed for payment intent: ${paymentIntent.id}`);
    logger.info(`Last payment error: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
  } catch (error) {
    logger.error('Error handling payment failure:', error);
  }
};

const handleRefund = async (charge: Stripe.Charge): Promise<void> => {
  try {
    logger.info(`Refund processed for charge: ${charge.id}`);
    logger.info(`Payment intent: ${charge.payment_intent}`);
    logger.info(`Amount refunded: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`);
  } catch (error) {
    logger.error('Error handling refund:', error);
  }
};

const handleWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  logger.info(`Handling Stripe webhook event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && typeof session.subscription === 'string') {
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
        await subscriptionService.syncSubscriptionFromStripe(stripeSubscription, session.metadata?.userId);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await subscriptionService.syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (typeof invoice.subscription === 'string' && invoice.subscription.length > 0) {
        const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await subscriptionService.syncSubscriptionFromStripe(stripeSubscription, invoice.metadata?.userId);
      }
      await grantPlanCreditsFromInvoice(invoice);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (typeof invoice.subscription === 'string' && invoice.subscription.length > 0) {
        const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await subscriptionService.syncSubscriptionFromStripe(stripeSubscription, invoice.metadata?.userId);
      }
      break;
    }
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object as Stripe.Charge);
      break;
    default:
      logger.warn(`Unhandled event type: ${event.type}`);
  }
};

const retrieveSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  return stripe.subscriptions.retrieve(subscriptionId);
};

const constructWebhookEvent = (payload: Buffer | string, signature: string): Stripe.Event => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid webhook signature');
  }
};

export {
  createPaymentIntent,
  createSubscriptionCheckoutSession,
  confirmPaymentIntent,
  getPaymentIntent,
  createRefund,
  handleWebhookEvent,
  constructWebhookEvent,
  retrieveSubscription,
};
