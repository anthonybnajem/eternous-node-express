import httpStatus from 'http-status';
import Notification from '../models/notification.model.ts';
import type {
  NotificationActionStatus,
  NotificationDocument,
  NotificationType,
} from '../models/notification.model.ts';
import ApiError from '../utils/ApiError.ts';
import type { ObjectIdLike, PaginatedResult, PaginationOptions } from '../types/common.ts';

export interface CreateNotificationInput {
  receiverId: ObjectIdLike;
  title: string;
  message: string;
  type: NotificationType;
  actionStatus?: NotificationActionStatus | null;
  viewStatus?: boolean;
  linkId?: string;
  metadata?: Record<string, unknown>;
}

const createNotification = async (input: CreateNotificationInput): Promise<NotificationDocument> => {
  return Notification.create({
    receiverId: input.receiverId,
    title: input.title,
    message: input.message,
    type: input.type,
    actionStatus: input.actionStatus ?? null,
    viewStatus: input.viewStatus ?? false,
    linkId: input.linkId,
    metadata: input.metadata ?? {},
    role: 'client',
  });
};

const listInbox = async (
  userId: ObjectIdLike,
  options: PaginationOptions
): Promise<PaginatedResult<NotificationDocument>> => {
  return Notification.paginate(
    { receiverId: userId },
    {
      ...options,
      sortBy: options.sortBy ?? 'createdAt:desc',
    }
  );
};

const getInboxNotification = async (
  notificationId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<NotificationDocument> => {
  const notification = await Notification.findOne({
    _id: notificationId,
    receiverId: userId,
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return notification;
};

const markAsRead = async (
  notificationId: ObjectIdLike,
  userId: ObjectIdLike
): Promise<NotificationDocument> => {
  const notification = await getInboxNotification(notificationId, userId);
  notification.viewStatus = true;
  await notification.save();
  return notification;
};

export default {
  createNotification,
  listInbox,
  getInboxNotification,
  markAsRead,
};

export { createNotification, listInbox, getInboxNotification, markAsRead };
