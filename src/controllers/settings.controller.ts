import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import { settingsService } from '../services/index.ts';
import type { UpdateNotificationSettingsBody, UpdateSettingsBody } from '../services/settings.service.ts';

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, string | undefined>;

const requireAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return req.user;
};

const getMySettings = catchAsync<EmptyParams, unknown, unknown, EmptyQuery>(async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const settings = await settingsService.getSettings(user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Settings retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { settings },
    })
  );
});

const updateMySettings = catchAsync<EmptyParams, unknown, UpdateSettingsBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const settings = await settingsService.updateSettings(user.id, req.body);

    res.status(httpStatus.OK).json(
      response({
        message: 'Settings updated successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { settings },
      })
    );
  }
);

const updateNotificationSettings = catchAsync<EmptyParams, unknown, UpdateNotificationSettingsBody, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const settings = await settingsService.updateNotificationSettings(user.id, req.body);

    res.status(httpStatus.OK).json(
      response({
        message: 'Notification settings updated successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: { settings },
      })
    );
  }
);

export default {
  getMySettings,
  updateMySettings,
  updateNotificationSettings,
};

export { getMySettings, updateMySettings, updateNotificationSettings };
