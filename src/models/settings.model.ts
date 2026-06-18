import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSON } from './plugins/index.ts';

export interface SettingsAttrs {
  userId: Types.ObjectId;

  applicationLock?: boolean;
  newMessagesLock?: boolean;

  billingEmail?: string;

  twoFactorEnabled?: boolean;
  verified?: boolean;

  notificationsEnabled?: boolean;
  birthdayNotificationsEnabled?: boolean;
  paymentNotificationsEnabled?: boolean;

  metadata?: Record<string, unknown>;
}

export type SettingsDocument = HydratedDocument<SettingsAttrs>;
export type SettingsModel = Model<SettingsAttrs>;

const settingsSchema = new mongoose.Schema<SettingsAttrs, SettingsModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    applicationLock: {
      type: Boolean,
      default: false,
    },

    newMessagesLock: {
      type: Boolean,
      default: false,
    },

    billingEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: '',
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    birthdayNotificationsEnabled: {
      type: Boolean,
      default: true,
    },

    paymentNotificationsEnabled: {
      type: Boolean,
      default: true,
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

settingsSchema.plugin(toJSON as never);

const Settings = mongoose.model<SettingsAttrs, SettingsModel>('Settings', settingsSchema);

export default Settings;