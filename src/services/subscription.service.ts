import type Stripe from 'stripe';
import httpStatus from 'http-status';
import type { Types } from 'mongoose';
import config from '../config/config.ts';
import { Subscription, User } from '../models/index.ts';
import activityService from './activity.service.ts';
import subscriptionPlanService from './subscriptionPlan.service.ts';
import stripeSubscriptionService from './payments/stripeSubscription.service.ts';
import * as stripeService from './payments/stripe.service.ts';
import type { SubscriptionPlanDocument } from '../models/subscriptionPlan.model.ts';
import type { SubscriptionDocument, SubscriptionProvider, SubscriptionStatus } from '../models/subscription.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike } from '../types/common.ts';

export interface CreateSubscriptionBody {
  user: ObjectIdLike;
  name: string;
  plan?: ObjectIdLike | null;
  provider?: SubscriptionProvider;
  status?: SubscriptionStatus;
  startedAt?: Date;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  canceledAt?: Date | null;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  externalPriceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionBody {
  name?: string;
  plan?: ObjectIdLike | null;
  provider?: SubscriptionProvider;
  status?: SubscriptionStatus;
  startedAt?: Date;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  canceledAt?: Date | null;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  externalPriceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpgradeSubscriptionInput {
  userId: ObjectIdLike;
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  customerName?: string;
}

export interface UpgradeSubscriptionResult {
  mode: 'upgraded' | 'checkout';
  subscription?: SubscriptionDocument;
  checkoutSession?: { sessionId: string; url: string | null };
}

const syncUserSubscriptionPointers = async (userId: ObjectIdLike, subscriptionId: ObjectIdLike | null): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  user.currentSubscription = subscriptionId ? (subscriptionId as Types.ObjectId) : null;

  if (subscriptionId) {
    const existingSubscriptions = Array.isArray(user.subscriptions) ? user.subscriptions : [];
    const hasSubscription = existingSubscriptions.some((id) => String(id) === String(subscriptionId));
    if (!hasSubscription) {
      user.subscriptions = [...existingSubscriptions, subscriptionId as Types.ObjectId];
    }
  }

  await user.save();
};

const mapStripeStatus = (status: Stripe.Subscription.Status): SubscriptionStatus => {
  switch (status) {
    case 'trialing':
      return 'trial';
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'inactive';
  }
};

const resolveStripeSubscriptionName = (subscription: Stripe.Subscription): string => {
  return (
    subscription.metadata?.name ??
    subscription.items.data[0]?.price?.nickname ??
    subscription.items.data[0]?.price?.product?.toString() ??
    'Stripe Subscription'
  );
};

const resolveStripeUserId = (subscription: Stripe.Subscription, userId?: string): string | null => {
  return userId ?? subscription.metadata?.userId ?? subscription.metadata?.user_id ?? null;
};

const syncSubscriptionFromStripe = async (
  stripeSubscription: Stripe.Subscription,
  userId?: string
): Promise<SubscriptionDocument | null> => {
  const resolvedUserId = resolveStripeUserId(stripeSubscription, userId);
  if (!resolvedUserId) {
    return null;
  }

  const priceId = stripeSubscription.items.data[0]?.price?.id;
  const matchedPlan = priceId ? await subscriptionPlanService.getSubscriptionPlanByPriceId(priceId) : null;

  const subscriptionData = {
    name: matchedPlan?.name ?? resolveStripeSubscriptionName(stripeSubscription),
    provider: 'stripe' as SubscriptionProvider,
    status: mapStripeStatus(stripeSubscription.status),
    plan: matchedPlan?._id ?? null,
    externalPriceId: priceId,
    startedAt: stripeSubscription.start_date ? new Date(stripeSubscription.start_date * 1000) : undefined,
    endsAt:
      typeof stripeSubscription.current_period_end === 'number'
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
    trialEndsAt:
      typeof stripeSubscription.trial_end === 'number' ? new Date(stripeSubscription.trial_end * 1000) : null,
    canceledAt:
      typeof stripeSubscription.canceled_at === 'number' ? new Date(stripeSubscription.canceled_at * 1000) : null,
    externalCustomerId:
      typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id,
    externalSubscriptionId: stripeSubscription.id,
    metadata: {
      stripeStatus: stripeSubscription.status,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodStart: stripeSubscription.current_period_start,
      currentPeriodEnd: stripeSubscription.current_period_end,
      latestInvoice: stripeSubscription.latest_invoice,
    },
  };

  const existingSubscription = await Subscription.findOne({
    externalSubscriptionId: stripeSubscription.id,
  });

  if (existingSubscription) {
    const previousStatus = existingSubscription.status;
    Object.assign(existingSubscription, subscriptionData);
    await existingSubscription.save();

    if (subscriptionData.status === 'active' || subscriptionData.status === 'trial') {
      await syncUserSubscriptionPointers(resolvedUserId, existingSubscription._id);
    } else if (subscriptionData.status === 'canceled') {
      const user = await User.findById(resolvedUserId);
      if (user && user.currentSubscription && String(user.currentSubscription) === String(existingSubscription._id)) {
        user.currentSubscription = null;
        await user.save();
      }
    }

    if (previousStatus !== subscriptionData.status) {
      const activityType =
        subscriptionData.status === 'canceled' ? 'subscription_canceled' : 'subscription_updated';
      await activityService.recordSubscriptionActivity(
        resolvedUserId,
        activityType,
        `Stripe subscription "${subscriptionData.name}" ${activityType === 'subscription_canceled' ? 'canceled' : 'updated'} (${subscriptionData.status})`,
        {
          subscriptionId: existingSubscription.id,
          source: 'stripe_webhook',
          previousStatus,
          status: subscriptionData.status,
          externalSubscriptionId: stripeSubscription.id,
        }
      );
    }

    return existingSubscription;
  }

  const createdSubscription = await createSubscription({
    user: resolvedUserId,
    ...subscriptionData,
  });

  if (subscriptionData.status !== 'active' && subscriptionData.status !== 'trial') {
    await updateSubscriptionById(createdSubscription._id, subscriptionData);
  }

  await activityService.recordSubscriptionActivity(
    resolvedUserId,
    'subscription_created',
    `Stripe subscription "${subscriptionData.name}" created (${subscriptionData.status})`,
    {
      subscriptionId: createdSubscription.id,
      source: 'stripe_webhook',
      status: subscriptionData.status,
      externalSubscriptionId: stripeSubscription.id,
    }
  );

  return createdSubscription;
};

const getSubscriptionByExternalId = async (externalSubscriptionId: string): Promise<SubscriptionDocument | null> => {
  return Subscription.findOne({ externalSubscriptionId });
};

const createSubscription = async (body: CreateSubscriptionBody): Promise<SubscriptionDocument> => {
  const user = await User.findById(body.user);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const subscription = await Subscription.create(body);
  user.subscriptions = [...(user.subscriptions ?? []), subscription._id as Types.ObjectId];
  if (subscription.status === 'active' || subscription.status === 'trial') {
    user.currentSubscription = subscription._id as Types.ObjectId;
  }
  await user.save();

  return subscription;
};

const getSubscriptionById = async (subscriptionId: ObjectIdLike): Promise<SubscriptionDocument | null> => {
  return Subscription.findById(subscriptionId);
};

const listSubscriptionsByUser = async (userId: ObjectIdLike): Promise<SubscriptionDocument[]> => {
  return Subscription.find({ user: userId }).sort({ createdAt: -1 });
};

const getCurrentSubscription = async (userId: ObjectIdLike): Promise<SubscriptionDocument | null> => {
  const user = await User.findById(userId).populate({
    path: 'currentSubscription',
    populate: { path: 'plan' },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return (user.currentSubscription as SubscriptionDocument | null) ?? null;
};

const resolveBillingRedirectUrls = (successUrl?: string, cancelUrl?: string) => {
  const base = config.clientUrl || 'http://localhost:3000';
  return {
    successUrl: successUrl ?? `${base}/billing/success`,
    cancelUrl: cancelUrl ?? `${base}/billing/cancel`,
  };
};

const applyPlanToSubscription = async (
  subscription: SubscriptionDocument,
  plan: SubscriptionPlanDocument
): Promise<SubscriptionDocument> => {
  subscription.plan = plan._id as Types.ObjectId;
  subscription.externalPriceId = plan.priceId;
  subscription.name = plan.name;
  await subscription.save();
  return subscription;
};

const upgradeUserSubscription = async (input: UpgradeSubscriptionInput): Promise<UpgradeSubscriptionResult> => {
  const plan = await subscriptionPlanService.getSubscriptionPlanById(input.planId);
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }
  if (!plan.active) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Subscription plan is inactive');
  }

  const current = await getCurrentSubscription(input.userId);

  if (
    current?.externalSubscriptionId &&
    stripeSubscriptionService.isStripeSubscriptionId(current.externalSubscriptionId)
  ) {
    const stripeSubscription = await stripeSubscriptionService.upgradeSubscription(
      current.externalSubscriptionId,
      plan.priceId
    );
    await syncSubscriptionFromStripe(stripeSubscription, String(input.userId));
    const refreshed = await getSubscriptionById(current.id);
    if (refreshed) {
      const upgraded = await applyPlanToSubscription(refreshed, plan);
      return { mode: 'upgraded', subscription: upgraded };
    }
  }

  if (!config.stripe.secretKey) {
    if (current) {
      current.status = 'active';
      current.canceledAt = null;
      const upgraded = await applyPlanToSubscription(current, plan);
      await syncUserSubscriptionPointers(input.userId, upgraded.id);
      return { mode: 'upgraded', subscription: upgraded };
    }

    const created = await createSubscription({
      user: input.userId,
      name: plan.name,
      plan: plan._id,
      externalPriceId: plan.priceId,
      status: 'active',
      provider: 'manual',
    });
    return { mode: 'upgraded', subscription: created };
  }

  const { successUrl, cancelUrl } = resolveBillingRedirectUrls(input.successUrl, input.cancelUrl);
  const checkoutSession = await stripeService.createSubscriptionCheckoutSession({
    priceId: plan.priceId,
    successUrl,
    cancelUrl,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    userId: String(input.userId),
    name: plan.name,
    metadata: {
      planId: String(plan._id),
      planSlug: plan.slug,
      planName: plan.name,
      planPriceId: plan.priceId,
    },
  });

  return { mode: 'checkout', checkoutSession };
};

const updateSubscriptionById = async (
  subscriptionId: ObjectIdLike,
  body: UpdateSubscriptionBody
): Promise<SubscriptionDocument> => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  Object.assign(subscription, body);
  await subscription.save();
  return subscription;
};

