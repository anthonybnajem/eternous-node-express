import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON } from './plugins/index.ts';

export interface NotificationJobLogAttrs {
  jobName: string;
  referenceKey: string;
  userId?: Types.ObjectId | null;
  metadata?: Record<string, unknown>;
}

export type NotificationJobLogDocument = HydratedDocument<NotificationJobLogAttrs>;
export type NotificationJobLogModel = Model<NotificationJobLogAttrs>;

const notificationJobLogSchema = new mongoose.Schema<NotificationJobLogAttrs, NotificationJobLogModel>(
  {
    jobName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    referenceKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
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

notificationJobLogSchema.plugin(toJSON as never);

const NotificationJobLog = mongoose.model<NotificationJobLogAttrs, NotificationJobLogModel>(
  'NotificationJobLog',
  notificationJobLogSchema
);

export default NotificationJobLog;
