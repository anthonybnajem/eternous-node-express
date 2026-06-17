import type Stripe from 'stripe';
import httpStatus from 'http-status';
import type { Types } from 'mongoose';
import { Subscription, User } from '../models/index.js';
import type { SubscriptionDocument, SubscriptionProvider, SubscriptionStatus } from '../models/subscription.model.js';
import ApiError from '../utils/ApiError.js';
import type { ObjectIdLike } from '../types/common.js';

export interface CreateSubscriptionBody {
  user: ObjectIdLike;
  name: string;
  provider?: SubscriptionProvider;
  status?: SubscriptionStatus;
  startedAt?: Date;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  canceledAt?: Date | null;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionBody {
  name?: string;
  provider?: SubscriptionProvider;
  status?: SubscriptionStatus;
  startedAt?: Date;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  canceledAt?: Date | null;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  metadata?: Record<string, unknown>;
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

  const subscriptionData = {
    name: resolveStripeSubscriptionName(stripeSubscription),
    provider: 'stripe' as SubscriptionProvider,
    status: mapStripeStatus(stripeSubscription.status),
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

    return existingSubscription;
  }

  const createdSubscription = await createSubscription({
    user: resolvedUserId,
    ...subscriptionData,
  });

  if (subscriptionData.status !== 'active' && subscriptionData.status !== 'trial') {
    await updateSubscriptionById(createdSubscription._id, subscriptionData);
  }

  return createdSubscription;
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
  const user = await User.findById(userId).populate('currentSubscription');
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return (user.currentSubscription as SubscriptionDocument | null) ?? null;
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
  const subscription = await updateSubscriptionById(subscriptionId, {
    status: 'canceled',
    canceledAt: new Date(),
    endsAt,
  });

  const user = await User.findById(subscription.user);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.currentSubscription && String(user.currentSubscription) === String(subscription.id)) {
    user.currentSubscription = null;
    await user.save();
  }

  return subscription;
};

export default {
  createSubscription,
  getSubscriptionById,
  listSubscriptionsByUser,
  getCurrentSubscription,
  updateSubscriptionById,
  activateSubscription,
  cancelSubscription,
  syncUserSubscriptionPointers,
  syncSubscriptionFromStripe,
};

export {
  createSubscription,
  getSubscriptionById,
  listSubscriptionsByUser,
  getCurrentSubscription,
  updateSubscriptionById,
  activateSubscription,
  cancelSubscription,
  syncUserSubscriptionPointers,
  syncSubscriptionFromStripe,
};
