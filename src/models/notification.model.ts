import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export type NotificationRole = 'admin' | 'client' | 'employee' | 'unknown';
export type NotificationType = 'task' | 'payment' | 'unknown';

export interface NotificationAttrs {
  receiverId?: Types.ObjectId;
  message?: string;
  image?: Record<string, unknown>;
  linkId?: string;
  role?: NotificationRole;
  type?: NotificationType;
  viewStatus?: boolean;
}

export type NotificationDocument = HydratedDocument<NotificationAttrs>;
export type NotificationModel = Model<NotificationAttrs> & PaginateModel<NotificationAttrs>;

const notificationSchema = new mongoose.Schema<NotificationAttrs, NotificationModel>(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    message: { type: String, required: false },
    image: { type: Object, required: false },
    linkId: { type: String, required: false },
    role: {
      type: String,
      enum: ['admin', 'client', 'employee', 'unknown'],
      default: 'unknown',
    },
    type: {
      type: String,
      enum: ['task', 'payment', 'unknown'],
      default: 'unknown',
    },
    viewStatus: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

notificationSchema.plugin(paginate as never);

export default mongoose.model<NotificationAttrs, NotificationModel>('Notification', notificationSchema);