const activateSubscription = async (subscriptionId: ObjectIdLike): Promise<SubscriptionDocument> => {
  const subscription = await updateSubscriptionById(subscriptionId, {
    status: 'active',
    canceledAt: null,
  });

  await syncUserSubscriptionPointers(subscription.user, subscription.id);
  return subscription;
};

const cancelSubscription = async (
  subscriptionId: ObjectIdLike,
  endsAt: Date | null = null
): Promise<SubscriptionDocument> => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  if (
    subscription.externalSubscriptionId &&
    stripeSubscriptionService.isStripeSubscriptionId(subscription.externalSubscriptionId)
  ) {
    const stripeSubscription = await stripeSubscriptionService.cancelSubscriptionAtPeriodEnd(
      subscription.externalSubscriptionId
    );

    subscription.status = mapStripeStatus(stripeSubscription.status);
    subscription.endsAt =
      typeof stripeSubscription.current_period_end === 'number'
        ? new Date(stripeSubscription.current_period_end * 1000)
        : endsAt;
    subscription.metadata = {
      ...(subscription.metadata ?? {}),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      stripeStatus: stripeSubscription.status,
      currentPeriodEnd: stripeSubscription.current_period_end,
    };
    await subscription.save();
    return subscription;
  }

  const updatedSubscription = await updateSubscriptionById(subscriptionId, {
    status: 'canceled',
    canceledAt: new Date(),
    endsAt,
    metadata: {
      ...(subscription.metadata ?? {}),
      cancelAtPeriodEnd: false,
    },
  });

  const user = await User.findById(updatedSubscription.user);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.currentSubscription && String(user.currentSubscription) === String(updatedSubscription.id)) {
    user.currentSubscription = null;
    await user.save();
  }

  return updatedSubscription;
};

export default {
  createSubscription,
  getSubscriptionById,
  getSubscriptionByExternalId,
  listSubscriptionsByUser,
  getCurrentSubscription,
  updateSubscriptionById,
  activateSubscription,
  cancelSubscription,
  upgradeUserSubscription,
  syncUserSubscriptionPointers,
  syncSubscriptionFromStripe,
};

export {
  createSubscription,
  getSubscriptionById,
  getSubscriptionByExternalId,
  listSubscriptionsByUser,
  getCurrentSubscription,
  updateSubscriptionById,
  activateSubscription,
  cancelSubscription,
  upgradeUserSubscription,
  syncUserSubscriptionPointers,
  syncSubscriptionFromStripe,
};
