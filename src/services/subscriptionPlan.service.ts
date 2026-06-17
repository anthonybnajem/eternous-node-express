import httpStatus from 'http-status';
import { SubscriptionPlan } from '../models/index';
import type { SubscriptionPlanAttrs, SubscriptionPlanDocument } from '../models/subscriptionPlan.model';
import ApiError from '../utils/ApiError';

export interface CreateSubscriptionPlanBody extends SubscriptionPlanAttrs {}
export interface UpdateSubscriptionPlanBody extends Partial<SubscriptionPlanAttrs> {}

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

const createSubscriptionPlan = async (body: CreateSubscriptionPlanBody): Promise<SubscriptionPlanDocument> => {
  const existing = await SubscriptionPlan.findOne({
    $or: [{ slug: body.slug.toLowerCase() }, { priceId: body.priceId }],
  });

  if (existing) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Subscription plan already exists');
  }

  return SubscriptionPlan.create({
    ...body,
    slug: body.slug.toLowerCase(),
  });
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

  Object.assign(plan, body);
  await plan.save();
  return plan;
};

const upsertSubscriptionPlan = async (body: CreateSubscriptionPlanBody): Promise<SubscriptionPlanDocument> => {
  const existing = await SubscriptionPlan.findOne({
    $or: [{ slug: body.slug.toLowerCase() }, { priceId: body.priceId }],
  });

  if (!existing) {
    return createSubscriptionPlan(body);
  }

  Object.assign(existing, {
    ...body,
    slug: body.slug.toLowerCase(),
  });
  await existing.save();
  return existing;
};

export default {
  listSubscriptionPlans,
  getSubscriptionPlanById,
  getSubscriptionPlanBySlug,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  upsertSubscriptionPlan,
};

export {
  listSubscriptionPlans,
  getSubscriptionPlanById,
  getSubscriptionPlanBySlug,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  upsertSubscriptionPlan,
};
