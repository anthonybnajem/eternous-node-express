import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import response from '../config/response';
import { subscriptionPlanService, subscriptionService } from '../services/index';
import type { SubscriptionProvider, SubscriptionStatus } from '../models/subscription.model';
import ApiError from '../utils/ApiError';
import * as stripeService from '../services/payments/stripe.service';

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;
type SubscriptionIdParams = { subscriptionId: string };
type CreateSubscriptionBody = {
  name: string;
  provider?: SubscriptionProvider;
  status?: SubscriptionStatus;
  startedAt?: string | Date;
  endsAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
  canceledAt?: string | Date | null;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  metadata?: Record<string, unknown>;
};
type CreateCheckoutSessionBody = {
  planId?: string;
  priceId?: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
  name?: string;
  quantity?: number;
  metadata?: Record<string, string>;
};
type CancelSubscriptionBody = {
  endsAt?: string | Date | null;
};

const requireAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return req.user;
};

const getCurrentSubscription = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const currentSubscription = await subscriptionService.getCurrentSubscription(user.id);
  const subscriptions = await subscriptionService.listSubscriptionsByUser(user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Subscription retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { currentSubscription, subscriptions },
    })
  );
});

const getSubscription = catchAsync<SubscriptionIdParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const subscription = await subscriptionService.getSubscriptionById(req.params.subscriptionId);

  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  if (String(subscription.user) !== String(user.id) && user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  res.status(httpStatus.OK).json(
    response({
      message: 'Subscription retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { subscription },
    })
  );
});

const createSubscription = catchAsync<EmptyParams, unknown, CreateSubscriptionBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const subscription = await subscriptionService.createSubscription({
      user: user.id,
      name: req.body.name,
      provider: req.body.provider,
      status: req.body.status,
      startedAt: req.body.startedAt ? new Date(req.body.startedAt) : undefined,
      endsAt: req.body.endsAt === null || req.body.endsAt === undefined ? req.body.endsAt : new Date(req.body.endsAt),
      trialEndsAt:
        req.body.trialEndsAt === null || req.body.trialEndsAt === undefined
          ? req.body.trialEndsAt
          : new Date(req.body.trialEndsAt),
      canceledAt:
        req.body.canceledAt === null || req.body.canceledAt === undefined
          ? req.body.canceledAt
          : new Date(req.body.canceledAt),
      externalCustomerId: req.body.externalCustomerId,
      externalSubscriptionId: req.body.externalSubscriptionId,
      metadata: req.body.metadata,
    });

    res.status(httpStatus.CREATED).json(
      response({
        message: 'Subscription created successfully',
        status: 'OK',
        statusCode: httpStatus.CREATED,
        data: { subscription },
      })
    );
  }
);

const createCheckoutSession = catchAsync<EmptyParams, unknown, CreateCheckoutSessionBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const selectedPlan = req.body.planId ? await subscriptionPlanService.getSubscriptionPlanById(req.body.planId) : null;

    if (req.body.planId && !selectedPlan) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subscription plan not found');
    }
    if (selectedPlan && !selectedPlan.active) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Subscription plan is inactive');
    }
    if (!selectedPlan && !req.body.priceId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'priceId or planId is required');
    }

    const resolvedPriceId = selectedPlan?.priceId ?? req.body.priceId;
    if (!resolvedPriceId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'priceId or planId is required');
    }

    const planName = selectedPlan?.name ?? req.body.name ?? user.fullName ?? 'Subscription';
    const planMetadata = {
      planId: selectedPlan?._id ? String(selectedPlan._id) : undefined,
      planSlug: selectedPlan?.slug,
      planName: selectedPlan?.name,
      planPriceId: selectedPlan?.priceId,
      planInterval: selectedPlan?.interval,
      planAmount: selectedPlan?.amount !== undefined ? String(selectedPlan.amount) : undefined,
      ...req.body.metadata,
    };

    const checkoutSession = await stripeService.createSubscriptionCheckoutSession({
      priceId: resolvedPriceId,
      successUrl: req.body.successUrl,
      cancelUrl: req.body.cancelUrl,
      customerEmail: req.body.customerEmail ?? user.email,
      customerName: req.body.customerName ?? user.fullName,
      userId: String(user.id),
      name: planName,
      quantity: req.body.quantity,
      metadata: Object.fromEntries(
        Object.entries(planMetadata)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ),
    });

    res.status(httpStatus.CREATED).json(
      response({
        message: 'Checkout session created successfully',
        status: 'OK',
        statusCode: httpStatus.CREATED,
        data: { checkoutSession },
      })
    );
  }
);

const cancelSubscription = catchAsync<SubscriptionIdParams, unknown, CancelSubscriptionBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const subscription = await subscriptionService.getSubscriptionById(req.params.subscriptionId);

    if (!subscription) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');
    }

    if (String(subscription.user) !== String(user.id) && user.role !== 'admin') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
    }

    const updatedSubscription = await subscriptionService.cancelSubscription(
      subscription.id,
      req.body.endsAt === null || req.body.endsAt === undefined ? null : new Date(req.body.endsAt)
    );

    res.status(httpStatus.OK).json(
      response({
        message: 'Subscription canceled successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { subscription: updatedSubscription },
      })
    );
  }
);

const activateSubscription = catchAsync<SubscriptionIdParams, unknown, unknown, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  if (user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  const subscription = await subscriptionService.activateSubscription(req.params.subscriptionId);

  res.status(httpStatus.OK).json(
    response({
      message: 'Subscription activated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { subscription },
    })
  );
  }
);

export default {
  getCurrentSubscription,
  getSubscription,
  createSubscription,
  createCheckoutSession,
  cancelSubscription,
  activateSubscription,
};

export {
  getCurrentSubscription,
  getSubscription,
  createSubscription,
  createCheckoutSession,
  cancelSubscription,
  activateSubscription,
};
