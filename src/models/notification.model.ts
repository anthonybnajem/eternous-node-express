import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { paginate, toJSON } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export type NotificationRole = 'admin' | 'client' | 'employee' | 'unknown';
export type NotificationType =
  | 'task'
  | 'payment'
  | 'unknown'
  | 'tree_share'
  | 'backup'
  | 'anniversary'
  | 'birthday'
  | 'billing'
  | 'subscription'
  | 'system'
  | 'member'
  | 'tree'
  | 'voice';
export type NotificationActionStatus = 'pending' | 'accepted' | 'declined';

export interface NotificationAttrs {
  receiverId?: Types.ObjectId;
  title?: string;
  message?: string;
  image?: Record<string, unknown>;
  linkId?: string;
  role?: NotificationRole;
  type?: NotificationType;
  viewStatus?: boolean;
  actionStatus?: NotificationActionStatus | null;
  metadata?: Record<string, unknown>;
}

export type NotificationDocument = HydratedDocument<NotificationAttrs>;
export type NotificationModel = Model<NotificationAttrs> & PaginateModel<NotificationAttrs>;

const notificationSchema = new mongoose.Schema<NotificationAttrs, NotificationModel>(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
      default: '',
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
      enum: [
        'task',
        'payment',
        'unknown',
        'tree_share',
        'backup',
        'anniversary',
        'birthday',
        'billing',
        'subscription',
        'system',
        'member',
        'tree',
        'voice',
      ],
      default: 'unknown',
      index: true,
    },
    viewStatus: { type: Boolean, default: false, index: true },
    actionStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined', null],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ receiverId: 1, createdAt: -1 });
notificationSchema.index({ receiverId: 1, viewStatus: 1 });

notificationSchema.plugin(toJSON as never);
notificationSchema.plugin(paginate as never);

export default mongoose.model<NotificationAttrs, NotificationModel>('Notification', notificationSchema);
