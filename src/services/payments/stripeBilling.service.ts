import Stripe from 'stripe';
import httpStatus from 'http-status';
import config from '../../config/config.ts';
import logger from '../../config/logger.ts';
import { Subscription, User } from '../../models/index.ts';
import type { UserDocument } from '../../models/user.model.ts';
import ApiError from '../../utils/ApiError.ts';
import type { ObjectIdLike } from '../../types/common.ts';

let stripeClient: Stripe | null = null;

const getStripe = (): Stripe | null => {
  if (!config.stripe.secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey);
  }

  return stripeClient;
};

const isStripeEnabled = (): boolean => getStripe() !== null;

const resolveCustomerId = async (userId: ObjectIdLike): Promise<string | null> => {
  const user = await User.findById(userId);
  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const subscription = await Subscription.findOne({
    user: userId,
    externalCustomerId: { $exists: true, $ne: '' },
  })
    .sort({ createdAt: -1 })
    .select('externalCustomerId');

  return subscription?.externalCustomerId ?? null;
};

const persistCustomerId = async (user: UserDocument, customerId: string): Promise<void> => {
  if (user.stripeCustomerId === customerId) {
    return;
  }

  user.stripeCustomerId = customerId;
  await user.save();
};

const getOrCreateCustomerId = async (userId: ObjectIdLike): Promise<string> => {
  const existingCustomerId = await resolveCustomerId(userId);
  if (existingCustomerId) {
    const user = await User.findById(userId);
    if (user && !user.stripeCustomerId) {
      await persistCustomerId(user, existingCustomerId);
    }
    return existingCustomerId;
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.fullName || undefined,
    metadata: {
      userId: String(userId),
    },
  });

  await persistCustomerId(user, customer.id);
  return customer.id;
};

export interface BillingPaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

const mapPaymentMethod = (
  paymentMethod: Stripe.PaymentMethod,
  defaultPaymentMethodId?: string | null
): BillingPaymentMethod => ({
  id: paymentMethod.id,
  brand: paymentMethod.card?.brand,
  last4: paymentMethod.card?.last4,
  expMonth: paymentMethod.card?.exp_month,
  expYear: paymentMethod.card?.exp_year,
  isDefault: paymentMethod.id === defaultPaymentMethodId,
});

const listPaymentMethods = async (userId: ObjectIdLike): Promise<BillingPaymentMethod[]> => {
  const stripe = getStripe();
  if (!stripe) {
    return [];
  }

  const customerId = await resolveCustomerId(userId);
  if (!customerId) {
    return [];
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId =
      typeof customer !== 'string' && !customer.deleted
        ? typeof customer.invoice_settings.default_payment_method === 'string'
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method?.id ?? null
        : null;

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data.map((paymentMethod) => mapPaymentMethod(paymentMethod, defaultPaymentMethodId));
  } catch (error) {
    logger.error('Failed to list Stripe payment methods:', error);
    return [];
  }
};

const getDefaultPaymentMethod = async (userId: ObjectIdLike): Promise<BillingPaymentMethod | null> => {
  const methods = await listPaymentMethods(userId);
  return methods.find((method) => method.isDefault) ?? methods[0] ?? null;
};

const createSetupIntent = async (userId: ObjectIdLike): Promise<{ clientSecret: string }> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  const customerId = await getOrCreateCustomerId(userId);
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: {
      userId: String(userId),
    },
  });

  if (!setupIntent.client_secret) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to create setup intent');
  }

  return { clientSecret: setupIntent.client_secret };
};

const setDefaultPaymentMethod = async (userId: ObjectIdLike, paymentMethodId: string): Promise<BillingPaymentMethod> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  const customerId = await getOrCreateCustomerId(userId);
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  const ownsMethod = paymentMethods.data.some((method) => method.id === paymentMethodId);
  if (!ownsMethod) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment method not found');
  }

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  return mapPaymentMethod(paymentMethod, paymentMethodId);
};

const detachPaymentMethod = async (userId: ObjectIdLike, paymentMethodId: string): Promise<void> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  const customerId = await resolveCustomerId(userId);
  if (!customerId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment method not found');
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  const ownsMethod = paymentMethods.data.some((method) => method.id === paymentMethodId);
  if (!ownsMethod) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment method not found');
  }

  await stripe.paymentMethods.detach(paymentMethodId);
};

export interface BillingHistoryItem {
  id: string;
  source: 'payment' | 'invoice';
  amount: number;
  currency: string;
  status: string;
  description?: string;
  paidAt?: Date | null;
  invoicePdf?: string | null;
  paymentIntentId?: string | null;
}

const listInvoices = async (userId: ObjectIdLike, limit = 100): Promise<BillingHistoryItem[]> => {
  const stripe = getStripe();
  if (!stripe) {
    return [];
  }

  const customerId = await resolveCustomerId(userId);
  if (!customerId) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      source: 'invoice' as const,
      amount: (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100,
      currency: (invoice.currency ?? 'usd').toUpperCase(),
      status: invoice.status ?? 'unknown',
      description: invoice.description ?? invoice.number ?? undefined,
      paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
      invoicePdf: invoice.invoice_pdf ?? null,
      paymentIntentId:
        typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id ?? null,
    }));
  } catch (error) {
    logger.error('Failed to list Stripe invoices:', error);
    return [];
  }
};

export default {
  isStripeEnabled,
  resolveCustomerId,
  getOrCreateCustomerId,
  listPaymentMethods,
  getDefaultPaymentMethod,
  createSetupIntent,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  listInvoices,
};

export {
  isStripeEnabled,
  resolveCustomerId,
  getOrCreateCustomerId,
  listPaymentMethods,
  getDefaultPaymentMethod,
  createSetupIntent,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  listInvoices,
};
