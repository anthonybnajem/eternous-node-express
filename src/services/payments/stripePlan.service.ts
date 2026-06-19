import Stripe from 'stripe';
import httpStatus from 'http-status';
import config from '../../config/config.ts';
import logger from '../../config/logger.ts';
import ApiError from '../../utils/ApiError.ts';
import type { SubscriptionPlanType } from '../../models/subscriptionPlan.model.ts';

const getStripeClient = (): Stripe | null => {
  if (!config.stripe.secretKey) {
    return null;
  }
  return new Stripe(config.stripe.secretKey);
};

export interface CreateStripePlanPriceInput {
  name: string;
  amount: number;
  currency?: string;
  planType?: SubscriptionPlanType;
  credits?: number;
  slug: string;
}

export interface CreateStripePlanPriceResult {
  productId: string;
  priceId: string;
}

const createStripePlanPrice = async (input: CreateStripePlanPriceInput): Promise<CreateStripePlanPriceResult> => {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  try {
    const product = await stripe.products.create({
      name: input.name,
      metadata: {
        slug: input.slug,
        credits: String(input.credits ?? 0),
        planType: input.planType ?? 'monthly',
      },
    });

    const currency = input.currency ?? 'usd';
    const unitAmount = Math.round(Math.max(input.amount, 0) * 100);
    const planType = input.planType ?? 'monthly';

    const priceParams: Stripe.PriceCreateParams = {
      product: product.id,
      currency,
      unit_amount: unitAmount,
      metadata: {
        slug: input.slug,
        credits: String(input.credits ?? 0),
        planType,
      },
    };

    if (planType === 'preservation') {
      // one-time preservation plan
    } else {
      priceParams.recurring = {
        interval: planType === 'yearly' ? 'year' : 'month',
      };
    }

    const price = await stripe.prices.create(priceParams);

    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error) {
    logger.error('Stripe plan price creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to create Stripe plan price');
  }
};

export { createStripePlanPrice };
