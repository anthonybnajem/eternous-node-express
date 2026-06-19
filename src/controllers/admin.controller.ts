import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import adminAnalyticsService from '../services/adminAnalytics.service.ts';

const getAnalytics = catchAsync(async (_req, res: Response) => {
  const analytics = await adminAnalyticsService.getDashboardAnalytics();
  res.status(httpStatus.OK).json(
    response({
      message: 'Analytics retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: analytics,
    })
  );
});

export default { getAnalytics };
