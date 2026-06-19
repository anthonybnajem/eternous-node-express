import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import pick from '../utils/pick.ts';
import { creditService } from '../services/index.ts';

type EmptyParams = Record<string, never>;
type UserIdParams = { userId: string };
type CreditHistoryQuery = Record<string, string | undefined>;
type AdjustCreditsBody = { amount: number; reason: string };

const getMyCredits = catchAsync<EmptyParams>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const { balance, recentTransactions } = await creditService.getBalance(req.user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Credit balance retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: {
        balance,
        creditBalance: balance,
        recentTransactions,
      },
    })
  );
});

const getMyCreditHistory = catchAsync<EmptyParams, unknown, unknown, CreditHistoryQuery>(
  async (req, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const history = await creditService.getHistory(req.user.id, options);

    res.status(httpStatus.OK).json(
      response({
        message: 'Credit history retrieved successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: history,
      })
    );
  }
);

const adjustUserCredits = catchAsync<UserIdParams, unknown, AdjustCreditsBody>(
  async (req, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    const result = await creditService.adjustCredits({
      userId: req.params.userId,
      amount: req.body.amount,
      reason: req.body.reason,
      createdBy: req.user.id,
    });

    res.status(httpStatus.OK).json(
      response({
        message: 'Credits adjusted successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: result,
      })
    );
  }
);

export default {
  getMyCredits,
  getMyCreditHistory,
  adjustUserCredits,
};

export { getMyCredits, getMyCreditHistory, adjustUserCredits };
