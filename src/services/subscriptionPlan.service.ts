import httpStatus from 'http-status';
import config from '../config/config.ts';
import { SubscriptionPlan } from '../models/index.ts';
import type {
  SubscriptionPlanAttrs,
  SubscriptionPlanDocument,
  SubscriptionPlanType,
} from '../models/subscriptionPlan.model.ts';
import ApiError from '../utils/ApiError.ts';
import * as stripePlanService from './payments/stripePlan.service.ts';

export interface CreateSubscriptionPlanBody extends Partial<SubscriptionPlanAttrs> {
  name: string;
  price?: number;
}

export interface UpdateSubscriptionPlanBody extends Partial<SubscriptionPlanAttrs> {
  price?: number;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapPlanTypeToInterval = (planType: SubscriptionPlanType = 'monthly') => {
  if (planType === 'yearly') {
    return 'year' as const;
  }
  if (planType === 'preservation') {
    return 'one_time' as const;
  }
  return 'month' as const;
};

const normalizeCreateBody = (body: CreateSubscriptionPlanBody): SubscriptionPlanAttrs => {
  const slug = (body.slug ?? slugify(body.name)).toLowerCase();
  const amount = body.amount ?? body.price ?? 0;
  const planType = body.planType ?? 'monthly';
  const interval = body.interval ?? mapPlanTypeToInterval(planType);

  return {
    name: body.name.trim(),
    slug,
    description: body.description ?? '',
    priceId: body.priceId ?? '',
    currency: body.currency ?? 'usd',
    amount,
    credits: body.credits ?? 0,
    planType,
    interval,
    trialDays: body.trialDays ?? 0,
    features: body.features ?? [],
    active: body.active ?? true,
    sortOrder: body.sortOrder ?? 0,
    metadata: body.metadata ?? {},
  };
};

const listSubscriptionPlans = async (activeOnly = false): Promise<SubscriptionPlanDocument[]> => {
  const filter = activeOnly ? { active: true } : {};
  return SubscriptionPlan.find(filter).sort({ sortOrder: 1, createdAt: 1 });
};

const getSubscriptionPlanById = async (planId: string): Promise<SubscriptionPlanDocument | null> => {
  return SubscriptionPlan.findById(planId);
};

const getSubscriptionPlanBySlug = async (slug: string): Promise<SubscriptionPlanDocument | null> => {
  return SubscriptionPlan.findOne({ slug: slug.toLowerCase() });
};

const getSubscriptionPlanByPriceId = async (priceId: string): Promise<SubscriptionPlanDocument | null> => {
  return SubscriptionPlan.findOne({ priceId });
};

const createSubscriptionPlan = async (body: CreateSubscriptionPlanBody): Promise<SubscriptionPlanDocument> => {
  const normalized = normalizeCreateBody(body);

  const existing = await SubscriptionPlan.findOne({
    $or: [{ slug: normalized.slug }, ...(normalized.priceId ? [{ priceId: normalized.priceId }] : [])],
  });

  if (existing) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Subscription plan already exists');
  }

  if (!normalized.priceId) {
    if (config.stripe.secretKey) {
      const stripePrice = await stripePlanService.createStripePlanPrice({
        name: normalized.name,
        amount: normalized.amount ?? 0,
        currency: normalized.currency ?? 'usd',
        planType: normalized.planType ?? 'monthly',
        credits: normalized.credits ?? 0,
        slug: normalized.slug,
      });
      normalized.priceId = stripePrice.priceId;
      normalized.metadata = {
        ...normalized.metadata,
        stripeProductId: stripePrice.productId,
      };
    } else {
      normalized.priceId = `dev_price_${normalized.slug}_${Date.now()}`;
    }
  }

  return SubscriptionPlan.create(normalized);
};

const updateSubscriptionPlan = async (
  planId: string,
  body: UpdateSubscriptionPlanBody
): Promise<SubscriptionPlanDocument> => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription plan not found');
  }

  if (body.slug) {
    body.slug = body.slug.toLowerCase();
  }
  if (body.price !== undefined && body.amount === undefined) {
    body.amount = body.price;
  }

  Object.assign(plan, body);
  await plan.save();
  return plan;
};

const upsertSubscriptionPlan = async (body: CreateSubscriptionPlanBody): Promise<SubscriptionPlanDocument> => {
  const normalized = normalizeCreateBody(body);
  const existing = await SubscriptionPlan.findOne({
    $or: [{ slug: normalized.slug }, ...(normalized.priceId ? [{ priceId: normalized.priceId }] : [])],
  });

  if (!existing) {
    return createSubscriptionPlan(body);
  }

  Object.assign(existing, normalized);
  await existing.save();
  return existing;
};

export default {
  listSubscriptionPlans,
  getSubscriptionPlanById,
  getSubscriptionPlanBySlug,
  getSubscriptionPlanByPriceId,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  upsertSubscriptionPlan,
};

export {
  listSubscriptionPlans,
  getSubscriptionPlanById,
  getSubscriptionPlanBySlug,
  getSubscriptionPlanByPriceId,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  upsertSubscriptionPlan,
};
