import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export type ActivityType =
  | 'login'
  | 'logout'
  | 'register'
  | 'email_verified'
  | 'account_deleted'
  | 'update_profile'
  | 'password_change'
  | 'order_placed'
  | 'payment'
  | 'subscription_checkout'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'subscription_activated'
  | 'subscription_updated'
  | 'admin_action'
  | 'tree'
  | 'member'
  | 'voice'
  | 'chat'
  | 'credit'
  | 'settings'
  | 'notification'
  | 'other';

export interface ActivityAttrs {
  user: Types.ObjectId;
  type: ActivityType;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export type ActivityDocument = HydratedDocument<ActivityAttrs>;
export type ActivityModel = Model<ActivityAttrs> & PaginateModel<ActivityAttrs>;

const activitySchema = new mongoose.Schema<ActivityAttrs, ActivityModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'login',
        'logout',
        'register',
        'email_verified',
        'account_deleted',
        'update_profile',
        'password_change',
        'order_placed',
        'payment',
        'subscription_checkout',
        'subscription_created',
        'subscription_canceled',
        'subscription_activated',
        'subscription_updated',
        'admin_action',
        'tree',
        'member',
        'voice',
        'chat',
        'credit',
        'settings',
        'notification',
        'other',
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.plugin(toJSON as never);
activitySchema.plugin(paginate as never);

const Activity = mongoose.model<ActivityAttrs, ActivityModel>('Activity', activitySchema);

export default Activity;
