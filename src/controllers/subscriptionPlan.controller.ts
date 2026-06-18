import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import { subscriptionPlanService } from '../services/index.ts';
import type { SubscriptionPlanAttrs } from '../models/subscriptionPlan.model.ts';
import ApiError from '../utils/ApiError.ts';

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;
type PlanIdParams = { planId: string };

const requireAdmin = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  return req.user;
};

const getPricePlans = catchAsync(async (_req, res: Response): Promise<void> => {
  const plans = await subscriptionPlanService.listSubscriptionPlans(true);
  res.status(httpStatus.OK).json(
    response({
      message: 'Price plans retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { plans },
    })
  );
});

const createPricePlan = catchAsync<EmptyParams, unknown, SubscriptionPlanAttrs, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    requireAdmin(req);
    const plan = await subscriptionPlanService.createSubscriptionPlan(req.body);
    res.status(httpStatus.CREATED).json(
      response({
        message: 'Price plan created successfully',
        status: 'OK',
        statusCode: httpStatus.CREATED,
        data: { plan },
      })
    );
  }
);

const updatePricePlan = catchAsync<PlanIdParams, unknown, Partial<SubscriptionPlanAttrs>, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    requireAdmin(req);
    const plan = await subscriptionPlanService.updateSubscriptionPlan(req.params.planId, req.body);
    res.status(httpStatus.OK).json(
      response({
        message: 'Price plan updated successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { plan },
      })
    );
  }
);

export default {
  getPricePlans,
  createPricePlan,
  updatePricePlan,
};

export { getPricePlans, createPricePlan, updatePricePlan };
