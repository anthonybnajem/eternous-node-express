import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import response from '../config/response.ts';
import ApiError from '../utils/ApiError.ts';
import pick from '../utils/pick.ts';
import { notificationService, treeShareService } from '../services/index.ts';

type EmptyParams = Record<string, never>;
type NotificationIdParams = { id: string };
type InboxQuery = Record<string, string | undefined>;
type EmptyQuery = Record<string, string | undefined>;

const requireAuthUser = (req: Request) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }
  return req.user;
};

const listNotifications = catchAsync<EmptyParams, unknown, unknown, InboxQuery>(
  async (req, res: Response): Promise<void> => {
    const user = requireAuthUser(req);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const notifications = await notificationService.listInbox(user.id, options);

    res.status(httpStatus.OK).json(
      response({
        message: 'Notifications retrieved successfully',
        status: 'OK',
        statusCode: httpStatus.OK,
        data: notifications,
      })
    );
  }
);

const markNotificationRead = catchAsync<NotificationIdParams, unknown, unknown, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const notification = await notificationService.markAsRead(req.params.id, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Notification marked as read',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: { notification },
    })
  );
  }
);

const acceptNotification = catchAsync<NotificationIdParams, unknown, unknown, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const result = await treeShareService.acceptShare(req.params.id, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Tree share accepted successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    })
  );
  }
);

const declineNotification = catchAsync<NotificationIdParams, unknown, unknown, EmptyQuery>(
  async (req, res: Response): Promise<void> => {
  const user = requireAuthUser(req);
  const result = await treeShareService.declineShare(req.params.id, user.id);

  res.status(httpStatus.OK).json(
    response({
      message: 'Tree share declined successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    })
  );
  }
);

export default {
  listNotifications,
  markNotificationRead,
  acceptNotification,
  declineNotification,
};

export { listNotifications, markNotificationRead, acceptNotification, declineNotification };
