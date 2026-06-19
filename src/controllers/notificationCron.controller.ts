import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import notificationDispatchService from '../services/notificationDispatch.service.ts';

type RunCronBody = { job: string };

const runNotificationCron = catchAsync<Record<string, never>, unknown, RunCronBody>(
  async (req, res: Response): Promise<void> => {
    const result = await notificationDispatchService.runNotificationJob(req.body.job);

    res.status(httpStatus.OK).json(
      response({
        message: 'Notification cron executed successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: result,
      })
    );
  }
);

export default { runNotificationCron };
export { runNotificationCron };
