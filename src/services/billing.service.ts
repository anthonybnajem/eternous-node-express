import httpStatus from 'http-status';
import { Payment, SubscriptionPlan, User } from '../models/index.ts';
import type { SubscriptionPlanType } from '../models/subscriptionPlan.model.ts';
import subscriptionService from './subscription.service.ts';
import subscriptionPlanService from './subscriptionPlan.service.ts';
import stripeBillingService from './payments/stripeBilling.service.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike, PaginatedResult, PaginationOptions } from '../types/common.ts';
import type { PaymentDocument } from '../models/payment.model.ts';
import type { BillingHistoryItem, BillingPaymentMethod } from './payments/stripeBilling.service.ts';

const formatPriceLabel = (amount: number, currency = 'usd', planType: SubscriptionPlanType = 'monthly'): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  if (planType === 'yearly') {
    return `${formatted} per year`;
  }
  if (planType === 'preservation') {
    return `${formatted} one-time`;
  }
  return `${formatted} per month`;
};

const mapPaymentToHistoryItem = (payment: PaymentDocument): BillingHistoryItem => ({
  id: payment.id,
  source: 'payment',
  amount: payment.amount,
  currency: (payment.currency ?? 'USD').toUpperCase(),
  status: payment.status ?? 'pending',
  description: typeof payment.metadata?.description === 'string' ? payment.metadata.description : 'Payment',
  paidAt: payment.status === 'succeeded' ? payment.updatedAt ?? payment.createdAt : null,
  paymentIntentId: payment.stripePaymentIntentId ?? null,
});

const paginateHistory = (
  items: BillingHistoryItem[],
  options: PaginationOptions
): PaginatedResult<BillingHistoryItem> => {
  const limit = options.limit && parseInt(String(options.limit), 10) > 0 ? parseInt(String(options.limit), 10) : 10;
  const page = options.page && parseInt(String(options.page), 10) > 0 ? parseInt(String(options.page), 10) : 1;
  const totalResults = items.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / limit));
  const start = (page - 1) * limit;

  return {
    results: items.slice(start, start + limit),
    page,
    limit,
    totalPages: totalResults === 0 ? 0 : totalPages,
    totalResults,
  };
};

const getOverview = async (
  userId: ObjectIdLike
): Promise<{
  planName: string | null;
  priceLabel: string | null;
  planStatus: string | null;
  subscriptionId: string | null;
  renewsAt: Date | null;
  creditBalance: number;
  defaultPaymentMethod: BillingPaymentMethod | null;
}> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const subscription = await subscriptionService.getCurrentSubscription(userId);
  let plan = subscription?.plan ? await SubscriptionPlan.findById(subscription.plan) : null;

  if (!plan && subscription?.externalPriceId) {
    plan = await subscriptionPlanService.getSubscriptionPlanByPriceId(subscription.externalPriceId);
  }

  const defaultPaymentMethod = await stripeBillingService.getDefaultPaymentMethod(userId);

  return {
    planName: plan?.name ?? subscription?.name ?? null,
    priceLabel: plan ? formatPriceLabel(plan.amount ?? 0, plan.currency, plan.planType) : null,
    planStatus: subscription?.status ?? null,
    subscriptionId: subscription?.id ?? null,
    renewsAt: subscription?.endsAt ?? null,
    creditBalance: user.creditBalance ?? 0,
    defaultPaymentMethod,
  };
};

const listPaymentMethods = async (userId: ObjectIdLike): Promise<BillingPaymentMethod[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return stripeBillingService.listPaymentMethods(userId);
};

const createPaymentMethodSetup = async (userId: ObjectIdLike): Promise<{ clientSecret: string }> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return stripeBillingService.createSetupIntent(userId);
};

const setDefaultPaymentMethod = async (
  userId: ObjectIdLike,
  paymentMethodId: string
): Promise<BillingPaymentMethod> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return stripeBillingService.setDefaultPaymentMethod(userId, paymentMethodId);
};

const removePaymentMethod = async (userId: ObjectIdLike, paymentMethodId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  await stripeBillingService.detachPaymentMethod(userId, paymentMethodId);
};

const getBillingHistory = async (
  userId: ObjectIdLike,
  options: PaginationOptions
): Promise<PaginatedResult<BillingHistoryItem>> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const paymentPage = await Payment.paginate(
    { user: userId },
    {
      ...options,
      sortBy: options.sortBy ?? 'createdAt:desc',
    }
  );

  const invoiceItems = await stripeBillingService.listInvoices(userId);
  const paymentItems = paymentPage.results.map(mapPaymentToHistoryItem);
  const merged = [...paymentItems, ...invoiceItems].sort((left, right) => {
    const leftTime = left.paidAt?.getTime() ?? 0;
    const rightTime = right.paidAt?.getTime() ?? 0;
    return rightTime - leftTime;
  });

  if (merged.length > 0) {
    return paginateHistory(merged, options);
  }

  return {
    results: [],
    page: paymentPage.page,
    limit: paymentPage.limit,
    totalPages: 0,
    totalResults: 0,
  };
};

export default {
  getOverview,
  listPaymentMethods,
  createPaymentMethodSetup,
  setDefaultPaymentMethod,
  removePaymentMethod,
  getBillingHistory,
};

export {
  getOverview,
  listPaymentMethods,
  createPaymentMethodSetup,
  setDefaultPaymentMethod,
  removePaymentMethod,
  getBillingHistory,
};
