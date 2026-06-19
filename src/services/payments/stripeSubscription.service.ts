import Stripe from 'stripe';
import httpStatus from 'http-status';
import config from '../../config/config.ts';
import logger from '../../config/logger.ts';
import ApiError from '../../utils/ApiError.ts';

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

const isStripeSubscriptionId = (subscriptionId?: string): boolean =>
  Boolean(subscriptionId && subscriptionId.startsWith('sub_'));

const upgradeSubscription = async (
  externalSubscriptionId: string,
  priceId: string
): Promise<Stripe.Subscription> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  if (!isStripeSubscriptionId(externalSubscriptionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Subscription is not managed by Stripe');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(externalSubscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Stripe subscription has no items to upgrade');
    }

    return await stripe.subscriptions.update(externalSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Stripe subscription upgrade failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to upgrade subscription');
  }
};

const cancelSubscriptionAtPeriodEnd = async (externalSubscriptionId: string): Promise<Stripe.Subscription> => {
  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  if (!isStripeSubscriptionId(externalSubscriptionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Subscription is not managed by Stripe');
  }

  try {
    return await stripe.subscriptions.update(externalSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    logger.error('Stripe subscription cancel failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to cancel subscription');
  }
};

export default {
  upgradeSubscription,
  cancelSubscriptionAtPeriodEnd,
  isStripeSubscriptionId,
};

export { upgradeSubscription, cancelSubscriptionAtPeriodEnd, isStripeSubscriptionId };
