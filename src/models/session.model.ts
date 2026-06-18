import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON, paginate } from './plugins/index.ts';
import type { PaginateModel } from '../types/common.ts';

export type SessionDeviceType = 'ios' | 'android' | 'web' | 'desktop' | 'unknown';

export interface SessionAttrs {
  userId: Types.ObjectId;
  deviceName?: string;
  deviceType?: SessionDeviceType;
  userAgent?: string;
  ipAddress?: string;
  loggedInAt?: Date;
  lastActiveAt?: Date;
  isActive?: boolean;
  revokedAt?: Date | null;
}

export type SessionDocument = HydratedDocument<SessionAttrs>;
export type SessionModel = Model<SessionAttrs> & PaginateModel<SessionAttrs>;

const sessionSchema = new mongoose.Schema<SessionAttrs, SessionModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    deviceName: {
      type: String,
      required: false,
      trim: true,
    },

    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web', 'desktop', 'unknown'],
      default: 'unknown',
      index: true,
    },

    userAgent: {
      type: String,
      required: false,
    },

    ipAddress: {
      type: String,
      required: false,
    },

    loggedInAt: {
      type: Date,
      default: Date.now,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.plugin(toJSON as never);
sessionSchema.plugin(paginate as never);

const Session = mongoose.model<SessionAttrs, SessionModel>('Session', sessionSchema);

export default Session;