import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import pick from '../utils/pick.ts';
import { billingService } from '../services/index.ts';

type EmptyParams = Record<string, never>;
type PaymentMethodIdParams = { id: string };
type BillingHistoryQuery = Record<string, string | undefined>;

const getBillingOverview = catchAsync<EmptyParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const overview = await billingService.getOverview(req.user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Billing overview retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: overview,
    })
  );
});

const listPaymentMethods = catchAsync<EmptyParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const paymentMethods = await billingService.listPaymentMethods(req.user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Payment methods retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { paymentMethods },
    })
  );
});

const createPaymentMethodSetup = catchAsync<EmptyParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const setup = await billingService.createPaymentMethodSetup(req.user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Setup intent created successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: setup,
    })
  );
});

const setDefaultPaymentMethod = catchAsync<PaymentMethodIdParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const paymentMethod = await billingService.setDefaultPaymentMethod(req.user.id, req.params.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Default payment method updated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { paymentMethod },
    })
  );
});

const removePaymentMethod = catchAsync<PaymentMethodIdParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  await billingService.removePaymentMethod(req.user.id, req.params.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Payment method removed successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const getBillingHistory = catchAsync<EmptyParams, unknown, unknown, BillingHistoryQuery>(
  async (req, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const history = await billingService.getBillingHistory(req.user.id, options);

    res.status(httpStatus.OK).json(
      response({
        message: 'Billing history retrieved successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: history,
      })
    );
  }
);

export default {
  getBillingOverview,
  listPaymentMethods,
  createPaymentMethodSetup,
  setDefaultPaymentMethod,
  removePaymentMethod,
  getBillingHistory,
};

export {
  getBillingOverview,
  listPaymentMethods,
  createPaymentMethodSetup,
  setDefaultPaymentMethod,
  removePaymentMethod,
  getBillingHistory,
};
