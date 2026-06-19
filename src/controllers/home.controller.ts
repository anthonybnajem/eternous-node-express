import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import { homeService } from '../services/index.ts';

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;

const getHome = catchAsync<EmptyParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  const dashboard = await homeService.getHomeDashboard(req.user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Home dashboard retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: dashboard,
    })
  );
});

export default {
  getHome,
};
